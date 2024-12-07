import { z } from "zod";

export const EventDataSchema = z.object({
	eventType: z.string().nonempty(), // The type of event (e.g., "page_view", "click", "scroll")
	sessionId: z.string().uuid(), // UUID for the session ID
	timestamp: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
		message: "Invalid ISO timestamp",
	}), // ISO timestamp
	deviceType: z.enum(["mobile", "tablet", "desktop"]), // Device type
	// Optional event-specific fields
	url: z.string().url().optional(), // For "page_view" events
	referrer: z.string().url().optional(), // For "page_view" events
	tagName: z.string().optional(), // For "click" events
	id: z.string().nullable().optional(), // For "click" events
	className: z.string().nullable().optional(), // For "click" events
	text: z.string().nullable().optional(), // For "click" events
	x: z.number().optional(), // X-coordinate for "click" events
	y: z.number().optional(), // Y-coordinate for "click" events
	scrollTop: z.number().optional(), // For "scroll" events
	scrollLeft: z.number().optional(), // For "scroll" events
	viewportHeight: z.number().optional(), // For "scroll" events
	viewportWidth: z.number().optional(), // For "scroll" events
});
