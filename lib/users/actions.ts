"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/admin";
import { adminRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserActionState } from "./types";
import { parsePasswordForm, parseUserForm } from "./validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** How long "disabled" lasts: effectively forever, until someone enables them. */
const DISABLED_FOR = "876000h";

const NOT_ALLOWED: UserActionState = { ok: false, message: "Not available." };
const SAVE_FAILED: UserActionState = { ok: false, message: "Couldn't save. Try again." };
const OWNER_LOCKED: UserActionState = { ok: false, message: "The owner account can't be changed here." };
const NOT_YOURSELF: UserActionState = { ok: false, message: "You can't do that to your own account." };
const EMAIL_TAKEN: UserActionState = {
  ok: false,
  errors: { email: "Someone already uses that email." },
  message: "Someone already uses that email.",
};

type AuthError = { code?: string; message: string };

function saved(): UserActionState {
  revalidatePath("/admin/users");
  return { ok: true, savedAt: Date.now() };
}

function failed(error: AuthError): UserActionState {
  if (error.code === "email_exists" || error.code === "user_already_exists") return EMAIL_TAKEN;
  if (error.code === "weak_password") {
    return { ok: false, errors: { password: "Supabase rejected that password as too weak." } };
  }
  console.error(error);
  return SAVE_FAILED;
}

/**
 * Loads the user a form points at, after checking the caller may use /admin.
 * Refuses the owner account (nobody edits it here) and accounts that aren't
 * admins at all. Every check runs on the server, whatever the UI shows.
 */
async function loadTarget(
  formData: FormData,
): Promise<{ ok: true; target: User; selfId: string } | { ok: false; state: UserActionState }> {
  const me = await getAdminUser();
  if (!me) return { ok: false, state: NOT_ALLOWED };

  const id = formData.get("id");
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, state: SAVE_FAILED };

  const { data, error } = await createAdminClient().auth.admin.getUserById(id);
  if (error || !data.user) return { ok: false, state: SAVE_FAILED };
  const role = adminRole(data.user);
  if (role === "owner") return { ok: false, state: OWNER_LOCKED };
  if (role !== "admin") return { ok: false, state: NOT_ALLOWED };
  return { ok: true, target: data.user, selfId: me.id };
}

export async function createUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  if (!(await getAdminUser())) return NOT_ALLOWED;
  const parsed = parseUserForm(formData, { withPassword: true });
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { name, email, password } = parsed.data;
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role: "admin" },
  });
  return error ? failed(error) : saved();
}

export async function updateUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const loaded = await loadTarget(formData);
  if (!loaded.ok) return loaded.state;
  const parsed = parseUserForm(formData, { withPassword: false });
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { target } = loaded;
  const { name, email } = parsed.data;
  const { error } = await createAdminClient().auth.admin.updateUserById(target.id, {
    email,
    email_confirm: true,
    user_metadata: { ...target.user_metadata, name },
  });
  return error ? failed(error) : saved();
}

export async function resetUserPassword(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const loaded = await loadTarget(formData);
  if (!loaded.ok) return loaded.state;
  const parsed = parsePasswordForm(formData);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { error } = await createAdminClient().auth.admin.updateUserById(loaded.target.id, {
    password: parsed.data.password,
  });
  return error ? failed(error) : saved();
}

export async function setUserDisabled(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const loaded = await loadTarget(formData);
  if (!loaded.ok) return loaded.state;
  if (loaded.target.id === loaded.selfId) return NOT_YOURSELF;

  const disable = formData.get("disabled") === "true";
  const { error } = await createAdminClient().auth.admin.updateUserById(loaded.target.id, {
    ban_duration: disable ? DISABLED_FOR : "none",
  });
  return error ? failed(error) : saved();
}

export async function deleteUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const loaded = await loadTarget(formData);
  if (!loaded.ok) return loaded.state;
  if (loaded.target.id === loaded.selfId) return NOT_YOURSELF;

  const { error } = await createAdminClient().auth.admin.deleteUser(loaded.target.id);
  return error ? failed(error) : saved();
}
