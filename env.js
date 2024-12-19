import { z } from "zod";

const server = z.object({
	NODE_ENV: z
		.enum([
			"development", // default
			"production",
		])
		.default("development"),
	BASE_URL: z.string().optional(),
	VERCEL_URL: z.string().url().optional(),
});

const client = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
});

const processEnv = {
	NODE_ENV: process.env.NODE_ENV,
	BASE_URL: process.env.BASE_URL,
	VERCEL_URL: process.env.VERCEL_URL,
};

// Don't touch the part below
// --------------------------

const merged = server
	.merge(client)
	.refine((data) => data.BASE_URL || data.VERCEL_URL, {
		message: "Either BASE_URL or VERCEL_URL must be present",
		path: ["BASE_URL"],
	});

/** @typedef {z.input<typeof merged>} MergedInput */
/** @typedef {z.infer<typeof merged>} MergedOutput */
/** @typedef {z.SafeParseReturnType<MergedInput, MergedOutput>} MergedSafeParseReturn */

let env = /** @type {MergedOutput} */ (process.env);
if (!!process.env.SKIP_ENV_VALIDATION === false) {
	const isServer = typeof window === "undefined";

	const parsed = /** @type {MergedSafeParseReturn} */ (
		isServer
			? merged.safeParse(processEnv) // on server we can validate all env vars
			: client.safeParse(processEnv) // on client we can only validate the ones that are exposed
	);

	if (parsed.success === false) {
		console.error(
			"❌ Invalid environment variables:",
			parsed.error.flatten().fieldErrors,
		);
		throw new Error("Invalid environment variables");
	}

	env = new Proxy(parsed.data, {
		get(target, prop) {
			if (typeof prop !== "string") return undefined;
			return target[/** @type {keyof typeof target} */ (prop)];
		},
	});
}

export { env };
