import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { isAdmin } from "@/lib/auth/admin";
import { safeAdminPath } from "@/lib/auth/next";
import logo from "@/public/brand/logo.png";

export const metadata: Metadata = {
  title: "Sign in · Sip and Simple",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeAdminPath((await searchParams).next);
  if (await isAdmin()) redirect(next);

  return (
    <main className="flex flex-1 items-center justify-center bg-cream px-4 py-10 text-espresso">
      <div className="w-full max-w-sm rounded-2xl border border-latte bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <h1>
            <Image src={logo} alt="Sip and Simple Cafe" priority className="mx-auto h-auto w-52" />
          </h1>
          <p className="mt-3 text-sm text-mocha">Admin sign in</p>
        </div>
        <LoginForm next={next === "/admin" ? undefined : next} />
      </div>
    </main>
  );
}
