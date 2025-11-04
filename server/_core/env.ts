import { config } from "dotenv";

// adding a debugging log to verify env loading
console.log("=== Loading Environment Variables ===");
console.log("Loading .env.local...");
config({ path: ".env.local" });
console.log("Loading .env...");
config({ path: ".env" });

console.log("APP_ID from process.env:", process.env.APP_ID);
console.log(
  "COOKIE_SECRET from process.env:",
  process.env.COOKIE_SECRET ? "SET" : "NOT SET"
);

export const ENV = {
  appId: process.env.APP_ID,
  cookieSecret: process.env.COOKIE_SECRET,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL,
  // Google OAuth credentials for replacing Manus OAuth
  // NOTE: do NOT hardcode secrets here. Provide them via environment variables.
  // For client-side code Vite requires a VITE_ prefixed var; set VITE_GOOGLE_CLIENT_ID for the frontend.
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

// Basic runtime validation and developer-friendly warnings
if (ENV.isProduction) {
  // In production, fail fast for missing critical secrets
  if (!ENV.cookieSecret || ENV.cookieSecret.length === 0) {
    throw new Error(
      "Missing required environment variable: JWT_SECRET (used to sign session cookies)"
    );
  }
  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    throw new Error(
      "Missing Google OAuth credentials: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in production"
    );
  }
} else {
  // In development, just print a helpful info message
  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    console.info(
      "Google OAuth credentials not fully configured. Set VITE_GOOGLE_CLIENT_ID (client) and GOOGLE_CLIENT_SECRET (server) to test sign-in locally."
    );
  }
}
