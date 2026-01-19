import Link from "next/link";

export default function ReadFullConvictionCta({
  href,
  className = "",
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "group mt-8 block rounded-3xl border border-white/10 bg-white/5",
        "px-5 py-4 backdrop-blur-xl transition",
        "hover:bg-white/7 hover:border-white/15",
        "hover:-translate-y-[1px]",
        className,
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-tight text-white truncate">
            READ THE FULL CONVICTION
          </div>

          <div className="mt-2 text-[10px] tracking-[0.24em] text-white/40 truncate">
            Thesis • Time Expectations • Catalysts
          </div>
        </div>
      </div>
    </Link>
  );
}
