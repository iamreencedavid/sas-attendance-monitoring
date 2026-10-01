"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { isOwner } from "@/lib/auth/owner";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";
import { parsePinForm, parseStaffForm } from "./validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DUPLICATE = "23505";

const NOT_ALLOWED: ActionState = { ok: false, message: "Not available." };
const SAVE_FAILED: ActionState = { ok: false, message: "Couldn't save. Try again." };
const NAME_TAKEN: ActionState = {
  ok: false,
  errors: { name: "Someone active already has that name." },
  message: "Someone active already has that name.",
};

function idFrom(formData: FormData): string | null {
  const id = formData.get("id");
  return typeof id === "string" && UUID.test(id) ? id : null;
}

/** Refresh the admin table and the punch page dropdown. */
function saved(): ActionState {
  revalidatePath("/admin/staff");
  revalidatePath("/");
  return { ok: true, savedAt: Date.now() };
}

function failed(error: { code?: string }): ActionState {
  return error.code === DUPLICATE ? NAME_TAKEN : SAVE_FAILED;
}

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isOwner())) return NOT_ALLOWED;
  const parsed = parseStaffForm(formData, { withPin: true });
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { name, role, shiftStart, shiftEnd, pin } = parsed.data;
  const { error } = await createAdminClient()
    .from("staff")
    .insert({
      name,
      role,
      shift_start: shiftStart,
      shift_end: shiftEnd,
      pin_hash: await bcrypt.hash(pin!, 10),
    });
  return error ? failed(error) : saved();
}

export async function updateStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isOwner())) return NOT_ALLOWED;
  const id = idFrom(formData);
  if (!id) return SAVE_FAILED;
  const parsed = parseStaffForm(formData, { withPin: false });
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { name, role, shiftStart, shiftEnd } = parsed.data;
  const { error } = await createAdminClient()
    .from("staff")
    .update({ name, role, shift_start: shiftStart, shift_end: shiftEnd })
    .eq("id", id);
  return error ? failed(error) : saved();
}

/** New PIN also clears any lockout, since the old PIN no longer matters. */
export async function resetStaffPin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isOwner())) return NOT_ALLOWED;
  const id = idFrom(formData);
  if (!id) return SAVE_FAILED;
  const parsed = parsePinForm(formData);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { error } = await createAdminClient()
    .from("staff")
    .update({
      pin_hash: await bcrypt.hash(parsed.data.pin, 10),
      failed_pin_count: 0,
      locked_until: null,
    })
    .eq("id", id);
  return error ? failed(error) : saved();
}

export async function unlockStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isOwner())) return NOT_ALLOWED;
  const id = idFrom(formData);
  if (!id) return SAVE_FAILED;

  const { error } = await createAdminClient()
    .from("staff")
    .update({ failed_pin_count: 0, locked_until: null })
    .eq("id", id);
  return error ? failed(error) : saved();
}

export async function setStaffActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isOwner())) return NOT_ALLOWED;
  const id = idFrom(formData);
  if (!id) return SAVE_FAILED;
  const active = formData.get("active") === "true";

  const { error } = await createAdminClient()
    .from("staff")
    .update({ active })
    .eq("id", id);
  return error ? failed(error) : saved();
}
