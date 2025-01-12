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
    URL_CHANGE_EVENTS: ['pushState', 'replaceState', 'popstate', 'hashchange']
}

class AnalyticsTracker {
    config
    enabled
    sessionId
    lastUsed
    trackingUrl
    intervalId
    lastTrackedPath
    mutationObserver

    constructor(config) {
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

    validateSessionTimeout(timeout) {
        const parsed = typeof timeout === 'string' ? parseInt(timeout, 10) : timeout;
        return Number.isNaN(parsed) ? CONFIG.DEFAULT_SESSION_TIMEOUT : parsed;
    }

    getLastUsed() {
        const stored = sessionStorage.getItem(CONFIG.STORAGE_KEYS.LAST_USED);
        return stored ? parseInt(stored, 10) : Date.now();
    }

    updateLastUsed() {
        const now = Date.now();
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.LAST_USED, now.toString());
        this.lastUsed = now;
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_ID);
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
            this.updateLastUsed();
        }
        return sessionId;
    }

    extractCustomEventData(element) {
        const dataset = element.dataset;
        const customData = {};

        Object.keys(dataset).forEach(key => {
            if (key.startsWith('arunya') && !['arunyaEvent', 'arunyaId'].includes(key)) {
                // Convert camelCase back to kebab-case for the key
                const normalizedKey = key
                    .replace('arunya', '')
                    .replace(/([A-Z])/g, '-$1')
                    .toLowerCase();

                const value = dataset[key];
                try {
                    // Attempt to parse JSON if the value looks like JSON
                    customData[normalizedKey] = value?.startsWith('{') || value?.startsWith('[')
                        ? JSON.parse(value)
                        : value;
                } catch {
                    customData[normalizedKey] = value;
                }
            }
        });

        return customData;
    }

    async sendEvent(data) {
        if (!this.enabled) return;

        try {
            const success = navigator.sendBeacon(this.trackingUrl, JSON.stringify(data));
            if (!success) {
                throw new Error('Beacon failed');
            }
        } catch (error) {
            try {
                await fetch(this.trackingUrl, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('Failed to send event:', error);
            }
        } finally {
            this.updateLastUsed();
        }
    }

    createBaseEventData() {
        return {
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
        };
    }

    handleCustomEvent(element) {
        const eventName = element.getAttribute(CONFIG.ATTRIBUTES.EVENT);
        if (!eventName) return;

        const customData = this.extractCustomEventData(element);

        const customEvent = {
            type: 'custom_event',
            name: eventName,
            data: customData,
            ...this.createBaseEventData()
        };

        this.sendEvent(customEvent);
    }

    setupEventListeners(element, index) {
        const id = `${element.tagName.toLowerCase()}-${index}`;
        element.setAttribute(CONFIG.ATTRIBUTES.ID, id);

        // Handle clicks
        element.addEventListener('click', () => {
            if (element.hasAttribute(CONFIG.ATTRIBUTES.EVENT)) {
                this.handleCustomEvent(element);
            } else {
                const clickEvent = {
                    type: 'click',
                    target: id,
                    ...this.createBaseEventData()
                };
                this.sendEvent(clickEvent);
            }
        });
    }

    setupElementTracking(root = document) {
        // Setup tracking for clickable elements
        const CLICKABLE_SELECTORS = [
            'button', 'a', 'input[type="submit"]', 'input[type="button"]',
            'input[type="reset"]', '*[onclick]', '*[type="button"]',
            '*[type="submit"]', '*[type="reset"]', '*[role="button"]',
            '*[role="link"]', '*[role="menuitem"]',
            `*[${CONFIG.ATTRIBUTES.EVENT}]` // Add elements with custom events
        ].join(',');

        const elements = Array.from(root.querySelectorAll(CLICKABLE_SELECTORS));
        elements.map((element, i) => {
            console.log(element);
            if (!element.hasAttribute(CONFIG.ATTRIBUTES.ID)) {
                this.setupEventListeners(element, i);
            }
        });
    }

    observeDOMChanges() {
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.setupElementTracking(node);
                    }
                });
            });
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    handleURLChange = () => {
        const currentPath = window.location.pathname + window.location.search;
        if (this.lastTrackedPath !== currentPath) {
            this.lastTrackedPath = currentPath;
            this.trackPageView();
            // Re-setup tracking for any new elements
            this.setupElementTracking();
        }
    };

    setupNavigationTracking() {
        // Handle History API changes
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this.handleURLChange();
        };

        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            this.handleURLChange();
        };

        // Handle browser navigation events
        window.addEventListener('popstate', this.handleURLChange);
        window.addEventListener('hashchange', this.handleURLChange);
    }

    checkSession() {
        const now = Date.now();
        if (now - this.lastUsed > this.config.sessionTimeout) {
            this.sessionId = crypto.randomUUID();
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, this.sessionId);
            this.updateLastUsed();
            this.identify();
        }
    }

    initialize() {
        if (document.readyState === 'complete') {
            this.onReady();
        } else {
            document.addEventListener('readystatechange', () => {
                if (document.readyState === 'complete') {
                    this.onReady();
                }
            });
        }
    }

    onReady() {
        this.identify();
        this.setupElementTracking();
        this.observeDOMChanges();
        this.setupNavigationTracking();
        this.trackPageView();

        // Start session checking
        this.intervalId = window.setInterval(
            () => this.checkSession(),
            CONFIG.SESSION_CHECK_INTERVAL
        );
    }

    enable() {
        this.enabled = true;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.DISABLED);
        this.initialize();
    }

    disable() {
        this.enabled = false;
        localStorage.setItem(CONFIG.STORAGE_KEYS.DISABLED, 'true');
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
    }

    track(event, data) {
        const baseData = this.createBaseEventData();
        const eventData = { type: event, ...baseData, ...data };
        this.sendEvent(eventData);
    }

    trackPageView() {
        const pageViewEvent = {
            type: 'page_view',
            title: document.title,
            ...this.createBaseEventData()
        };
        this.sendEvent(pageViewEvent);
    }

    identify() {
        const identifyEvent = {
            type: 'custom_event',
            name: 'identify',
            data: {},
            ...this.createBaseEventData()
        };
        this.sendEvent(identifyEvent);
    }
}

// Initialize the tracker
const initializeTracker = (scriptElement) => {
    if (!scriptElement) {
        console.error('Analytics script element not found');
        return;
    }

    const websiteId = scriptElement.getAttribute('data-arunya-website-id');
    if (!websiteId) {
        console.error('Website ID not provided');
        return;
    }

    const apiHost = new URL(scriptElement.getAttribute('src')).origin;
    const sessionTimeout = scriptElement.getAttribute('data-arunya-session-timeout');

    const tracker = new AnalyticsTracker({
        websiteId: websiteId,
        apiHost: apiHost,
        sessionTimeout: sessionTimeout ? parseInt(sessionTimeout, 10) : CONFIG.DEFAULT_SESSION_TIMEOUT
    });

    // Expose the tracker instance globally
    (window).arunya = tracker;
};

// Self-executing function to initialize the tracker
(() => {
    const currentScript = document.currentScript;
    if (currentScript) {
        initializeTracker(currentScript);
    }
})();