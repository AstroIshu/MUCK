import { defineConfig } from "drizzle-kit";
import { readFileSync } from "fs";
import { config } from "dotenv";

console.log("=== Drizzle Config Debug ===");
config({ path: ".env.local" });
// Manually parse .env.local to avoid any dotenv issues
try {
  const envContent = readFileSync(".env.local", "utf8");
  console.log("📁 .env.local content loaded");

  const envVars: Record<string, string> = {};

  envContent.split("\n").forEach(line => {
    line = line.trim();
    if (line && !line.startsWith("#")) {
      const equalsIndex = line.indexOf("=");
      if (equalsIndex !== -1) {
        const key = line.substring(0, equalsIndex).trim();
        const value = line.substring(equalsIndex + 1).trim();
        envVars[key] = value;
        console.log(`Key: "${key}" = "${value}"`);
      }
    }
  });

  // Set to process.env
  Object.assign(process.env, envVars);
  console.log("✅ Environment variables set manually");
} catch (error) {
  console.error("❌ Failed to load .env.local:", error);
}

const connectionString = process.env.DATABASE_URL;
console.log("Final DATABASE_URL:", connectionString ? "SET" : "NOT SET");

if (!connectionString) {
  console.log("Available vars:");
  Object.keys(process.env).forEach(key => {
    if (key.includes("DATABASE") || key.includes("DB_")) {
      console.log(`  ${key} = ${process.env[key]}`);
    }
  });
  throw new Error("DATABASE_URL is required");
}

console.log("🔍 Looking for schema at: ./drizzle/schema.ts");

export default defineConfig({
  schema: "./drizzle/schema.ts", // CHANGED THIS LINE
  out: "./drizzle/migrations",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
