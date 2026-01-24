import Link from "next/link";
import type { ReactNode } from "react";

export default function LockedSection({
  locked,
  label,
  children,
}: {
  locked: boolean;
  label: string;
  children: ReactNode;
}) {
  if (!locked) return <>{children}</>;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white/80">{label}</h2>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
          Locked
        </span>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="select-none text-white/60 blur-sm">
          This section is locked. Upgrade to unlock the full analysis and
          context. This is what the content area looks like once you’re
          subscribed.
          {"\n\n"}• Entry logic{"\n"}• Invalidation{"\n"}• Sizing{"\n"}• Levels
          {"\n"}• Macro regime notes{"\n"}• Scenarios
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 to-black/80" />

        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-white/80">
            Upgrade to unlock{" "}
            <span className="text-white font-semibold">{label}</span>
          </div>
          <Link
            href="/subscribe"
            className="pointer-events-auto inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </section>
  );
}
