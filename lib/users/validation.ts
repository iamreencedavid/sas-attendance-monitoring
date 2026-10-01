export type UserField = "name" | "email" | "password" | "passwordConfirm";
export type FieldErrors = Partial<Record<UserField, string>>;

export const MIN_PASSWORD = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function checkPassword(formData: FormData, errors: FieldErrors): string {
  // Passwords aren't trimmed: spaces are allowed and count.
  const raw = formData.get("password");
  const password = typeof raw === "string" ? raw : "";
  const confirm = formData.get("passwordConfirm");
  if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  else if (password !== confirm) errors.passwordConfirm = "Passwords don't match.";
  return password;
}

/** Shared by the drawer form and the Server Actions, so both enforce the same rules. */
export function parseUserForm(
  formData: FormData,
  { withPassword }: { withPassword: boolean },
): Parsed<{ name: string; email: string; password?: string }> {
  const errors: FieldErrors = {};
  const name = str(formData, "name").replace(/\s+/g, " ");
  const email = str(formData, "email").toLowerCase();
  if (!name) errors.name = "Enter a name.";
  else if (name.length > 60) errors.name = "Keep it under 60 characters.";
  if (!EMAIL.test(email)) errors.email = "Enter a valid email address.";
  const password = withPassword ? checkPassword(formData, errors) : undefined;
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data: { name, email, password } };
}

export function parsePasswordForm(formData: FormData): Parsed<{ password: string }> {
  const errors: FieldErrors = {};
  const password = checkPassword(formData, errors);
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data: { password } };
}
