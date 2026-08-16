import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

// Safe custom .env loader
try {
  let dir = __dirname;
  while (dir) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        if (line.trim().startsWith("#") || !line.includes("=")) return;
        const index = line.indexOf("=");
        const key = line.substring(0, index).trim();
        let value = line.substring(index + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      });
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
} catch (e) {
  // Fail silently
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be defined to run drizzle-kit. Ensure it is configured in your root .env file.");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
