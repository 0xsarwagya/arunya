import "dotenv/config";
import { Client } from "pg";
import bcrypt from "bcrypt";

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set");
    process.exit(1);
  }

  try {
    const res = await client.query(
      `SELECT id, email FROM "User" WHERE role = $1 LIMIT 1`,
      ["ADMIN"]
    );

    if (res.rows.length > 0) {
      console.log(`Admin user already exists with email: ${res.rows[0].email}`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const insertText = `
      INSERT INTO "User"(id, email, password, role, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, email
    `;

    const insertRes = await client.query(insertText, [
      crypto.randomUUID(),
      adminEmail,
      hashedPassword,
      "ADMIN",
    ]);

    console.log(`Admin user created with email: ${insertRes.rows[0].email}`);
    process.exit(0);
  } catch (err) {
    console.error("Error during seeding:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();