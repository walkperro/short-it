import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-white">
      <div className="max-w-xl">
        <div className="text-xs tracking-[0.35em] text-white/40">SHORT-IT</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-3 text-sm text-white/60">
          Confirm your email to finish setup.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="mt-10 max-w-xl rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
            Loading…
          </div>
        }
      >
        <LoginClient />
      </Suspense>
    </main>
  );
}
