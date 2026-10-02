"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
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
  if (!(await isAdmin())) return NOT_ALLOWED;
  const parsed = parseStaffForm(formData, { withPin: true });
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { name, role, shiftStart, shiftEnd, dailyRate, overtimeRate, pin } = parsed.data;
  const { error } = await createAdminClient()
    .from("staff")
    .insert({
      name,
      role,
      shift_start: shiftStart,
      shift_end: shiftEnd,
      daily_rate: dailyRate,
      overtime_rate: overtimeRate,
      pin_hash: await bcrypt.hash(pin!, 10),
    });
  return error ? failed(error) : saved();
}

export async function updateStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const id = idFrom(formData);
  if (!id) return SAVE_FAILED;
  const parsed = parseStaffForm(formData, { withPin: false });
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { name, role, shiftStart, shiftEnd, dailyRate, overtimeRate } = parsed.data;
  const { error } = await createAdminClient()
    .from("staff")
    .update({
      name,
      role,
      shift_start: shiftStart,
      shift_end: shiftEnd,
      daily_rate: dailyRate,
      overtime_rate: overtimeRate,
    })
    .eq("id", id);
  return error ? failed(error) : saved();
}

/** New PIN also clears any lockout, since the old PIN no longer matters. */
export async function resetStaffPin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
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
  if (!(await isAdmin())) return NOT_ALLOWED;
  const id = idFrom(formData);
  if (!id) return SAVE_FAILED;

  const { error } = await createAdminClient()
    .from("staff")
    .update({ failed_pin_count: 0, locked_until: null })
    .eq("id", id);
  return error ? failed(error) : saved();
}

export async function setStaffActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const id = idFrom(formData);
  if (!id) return SAVE_FAILED;
  const active = formData.get("active") === "true";

  const { error } = await createAdminClient()
    .from("staff")
    .update({ active })
    .eq("id", id);
  return error ? failed(error) : saved();
}

const PHOTO_BUCKET = "punch-photos";
const REMOVE_BATCH = 100;

/**
 * Permanently erases a staff member with every punch and photo they have.
 * The one exception to "punches are never deleted" (owner's choice). The
 * database part is one transaction in `delete_staff`; photo files are removed
 * after, best-effort, since leftover files are harmless once the rows are gone.
 */
export async function deleteStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return NOT_ALLOWED;
  const id = idFrom(formData);
  if (!id) return SAVE_FAILED;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("delete_staff", { p_staff_id: id });
  if (error) {
    console.error(error);
    return { ok: false, message: "Couldn't delete. Try again." };
  }

  const paths = (data as string[] | null) ?? [];
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const { error: removeError } = await supabase.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + REMOVE_BATCH));
    if (removeError) console.error(`Removing photos of deleted staff ${id} failed: ${removeError.message}`);
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/monitoring");
  return saved();
}
