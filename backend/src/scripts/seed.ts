import bcrypt from "bcryptjs";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

async function seed() {
  await connectDatabase();
  const existing = await User.findOne({ email: env.seedAdminEmail.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(env.seedAdminPassword, env.bcryptSaltRounds);
  const user = await User.create({
    name: env.seedAdminName,
    email: env.seedAdminEmail.toLowerCase(),
    passwordHash,
    role: "ADMIN",
  });
  console.log(`Created admin ${user.email}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
