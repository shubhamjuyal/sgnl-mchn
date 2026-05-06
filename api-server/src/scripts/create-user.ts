import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, user } from "../db/index.js";

async function main() {
  const [, , emailArg, password, displayName, roleArg] = process.argv;
  if (!emailArg || !password || !displayName) {
    console.error(
      "Usage: tsx src/scripts/create-user.ts <email> <password> <displayName> [role]",
    );
    process.exit(1);
  }
  const email = emailArg.toLowerCase();
  const role = roleArg ?? "reviewer";
  if (role !== "admin" && role !== "reviewer") {
    console.error(`role must be 'admin' or 'reviewer' (got '${role}')`);
    process.exit(1);
  }

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing) {
    console.error(`User with email ${email} already exists (id=${existing.id})`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const inserted = await db
    .insert(user)
    .values({ email, passwordHash, displayName, role })
    .returning({ id: user.id, email: user.email, role: user.role });
  const row = inserted[0];
  if (!row) {
    console.error("Insert returned no row");
    process.exit(1);
  }

  console.log(`Created user id=${row.id} email=${row.email} role=${row.role}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
