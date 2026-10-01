"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";

export type SignInState = { error: string | null; email: string };

const WRONG = "Email or password is incorrect.";

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: WRONG, email };

  // A real account that isn't the owner gets the same answer as a wrong password.
  if (data.user.app_metadata?.role !== "owner") {
    await supabase.auth.signOut();
    return { error: WRONG, email };
  }

  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
