/**
 * Generates the bcrypt hash to store in OWNER_PASSWORD_HASH.
 *
 *   npm run hash-password -- "my new password"
 *
 * The plaintext password is never written anywhere: copy the printed hash into
 * your local .env.local and into the Vercel environment variable.
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- "your-password"');
  process.exit(1);
}

if (password.length < 10) {
  console.error("Use a password of at least 10 characters.");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);

console.log("\nOWNER_PASSWORD_HASH=" + hash + "\n");
console.log("Add this to .env.local locally, and to the Vercel project environment variables.");
console.log("Quote the value in shells so `$` characters are not expanded.\n");
