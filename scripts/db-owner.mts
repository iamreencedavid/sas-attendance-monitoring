// Creates (or updates) the owner's Supabase Auth account from OWNER_EMAIL and
// OWNER_PASSWORD in .env.local, and tags it app_metadata.role = 'owner' so
// isOwner() lets it into /admin. Safe to re-run: an existing account gets the
// new password and the owner tag. The password is never printed.
// Run with: npm run db:owner
import { createClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.OWNER_PASSWORD;

if (!url || !secretKey) {
  console.error(
    "✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local (see .env.example).",
  );
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("✖ Set OWNER_EMAIL=<the owner's email> in .env.local.");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("✖ Set OWNER_PASSWORD in .env.local (at least 8 characters).");
  process.exit(1);
}

const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

async function findUser(target: string): Promise<User | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
}

try {
  const existing = await findUser(email);
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { ...existing.app_metadata, role: "owner" },
    });
    if (error) throw error;
    console.log(`✔ Updated ${email}: password set and tagged as owner.`);
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "owner" },
    });
    if (error) throw error;
    console.log(`✔ Created owner account ${email}.`);
  }
  console.log("  Sign in at /login. You can remove OWNER_PASSWORD from .env.local now.");
} catch (err) {
  console.error(`✖ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
