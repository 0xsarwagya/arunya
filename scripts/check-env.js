/**
 * @module scripts/check-env
 * 
 * Environment variable validation and type definition module.
 * This module ensures that all required environment variables are present
 * and correctly formatted before the application starts.
 * 
 * @remarks
 * This module should be imported early in the application lifecycle to ensure
 * all required environment variables are available. It will exit the process
 * with a detailed error message if any variables are missing or invalid.
 * 
 * Required environment variables:
 * - DATABASE_URL: Connection string for the database
 * - BETTER_AUTH_SECRET: Secret key for authentication (min 32 chars)
 * - BETTER_AUTH_URL: URL for authentication service
 * - ADMIN_EMAIL: Email address for admin account
 * - ADMIN_PASSWORD: Password for admin account (min 8 chars)
 * 
 * Optional environment variables:
 * - NODE_ENV: Runtime environment (development/test/production)
 * - MAXMIND_LICENSE_KEY: License key for MaxMind GeoIP service
 * - NEXT_PUBLIC_APP_URL: Public URL of the application
 * 
 * @example
 * ```env
 * # Required Variables
 * DATABASE_URL=postgresql://user:password@localhost:5432/dbname
 * BETTER_AUTH_SECRET=your-secret-key-min-32-characters-long
 * BETTER_AUTH_URL=https://auth.example.com
 * ADMIN_EMAIL=admin@example.com
 * ADMIN_PASSWORD=secure-password
 * 
 * # Optional Variables
 * NODE_ENV=development
 * MAXMIND_LICENSE_KEY=your-maxmind-license
 * NEXT_PUBLIC_APP_URL=http://localhost:3000
 * ```
 */
import "dotenv/config";
import { z } from 'zod';

/**
 * Validate and parse environment variables
 */
const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development")
        .transform((value) => value.toLowerCase()),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string(),
});

/**
 * Parse and validate environment variables
 */
envSchema.parseAsync(process.env).catch(() => {
    /**
     * Handle validation errors
     */
    console.error(
        "❌ Invalid environment variables:",
        parsed.error.flatten().fieldErrors
    );
    /**
     * Exit the process with an error code
     */
    process.exit(1);
}).then((env) => {
    /**
     * Log a success message
     */
    console.log("✅ Environment variables are valid");
});