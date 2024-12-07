'use strict';

((window) => {
	const BASE_URL = "http://localhost:3000";

	// Get the current script tag and its attributes
	const scriptTag = document.currentScript;
	const websiteId = scriptTag.getAttribute("data-arunya-id");

	if (!websiteId) {
		return;
	}

	// Construct the tracking URL
	const trackingUrl = new URL("/api/track", BASE_URL);
	trackingUrl.searchParams.append("websiteId", websiteId);

	// Function to generate a unique session ID
	const generateSessionId = () => crypto.randomUUID().toString();

	// Function to retrieve or create a session ID
	const getSessionId = () => {
		let sessionId = sessionStorage.getItem("arunya.session_id");

		if (!sessionId) {
			sessionId = generateSessionId();
			sessionStorage.setItem("arunya.session_id", sessionId);
		}

		return sessionId;
	};

	// Generate or retrieve the session ID
	const sessionId = getSessionId();

	// Function to detect device type using user agent
	const getDeviceType = () => {
		const userAgent = navigator.userAgent;
		if (
			/mobile|android|touch|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
				userAgent,
			)
		) {
			return "mobile";
		} else if (/tablet|ipad/i.test(userAgent)) {
			return "tablet";
		}
		return "desktop";
	};

	const deviceType = getDeviceType();

	// Function to send event data to the server
	const sendEvent = (eventType, eventData = {}) => {
		const data = {
			eventType,
			sessionId,
			timestamp: new Date().toISOString(),
			deviceType,
			...eventData,
		};

		try {
			navigator.sendBeacon(trackingUrl, JSON.stringify(data));
		} catch (error) {
			return;
		}
	};

	// Function to handle page view events
	const trackPageView = () => {
		sendEvent("page_view", {
			url: window.location.href,
			referrer: document.referrer === "" ? undefined : document.referrer,
		});
	};

	// Function to handle click events
	const trackClicks = () => {
		document.addEventListener("click", (event) => {
			const target = event.target;
			if (target && target.tagName) {
				const tagName = target.tagName.toLowerCase();
				const eventData = {
					tagName,
					id: target.id || null,
					className: target.className || null,
					text: target.textContent.trim() || null,
					x: event.clientX,
					y: event.clientY,
				};
				sendEvent("click", eventData);
			}
		});
	};

	// Function to handle scroll events
	const trackScroll = () => {
		let timeout;

		const handleScroll = () => {
			if (timeout) {
				clearTimeout(timeout);
			}

			timeout = setTimeout(() => {
				sendEvent("scroll", {
					scrollTop: window.scrollY,
					scrollLeft: window.scrollX,
					viewportHeight: window.innerHeight,
					viewportWidth: window.innerWidth,
				});
			}, 200); // Throttle scroll event handling
		};

		window.addEventListener("scroll", handleScroll);
	};

	// Initialize tracking
	function init() {
		trackPageView(); // Send initial page view event
		monitorPageChanges(); // Start monitoring for navigation changes
		trackClicks(); // Track click events
		trackScroll(); // Track scroll events
	}

	// Function to monitor page changes
	const monitorPageChanges = () => {
		// Hook into the history.pushState and history.replaceState methods
		const hookHistoryMethod = (methodName) => {
			const originalMethod = history[methodName];
			history[methodName] = function (...args) {
				const result = originalMethod.apply(this, args); // Call the original method
				handleNavigationChange(args[2]); // Handle the URL change
				return result;
			};
		};

		// Handle navigation changes
		const handleNavigationChange = (url) => {
			if (url) {
				setTimeout(trackPageView, 100); // Slight delay to ensure accurate tracking
			}
		};

		// Hook into the browser's history API
		hookHistoryMethod("pushState");
		hookHistoryMethod("replaceState");

		// Listen for popstate events (back/forward navigation)
		window.addEventListener("popstate", () => {
			trackPageView();
		});
	};

	// Start tracking
	init();
})(window);
