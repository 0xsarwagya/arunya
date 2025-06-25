/**
 * Tracker types module.
 *
 * This module contains Zod schemas for various types of events
 * that can be sent to the Arunya analytics server.
 *
 * @packageDocumentation
 */

import { z } from 'zod';

/**
 * URL information.
 *
 * This object contains information about the current page's URL.
 */
const UrlSchema = z.object({
    /**
     * URL host.
     *
     * The host part of the URL, e.g. "example.com".
     */
    host: z.string().min(1, "URL host cannot be empty"),

    /**
     * URL path.
     *
     * The path part of the URL, e.g. "/path/to/page".
     */
    path: z.string().min(1, "URL path cannot be empty"),

    /**
     * URL query string.
     *
     * The query string part of the URL, e.g. "?foo=bar".
     */
    query: z.string().optional(),
});

/**
 * Screen information.
 *
 * This object contains information about the user's screen.
 */
const ScreenSchema = z.object({
    /**
     * Screen width.
     *
     * The width of the user's screen in pixels.
     */
    width: z.number().int().positive("Screen width must be a positive integer"),

    /**
     * Screen height.
     *
     * The height of the user's screen in pixels.
     */
    height: z.number().int().positive("Screen height must be a positive integer"),
});

/**
 * Base event data.
 *
 * This object contains common information about all events.
 */
const BaseEventDataSchema = z.object({
    /**
     * Event type.
     *
     * The type of event, e.g. "page_view", "click", etc.
     */
    type: z.string().min(1, "Event type cannot be empty"),

    /**
     * Timestamp.
     *
     * The timestamp of the event in milliseconds.
     */
    timestamp: z.number().int().positive("Timestamp must be a positive integer"),

    /**
     * URL information.
     *
     * Information about the current page's URL.
     */
    url: UrlSchema,

    /**
     * Referrer.
     *
     * The URL of the page that referred the user to this page.
     */
    referrer: z.string(),

    /**
     * Screen information.
     *
     * Information about the user's screen.
     */
    screen: ScreenSchema,

    /**
     * Timezone.
     *
     * The user's timezone.
     */
    timezone: z.string().min(1, "Timezone cannot be empty"),

    /**
     * Session ID.
     *
     * A unique identifier for the user's session.
     */
    sessionId: z.string().uuid("Session ID must be a valid UUID"),

    /**
     * Website ID.
     *
     * A unique identifier for the website.
     */
    websiteId: z.string().min(1, "Website ID cannot be empty"),

    /**
     * Previous sessions.
     *
     * An array of IDs of previous sessions.
     */
    previousSessions: z.array(z.string().uuid("Previous session IDs must be valid UUIDs")),
});

/**
 * Page view event.
 *
 * This event is sent when the user views a page.
 */
export const PageViewEventSchema = BaseEventDataSchema.extend({
    /**
     * Type.
     *
     * The type of event, always "page_view".
     */
    type: z.literal('page_view'),

    /**
     * Title.
     *
     * The title of the page.
     */
    title: z.string().min(1, "Page view event must have a title"),
});

/**
 * Click event.
 *
 * This event is sent when the user clicks on an element.
 */
export const ClickEventSchema = BaseEventDataSchema.extend({
    /**
     * Type.
     *
     * The type of event, always "click".
     */
    type: z.literal('click'),

    /**
     * Target.
     *
     * The ID of the element that was clicked.
     */
    target: z.string().min(1, "Click event must have a target ID"),
});

/**
 * Custom event.
 *
 * This event is sent when the user triggers a custom event.
 */
export const CustomEventDataSchema = z.record(z.string(), z.any());

export const CustomEventSchema = BaseEventDataSchema.extend({
    /**
     * Type.
     *
     * The type of event, always "custom_event".
     */
    type: z.literal('custom_event'),

    /**
     * Name.
     *
     * The name of the custom event.
     */
    name: z.string().min(1, "Custom event must have a name"),

    /**
     * Data.
     *
     * An object containing additional data about the event.
     */
    data: CustomEventDataSchema.optional(),
});

/**
 * Event payload.
 *
 * This is the shape of the data sent to the server when an event is triggered.
 */
export const EventPayloadSchema = z.discriminatedUnion("type", [
    PageViewEventSchema,
    ClickEventSchema,
    CustomEventSchema,
    BaseEventDataSchema.extend({
        /**
         * Type.
         *
         * The type of event.
         */
        type: z.string().refine(type => !['page_view', 'click', 'custom_event'].includes(type), {
            message: "Unsupported event type. Please use specific schemas or define a new one.",
        }),

        /**
         * Name.
         *
         * The name of the event (optional).
         */
        name: z.string().optional(),

        /**
         * Data.
         *
         * An object containing additional data about the event (optional).
         */
        data: z.record(z.string(), z.any()).optional(),

        /**
         * Title.
         *
         * The title of the page (optional).
         */
        title: z.string().optional(),

        /**
         * Target.
         *
         * The ID of the element that was clicked (optional).
         */
        target: z.string().optional(),
    }).catchall(z.any())
]);

/**
 * Page view event payload.
 *
 * The shape of the data sent to the server when a page view event is triggered.
 */
export type PageViewEventPayload = z.infer<typeof PageViewEventSchema>;

/**
 * Click event payload.
 *
 * The shape of the data sent to the server when a click event is triggered.
 */
export type ClickEventPayload = z.infer<typeof ClickEventSchema>;

/**
 * Custom event payload.
 *
 * The shape of the data sent to the server when a custom event is triggered.
 */
export type CustomEventPayload = z.infer<typeof CustomEventSchema>;

/**
 * Event payload.
 *
 * The shape of the data sent to the server when any event is triggered.
 */
export type EventPayload = z.infer<typeof EventPayloadSchema>;