"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { signIn, type SignInState } from "@/lib/auth/actions";

const initialState: SignInState = { error: null, email: "" };

const fieldClass =
  "w-full rounded-xl border border-latte bg-cream/40 px-4 py-3 text-base outline-none focus-visible:border-caramel focus-visible:ring-4 focus-visible:ring-caramel/30 disabled:opacity-60";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          disabled={pending}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-semibold">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={pending}
            className={`${fieldClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-mocha outline-none hover:text-espresso focus-visible:ring-4 focus-visible:ring-caramel/30"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      <p role="alert" className="min-h-5 text-sm font-medium text-punch-out">
        {state.error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-espresso px-4 py-3 text-base font-bold text-cream outline-none hover:bg-espresso-soft focus-visible:ring-4 focus-visible:ring-caramel/40 disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
