import { db, usersTable } from "@workspace/db";
import fs from "fs";

async function dump() {
  const users = await db.select().from(usersTable);
  fs.writeFileSync("users_dump.json", JSON.stringify(users, null, 2));
  console.log("Done");
  process.exit(0);
}

dump();
