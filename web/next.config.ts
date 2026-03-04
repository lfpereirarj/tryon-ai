import type { NextConfig } from "next";

/**
 * CORS is now handled dynamically per-route in each route handler,
 * using the store's `allowed_origins` from the database.
 *
 * The static wildcard was removed to avoid open CORS in production.
 * See: web/src/app/api/generate/route.ts
 */
const nextConfig: NextConfig = {};

export default nextConfig;