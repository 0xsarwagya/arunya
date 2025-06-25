/**
 * @file AnalyticsTracker - A production-ready client-side analytics tracker.
 * 
 * Tracks page views, clicks, custom events, and session data with privacy respect.
 * 
 * Features:
 * - Session management with timeout and renewal.
 * - Event sending via navigator.sendBeacon with fetch fallback and retry/backoff.
 * - IndexedDB storage of previous sessions with fallback to localStorage.
 * - MutationObserver with debounced DOM tracking for dynamic SPA support.
 * - Consent management via localStorage and respects Do Not Track headers.
 * - Rate limiting of events to prevent flooding.
 * - Exposed opt-in/out APIs for user privacy control.
 * 
 * Usage:
 * Include the bundled script with attributes:
 * <script
 *   src="https://your.domain/script.js"
 *   data-arunya-website-id="YOUR_WEBSITE_ID"
 *   data-arunya-session-timeout="1800000"
 * ></script>
 * 
 * @author Sarwagya Singh
 * @license AGPL-3.0
 */

export {};

const CONFIG = {
    DEFAULT_SESSION_TIMEOUT: 30 * 60 * 1000,  // 30 minutes in ms
    SESSION_CHECK_INTERVAL: 30 * 1000,       // 30 seconds polling for session expiry
    STORAGE_KEYS: {
        DISABLED: 'arunya.disabled',
        SESSION_ID: 'arunya.sessionId',
        LAST_USED: 'arunya.lastUsed',
    },
    ATTRIBUTES: {
        EVENT: 'data-arunya-event',
        ID: 'data-arunya-id',
        PREFIX: 'data-arunya-',
    },
    URL_CHANGE_EVENTS: ['pushState', 'replaceState', 'popstate', 'hashchange'],
    INDEXED_DB_NAME: 'arunya',
    INDEXED_DB_STORE: 'previousSessions',
};

type AnalyticsConfig = {
    websiteId: string;
    apiHost: string;
    sessionTimeout?: number;
};

type EventData = {
    type: string;
    timestamp: number;
    url: { host: string; path: string; query: string };
    referrer: string;
    screen: { width: number; height: number };
    timezone: string;
    sessionId: string;
    websiteId: string;
    name?: string;
    data?: Record<string, any>;
    title?: string;
    target?: string;
    previousSessions: string[];
};

class AnalyticsTracker {
    private config: AnalyticsConfig;
    private enabled: boolean;
    private sessionId: string;
    private lastUsed: number;
    private trackingUrl: URL;
    private intervalId?: number;
    private lastTrackedPath: string;
    private mutationObserver?: MutationObserver;
    private previousSessionIds: string[] = [];
    private trackedElements = new WeakMap<HTMLElement, (event: Event) => void>();
    private lastEventTimestamps: Record<string, number> = {};
    private eventThrottleInterval = 500; // ms
    private mutationThrottleTimer: number | null = null;

    // DEBUG flag for internal logs (set to false for production)
    private static DEBUG = false;

    /**
     * Creates a new AnalyticsTracker instance.
     * @param config Analytics configuration including websiteId, apiHost, and optional sessionTimeout.
     */
    constructor(config: AnalyticsConfig) {
        this.config = {
            ...config,
            sessionTimeout: this.validateSessionTimeout(config.sessionTimeout),
        };
        this.trackingUrl = new URL('/api/track', config.apiHost);
        this.enabled = localStorage.getItem(CONFIG.STORAGE_KEYS.DISABLED) !== 'true';
        this.sessionId = this.getSessionId();
        this.lastUsed = this.getLastUsed();
        this.lastTrackedPath = window.location.pathname + window.location.search;

        if (this.enabled && !this.isDoNotTrackEnabled()) {
            this.log('Tracker enabled, initializing...');
            this.initialize();
        } else {
            this.log('Tracker disabled or DNT enabled, skipping initialization.');
        }
    }

    /**
     * Checks if Do Not Track (DNT) is enabled by the user.
     * @returns true if DNT is enabled, else false.
     */
    private isDoNotTrackEnabled(): boolean {
        const nav = navigator as Navigator & { doNotTrack?: string; msDoNotTrack?: string };
        const win = window as unknown as { doNotTrack?: string };
        return (
            nav.doNotTrack === '1' ||
            win.doNotTrack === '1' ||
            nav.msDoNotTrack === '1' ||
            false
        );
    }

    /**
     * Logs debug messages if DEBUG flag is true.
     * @param args Items to log.
     */
    private log(...args: any[]): void {
        if (AnalyticsTracker.DEBUG) {
            console.log('[Arunya]', ...args);
        }
    }

    /**
     * Validates and returns a session timeout in milliseconds.
     * Falls back to default if invalid or undefined.
     * @param timeout optional timeout as number or string
     * @returns validated timeout in ms
     */
    private validateSessionTimeout(timeout?: number | string): number {
        const parsed = typeof timeout === 'string' ? parseInt(timeout, 10) : timeout;
        return Number.isNaN(parsed) || parsed === undefined
            ? CONFIG.DEFAULT_SESSION_TIMEOUT
            : parsed;
    }

    /**
     * Retrieves the last used timestamp from sessionStorage or returns current time.
     * @returns last used timestamp in ms
     */
    private getLastUsed(): number {
        const stored = sessionStorage.getItem(CONFIG.STORAGE_KEYS.LAST_USED);
        return stored ? parseInt(stored, 10) : Date.now();
    }

    /**
     * Updates the last used timestamp in sessionStorage and internal state.
     */
    private updateLastUsed(): void {
        const now = Date.now();
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.LAST_USED, now.toString());
        this.lastUsed = now;
    }

    /**
     * Gets or creates a unique session ID stored in sessionStorage.
     * @returns session ID string
     */
    private getSessionId(): string {
        let sessionId = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_ID);
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
            this.updateLastUsed();
        }
        return sessionId;
    }

    /**
     * Opens IndexedDB database or falls back to localStorage.
     * @returns Promise resolving to IDBDatabase instance or localStorage object
     */
    private async getDatabase(): Promise<IDBDatabase | Storage> {
        if (!('indexedDB' in window)) {
            this.log('IndexedDB not supported, using localStorage fallback');
            return localStorage;
        }
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.INDEXED_DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(CONFIG.INDEXED_DB_STORE)) {
                    db.createObjectStore(CONFIG.INDEXED_DB_STORE, { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Retrieves all previous session IDs from IndexedDB or localStorage fallback.
     * @returns Promise resolving to array of session ID strings.
     */
    private async getPreviousSessionIds(): Promise<string[]> {
        const db = await this.getDatabase();
        if (db instanceof IDBDatabase) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(CONFIG.INDEXED_DB_STORE, 'readonly');
                const store = tx.objectStore(CONFIG.INDEXED_DB_STORE);
                const req = store.getAll();
                req.onerror = () => reject(req.error);
                req.onsuccess = () =>
                    resolve(req.result.map((s: any) => s.id));
            });
        }
        const stored = localStorage.getItem('arunya.previousSessions');
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Saves the current session ID to IndexedDB or localStorage fallback.
     * @param sessionId the session ID to save
     * @returns Promise that resolves on successful save.
     */
    private async saveToIndexedDB(sessionId: string): Promise<void> {
        const db = await this.getDatabase();
        if (db instanceof IDBDatabase) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(CONFIG.INDEXED_DB_STORE, 'readwrite');
                const store = tx.objectStore(CONFIG.INDEXED_DB_STORE);
                const req = store.add({ id: sessionId, timestamp: Date.now() });
                req.onerror = () => reject(req.error);
                req.onsuccess = () => resolve();
            });
        }
        const stored = localStorage.getItem('arunya.previousSessions');
        const sessions = stored ? JSON.parse(stored) : [];
        if (!sessions.includes(sessionId)) {
            sessions.push(sessionId);
            localStorage.setItem('arunya.previousSessions', JSON.stringify(sessions));
        }
    }

    /**
     * Cleans up old sessions from IndexedDB to limit stored sessions to max (default 20).
     * Keeps the most recent sessions by timestamp.
     * @param max maximum number of sessions to keep
     */
    private async cleanUpOldSessions(max: number = 20): Promise<void> {
        const db = await this.getDatabase();
        if (db instanceof IDBDatabase) {
            const tx = db.transaction(CONFIG.INDEXED_DB_STORE, 'readwrite');
            const store = tx.objectStore(CONFIG.INDEXED_DB_STORE);
            const all = await new Promise<any[]>((res, rej) => {
                const req = store.getAll();
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });
            if (all.length > max) {
                // Sort ascending by timestamp (oldest first)
                all.sort((a, b) => a.timestamp - b.timestamp);
                const toDelete = all.slice(0, all.length - max);
                for (const session of toDelete) {
                    store.delete(session.id);
                }
            }
        }
    }

    /**
     * Extracts custom event data from a HTMLElement's data attributes prefixed with 'arunya'.
     * Parses JSON strings if detected.
     * @param element HTMLElement to extract data from
     * @returns record of custom event data
     */
    private extractCustomEventData(element: HTMLElement): Record<string, any> {
        const dataset = element.dataset;
        const data: Record<string, any> = {};
        Object.keys(dataset).forEach((key) => {
            if (
                key.startsWith('arunya') &&
                !['arunyaEvent', 'arunyaId'].includes(key)
            ) {
                // Normalize camelCase to kebab-case
                const normalized = key
                    .replace('arunya', '')
                    .replace(/([A-Z])/g, '-$1')
                    .toLowerCase();
                try {
                    const value = dataset[key as keyof DOMStringMap];
                    data[normalized] =
                        value?.startsWith('{') && value?.endsWith('}')
                            ? JSON.parse(value!)
                            : value;
                } catch {
                    data[key] = dataset[key as keyof DOMStringMap];
                }
            }
        });
        return data;
    }

    /**
     * Sends event data to tracking endpoint using sendBeacon with fetch fallback and retries.
     * @param data EventData payload to send
     */
    private async sendEvent(data: EventData): Promise<void> {
        if (!this.enabled) return;
        try {
            this.log('Sending event via sendBeacon', data.type);
            const sent = navigator.sendBeacon(
                this.trackingUrl.toString(),
                JSON.stringify(data)
            );
            if (!sent) throw new Error('sendBeacon failed');
        } catch {
            this.log('sendBeacon failed, trying fetch fallback');
            await this.retryFetch(data);
        } finally {
            this.updateLastUsed();
        }
    }

    /**
     * Attempts to send event data using fetch with retries and exponential backoff.
     * @param data EventData to send
     * @param retries Number of retry attempts (default 3)
     * @param delay Initial delay in ms (default 500)
     */
    private async retryFetch(
        data: EventData,
        retries = 3,
        delay = 500
    ): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                this.log(`Fetch attempt ${i + 1} for event ${data.type}`);
                const res = await fetch(this.trackingUrl.toString(), {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return;
            } catch (err) {
                if (i === retries - 1) {
                    console.warn(
                        '[Arunya] Failed to send event after retries:',
                        err,
                        data
                    );
                } else {
                    await new Promise((res) =>
                        setTimeout(res, delay * Math.pow(2, i))
                    );
                }
            }
        }
    }

    /**
     * Creates the base event data object with current session, url, screen, and other details.
     * @returns Base EventData object
     */
    private createBaseEventData(): EventData {
        return {
            type: '',
            timestamp: Date.now(),
            url: {
                host: window.location.hostname,
                path: window.location.pathname,
                query: window.location.search,
            },
            referrer: document.referrer,
            screen: {
                width: window.screen.width,
                height: window.screen.height,
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            sessionId: this.sessionId,
            websiteId: this.config.websiteId,
            previousSessions: this.previousSessionIds,
        };
    }

    /**
     * Handles custom event triggered by element with 'data-arunya-event' attribute.
     * @param element HTMLElement that triggered the event
     */
    private handleCustomEvent(element: HTMLElement): void {
        const eventName = element.getAttribute(CONFIG.ATTRIBUTES.EVENT);
        if (!eventName) return;
        const data = this.extractCustomEventData(element);
        const event: EventData = {
            ...this.createBaseEventData(),
            type: 'custom_event',
            name: eventName,
            data,
        };
        this.sendEvent(event);
    }

    /**
     * Handles click events on tracked elements, sends event with target ID or custom event data.
     * @param event MouseEvent from click
     */
    private handleElementClick = (event: MouseEvent) => {
        const element = event.currentTarget as HTMLElement;
        if (element.hasAttribute(CONFIG.ATTRIBUTES.EVENT)) {
            this.handleCustomEvent(element);
        } else {
            const id = element.getAttribute(CONFIG.ATTRIBUTES.ID) ?? 'unknown';
            const eventData: EventData = {
                ...this.createBaseEventData(),
                type: 'click',
                target: id,
            };
            this.sendEvent(eventData);
        }
    };

    /**
     * Attaches click event listeners to elements and assigns unique IDs if missing.
     * @param element HTMLElement to track
     * @param index Index for ID generation fallback
     */
    private setupEventListeners(element: HTMLElement, index: number): void {
        const id = `${element.tagName.toLowerCase()}-${index}`;
        if (!element.hasAttribute(CONFIG.ATTRIBUTES.ID)) {
            element.setAttribute(CONFIG.ATTRIBUTES.ID, id);
        }
        if (!this.trackedElements.has(element)) {
            const handler = (e: Event) => this.handleElementClick(e as MouseEvent);
            element.addEventListener('click', handler);
            this.trackedElements.set(element, handler);
        }
    }

    /**
     * Scans the DOM subtree for elements to track and attaches listeners.
     * Uses a debounced mutation handler to improve performance on dynamic content.
     * @param root Document or HTMLElement to scan, defaults to document
     */
    private setupElementTracking(root: Document | HTMLElement = document): void {
        const SELECTORS = [
            'button',
            'a',
            'input[type="submit"]',
            'input[type="button"]',
            'input[type="reset"]',
            '*[onclick]',
            '*[type="button"]',
            '*[type="submit"]',
            '*[type="reset"]',
            '*[role="button"]',
            '*[role="link"]',
            '*[role="menuitem"]',
            `*[${CONFIG.ATTRIBUTES.EVENT}]`,
        ].join(',');
        const elements = Array.from(root.querySelectorAll<HTMLElement>(SELECTORS));
        elements.forEach((el, i) => {
            if (!el.hasAttribute(CONFIG.ATTRIBUTES.ID)) {
                this.setupEventListeners(el, i);
            }
        });
    }

    /**
     * Debounced mutation observer handler to avoid flooding when many DOM changes happen rapidly.
     * Schedules element tracking after 500ms of no new mutations.
     */
    private debounceTrackNewElements(): void {
        if (this.mutationThrottleTimer !== null) return;
        this.mutationThrottleTimer = window.setTimeout(() => {
            this.setupElementTracking();
            this.mutationThrottleTimer = null;
        }, 500);
    }

    /**
     * Sets up a MutationObserver to watch for added nodes and track their events.
     * Debounced to prevent performance issues.
     */
    private observeDOMChanges(): void {
        this.mutationObserver = new MutationObserver(() => {
            this.debounceTrackNewElements();
        });
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * Handler to detect SPA URL changes and track page views accordingly.
     * Also resets event tracking on new pages.
     */
    private handleURLChange = (): void => {
        const path = window.location.pathname + window.location.search;
        if (this.lastTrackedPath !== path) {
            this.lastTrackedPath = path;
            this.trackPageView();
            this.setupElementTracking();
        }
    };

    /**
     * Patches history methods pushState and replaceState to detect SPA navigation changes.
     * Also listens for popstate and hashchange events.
     */
    private setupNavigationTracking(): void {
        const originalPushState = history.pushState.bind(history);
        const originalReplaceState = history.replaceState.bind(history);
        
        history.pushState = (data: any, unused: string, url?: string | URL | null) => {
            originalPushState.call(history, data, unused, url);
            this.handleURLChange();
        };
        
        history.replaceState = (data: any, unused: string, url?: string | URL | null) => {
            originalReplaceState.call(history, data, unused, url);
            this.handleURLChange();
        };
        
        window.addEventListener('popstate', this.handleURLChange);
        window.addEventListener('hashchange', this.handleURLChange);
    }

    /**
     * Tracks a page view event with current URL, title, and referrer.
     */
    public trackPageView(): void {
        const event: EventData = {
            ...this.createBaseEventData(),
            type: 'page_view',
            title: document.title,
        };
        this.sendEvent(event);
    }

    /**
     * Tracks a custom event with optional additional data.
     * Rate-limited to avoid event flooding.
     * @param event Custom event name
     * @param data Optional extra data to send
     */
    public track(event: string, data?: Record<string, any>): void {
        if (this.isThrottled(event)) return;
        const base = this.createBaseEventData();
        const payload: EventData = { ...base, type: event, ...data };
        this.sendEvent(payload);
    }

    /**
     * Checks if an event type is currently throttled to prevent too frequent sending.
     * @param eventType event type string
     * @returns true if throttled, else false
     */
    private isThrottled(eventType: string): boolean {
        const now = Date.now();
        const last = this.lastEventTimestamps[eventType] || 0;
        if (now - last < this.eventThrottleInterval) return true;
        this.lastEventTimestamps[eventType] = now;
        return false;
    }

    /**
     * Periodically checks if the session expired and renews if needed.
     */
    private periodicSessionCheck = (): void => {
        if (Date.now() - this.lastUsed > (this.config.sessionTimeout ?? CONFIG.DEFAULT_SESSION_TIMEOUT)) {
            this.log('Session expired, renewing...');
            this.renewSession();
        }
    };

    /**
     * Renews the session ID and stores the old one as previous session.
     */
    private async renewSession(): Promise<void> {
        this.previousSessionIds.push(this.sessionId);
        await this.saveToIndexedDB(this.sessionId);
        await this.cleanUpOldSessions();

        this.sessionId = crypto.randomUUID();
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, this.sessionId);
        this.updateLastUsed();
        this.log('Session renewed', this.sessionId);
    }

    /**
     * Public method to manually disable tracking (opt-out).
     */
    public disable(): void {
        this.enabled = false;
        localStorage.setItem(CONFIG.STORAGE_KEYS.DISABLED, 'true');
        this.cleanup();
        this.log('Tracking disabled by user.');
    }

    /**
     * Public method to manually enable tracking (opt-in).
     */
    public enable(): void {
        if (localStorage.getItem(CONFIG.STORAGE_KEYS.DISABLED) === 'true') {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.DISABLED);
        }
        this.enabled = true;
        this.updateLastUsed();
        this.initialize();
        this.log('Tracking enabled by user.');
    }

    /**
     * Cleans up event listeners and observers on disable.
     */
    private cleanup(): void {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = undefined;
        }
        window.removeEventListener('popstate', this.handleURLChange);
        window.removeEventListener('hashchange', this.handleURLChange);
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        // WeakMap doesn't support iteration, so we'll just clear the reference
        // and let the browser clean up the event listeners when elements are removed from DOM
        // This is a limitation of WeakMap - it's designed to not be enumerable
        this.trackedElements = new WeakMap();
    }

    /**
     * Initializes the tracker: sets up session, previous sessions, observers, and event listeners.
     */
    private async initialize(): Promise<void> {
        this.previousSessionIds = await this.getPreviousSessionIds();

        // Setup listeners and observers
        this.setupElementTracking();
        this.observeDOMChanges();
        this.setupNavigationTracking();
        this.trackPageView();

        // Periodic session renewal check
        this.intervalId = window.setInterval(
            this.periodicSessionCheck,
            CONFIG.SESSION_CHECK_INTERVAL
        );
    }
}

// Expose on global window for access and instantiation
declare global {
    interface Window {
        arunya?: AnalyticsTracker;
        ArunyaTracker?: typeof AnalyticsTracker;
    }
}

/**
 * Initialize tracker on script load.
 * Reads config from script tag attributes:
 * - data-arunya-website-id (required)
 * - data-arunya-session-timeout (optional)
 */
(() => {
    const currentScript = document.currentScript as HTMLScriptElement | null;
    if (!currentScript) {
        console.error('[Arunya] Script tag not found.');
        return;
    }

    const websiteId = currentScript.getAttribute('data-arunya-website-id');
    if (!websiteId) {
        console.error('[Arunya] Missing required attribute data-arunya-website-id');
        return;
    }

    const sessionTimeoutAttr = currentScript.getAttribute('data-arunya-session-timeout');
    const apiHost = new URL(currentScript.src).origin;

    window.arunya = new AnalyticsTracker({
        websiteId,
        apiHost,
        sessionTimeout: sessionTimeoutAttr ? parseInt(sessionTimeoutAttr, 10) : undefined,
    });

    window.ArunyaTracker = AnalyticsTracker;
})();
