export {};

const CONFIG = {
    DEFAULT_SESSION_TIMEOUT: 30 * 60 * 1000,
    SESSION_CHECK_INTERVAL: 30 * 1000,
    STORAGE_KEYS: {
        DISABLED: 'arunya.disabled',
        SESSION_ID: 'arunya.sessionId',
        LAST_USED: 'arunya.lastUsed'
    },
    ATTRIBUTES: {
        EVENT: 'data-arunya-event',
        ID: 'data-arunya-id',
        PREFIX: 'data-arunya-'
    },
    URL_CHANGE_EVENTS: ['pushState', 'replaceState', 'popstate', 'hashchange'],
    INDEXED_DB_NAME: 'arunya',
    INDEXED_DB_STORE: 'previousSessions'
};

type AnalyticsConfig = {
    websiteId: string;
    apiHost: string;
    sessionTimeout?: number;
};

type EventData = {
    type: string;
    timestamp: number;
    url: { host: string; path: string; query: string; };
    referrer: string;
    screen: { width: number; height: number; };
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

    constructor(config: AnalyticsConfig) {
        this.config = {
            ...config,
            sessionTimeout: this.validateSessionTimeout(config.sessionTimeout)
        };
        this.trackingUrl = new URL('/api/track', config.apiHost);
        this.enabled = localStorage.getItem(CONFIG.STORAGE_KEYS.DISABLED) !== 'true';
        this.sessionId = this.getSessionId();
        this.lastUsed = this.getLastUsed();
        this.lastTrackedPath = window.location.pathname + window.location.search;

        if (this.enabled) {
            this.initialize();
        }
    }

    private validateSessionTimeout(timeout?: number | string): number {
        const parsed = typeof timeout === 'string' ? parseInt(timeout, 10) : timeout;
        return Number.isNaN(parsed) || parsed === undefined ? CONFIG.DEFAULT_SESSION_TIMEOUT : parsed;
    }

    private getLastUsed(): number {
        const stored = sessionStorage.getItem(CONFIG.STORAGE_KEYS.LAST_USED);
        return stored ? parseInt(stored, 10) : Date.now();
    }

    private updateLastUsed(): void {
        const now = Date.now();
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.LAST_USED, now.toString());
        this.lastUsed = now;
    }

    private getSessionId(): string {
        let sessionId = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_ID);
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
            this.updateLastUsed();
        }
        return sessionId;
    }

    private async getDatabase(): Promise<IDBDatabase | Storage> {
        if (!('indexedDB' in window)) return localStorage;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.INDEXED_DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () => {
                const db = request.result;
                db.createObjectStore(CONFIG.INDEXED_DB_STORE, { keyPath: 'id' });
            };
        });
    }

    private async getPreviousSessionIds(): Promise<string[]> {
        const db = await this.getDatabase();
        if (db instanceof IDBDatabase) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(CONFIG.INDEXED_DB_STORE, 'readonly');
                const store = tx.objectStore(CONFIG.INDEXED_DB_STORE);
                const req = store.getAll();
                req.onerror = () => reject(req.error);
                req.onsuccess = () => resolve(req.result.map((s: any) => s.id));
            });
        }
        const stored = localStorage.getItem('arunya.previousSessions');
        return stored ? JSON.parse(stored) : [];
    }

    private async saveToIndexedDB(sessionId: string): Promise<void> {
        const db = await this.getDatabase();
        if (db instanceof IDBDatabase) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(CONFIG.INDEXED_DB_STORE, 'readwrite');
                const store = tx.objectStore(CONFIG.INDEXED_DB_STORE);
                const req = store.add({ id: sessionId });
                req.onerror = () => reject(req.error);
                req.onsuccess = () => resolve();
            });
        }
        const stored = localStorage.getItem('arunya.previousSessions');
        const sessions = stored ? JSON.parse(stored) : [];
        sessions.push(sessionId);
        localStorage.setItem('arunya.previousSessions', JSON.stringify(sessions));
    }

    private extractCustomEventData(element: HTMLElement): Record<string, any> {
        const dataset = element.dataset;
        const data: Record<string, any> = {};
        Object.keys(dataset).forEach(key => {
            if (key.startsWith('arunya') && !['arunyaEvent', 'arunyaId'].includes(key)) {
                const normalized = key.replace('arunya', '').replace(/([A-Z])/g, '-$1').toLowerCase();
                try {
                    const value = dataset[key as keyof DOMStringMap];
                    data[normalized] = value?.startsWith('{') ? JSON.parse(value!) : value;
                } catch {
                    data[key] = dataset[key as keyof DOMStringMap];
                }
            }
        });
        return data;
    }

    private async sendEvent(data: EventData): Promise<void> {
        if (!this.enabled) return;
        try {
            const sent = navigator.sendBeacon(this.trackingUrl.toString(), JSON.stringify(data));
            if (!sent) throw new Error('Beacon failed');
        } catch {
            try {
                await fetch(this.trackingUrl.toString(), {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('[Arunya] Failed to send event:', error);
            }
        } finally {
            this.updateLastUsed();
        }
    }

    private createBaseEventData(): EventData {
        return {
            type: '',
            timestamp: Date.now(),
            url: {
                host: window.location.hostname,
                path: window.location.pathname,
                query: window.location.search
            },
            referrer: document.referrer,
            screen: {
                width: window.screen.width,
                height: window.screen.height
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            sessionId: this.sessionId,
            websiteId: this.config.websiteId,
            previousSessions: this.previousSessionIds
        };
    }

    private handleCustomEvent(element: HTMLElement): void {
        const eventName = element.getAttribute(CONFIG.ATTRIBUTES.EVENT);
        if (!eventName) return;
        const data = this.extractCustomEventData(element);
        const event: EventData = {
            ...this.createBaseEventData(),
            type: 'custom_event',
            name: eventName,
            data
        };
        this.sendEvent(event);
    }

    private handleElementClick = (event: MouseEvent) => {
        const element = event.currentTarget as HTMLElement;
        if (element.hasAttribute(CONFIG.ATTRIBUTES.EVENT)) {
            this.handleCustomEvent(element);
        } else {
            const id = element.getAttribute(CONFIG.ATTRIBUTES.ID)!;
            const eventData: EventData = {
                ...this.createBaseEventData(),
                type: 'click',
                target: id
            };
            this.sendEvent(eventData);
        }
    }

    private setupEventListeners(element: HTMLElement, index: number): void {
        const id = `${element.tagName.toLowerCase()}-${index}`;
        element.setAttribute(CONFIG.ATTRIBUTES.ID, id);
        if (!this.trackedElements.has(element)) {
            const handler = (e: Event) => this.handleElementClick(e as MouseEvent);
            element.addEventListener('click', handler);
            this.trackedElements.set(element, handler);
        }
    }

    private setupElementTracking(root: Document | HTMLElement = document): void {
        const SELECTORS = [
            'button', 'a', 'input[type="submit"]', 'input[type="button"]',
            'input[type="reset"]', '*[onclick]', '*[type="button"]',
            '*[type="submit"]', '*[type="reset"]', '*[role="button"]',
            '*[role="link"]', '*[role="menuitem"]', `*[${CONFIG.ATTRIBUTES.EVENT}]`
        ].join(',');
        const elements = Array.from(root.querySelectorAll<HTMLElement>(SELECTORS));
        elements.forEach((el, i) => {
            if (!el.hasAttribute(CONFIG.ATTRIBUTES.ID)) {
                this.setupEventListeners(el, i);
            }
        });
    }

    private observeDOMChanges(): void {
        this.mutationObserver = new MutationObserver(mutations => {
            mutations.forEach(m => m.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    this.setupElementTracking(node as HTMLElement);
                }
            }));
        });
        this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    private handleURLChange = (): void => {
        const path = window.location.pathname + window.location.search;
        if (this.lastTrackedPath !== path) {
            this.lastTrackedPath = path;
            this.trackPageView();
            this.setupElementTracking();
        }
    }

    private setupNavigationTracking(): void {
        const { pushState, replaceState } = history;
        history.pushState = (...args) => {
            pushState.apply(history, args);
            this.handleURLChange();
        };
        history.replaceState = (...args) => {
            replaceState.apply(history, args);
            this.handleURLChange();
        };
        window.addEventListener('popstate', this.handleURLChange);
        window.addEventListener('hashchange', this.handleURLChange);
    }

    private checkSession(): void {
        if (Date.now() - this.lastUsed > this.config.sessionTimeout!) {
            this.sessionId = crypto.randomUUID();
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, this.sessionId);
            this.updateLastUsed();
            this.identify();
        }
    }

    private handleExitIntent = (e: MouseEvent): void => {
        if (e.clientY <= 0) this.track('exit_intent');
    }

    private handlePageExit = (): void => {
        this.track('page_exit');
        this.updateLastUsed();
    }

    private initialize(): void {
        if (document.readyState === 'complete') {
            this.onReady();
        } else {
            document.addEventListener('readystatechange', () => {
                if (document.readyState === 'complete') this.onReady();
            });
        }
    }

    private onReady(): void {
        this.identify();
        this.setupElementTracking();
        this.observeDOMChanges();
        this.setupNavigationTracking();
        this.trackPageView();
        this.attachExitIntentListener();
        this.attachPageExitListener();
        this.getPreviousSessionIds().then(ids => this.previousSessionIds = ids);
        this.saveToIndexedDB(this.sessionId);
        this.intervalId = window.setInterval(() => this.checkSession(), CONFIG.SESSION_CHECK_INTERVAL);
    }

    private attachExitIntentListener(): void {
        document.addEventListener('mouseleave', this.handleExitIntent);
    }

    private attachPageExitListener(): void {
        window.addEventListener('beforeunload', this.handlePageExit);
    }

    public enable(): void {
        this.enabled = true;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.DISABLED);
        this.initialize();
    }

    public disable(): void {
        this.enabled = false;
        localStorage.setItem(CONFIG.STORAGE_KEYS.DISABLED, 'true');
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.mutationObserver) this.mutationObserver.disconnect();
    }

    public track(event: string, data?: Record<string, any>): void {
        const base = this.createBaseEventData();
        const payload: EventData = { ...base, type: event, ...data };
        this.sendEvent(payload);
    }

    public trackPageView(): void {
        const payload: EventData = {
            ...this.createBaseEventData(),
            type: 'page_view',
            title: document.title
        };
        this.sendEvent(payload);
    }

    public identify(): void {
        const identifyEvent: EventData = {
            ...this.createBaseEventData(),
            type: 'custom_event',
            name: 'identify',
            data: {}
        };
        this.sendEvent(identifyEvent);
    }
}

declare global {
    interface Window {
        arunya?: AnalyticsTracker;
    }
}

const initializeTracker = (scriptElement: HTMLScriptElement | null): void => {
    if (!scriptElement) return console.error('[Arunya] Script tag not found');
    const websiteId = scriptElement.getAttribute('data-arunya-website-id');
    const sessionTimeout = scriptElement.getAttribute('data-arunya-session-timeout');
    const apiHost = new URL(scriptElement.getAttribute('src')!).origin;
    if (!websiteId) return console.error('[Arunya] Missing website ID');

    window.arunya = new AnalyticsTracker({
        websiteId,
        apiHost,
        sessionTimeout: sessionTimeout ? parseInt(sessionTimeout, 10) : CONFIG.DEFAULT_SESSION_TIMEOUT
    });
};

(() => {
    const currentScript = document.currentScript as HTMLScriptElement | null;
    if (currentScript) initializeTracker(currentScript);
})();
