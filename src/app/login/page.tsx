import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-10 text-white/70">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}
