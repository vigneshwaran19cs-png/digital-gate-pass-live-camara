import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Safe custom .env loader (zero-dependency, production-safe)
try {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  let dir = currentDir;
  while (dir) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split(/\r?\n/).forEach((line) => {
        // Ignore comments and empty lines
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
  // Fail silently if .env is missing or unreadable
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = mysql.createPool(process.env.DATABASE_URL);
export const db = drizzle(pool, { schema, mode: "default" });

export * from "./schema";
export * from "./departments_data.js";
