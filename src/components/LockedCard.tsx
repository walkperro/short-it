"use client";

import Link from "next/link";

type Props = {
  title: string;
  description: string;
  image: string;
  locked: boolean;
  href: string;
  cta?: string;
};

export default function LockedCard({
  title,
  description,
  image,
  locked,
  href,
  cta = "Upgrade to unlock",
}: Props) {
  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/40">
      <img
        src={image}
        alt={title}
        className={`h-64 w-full object-cover transition ${
          locked ? "blur-md scale-105 opacity-70" : ""
        }`}
      />

      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-lg font-semibold mb-2">🔒 {title}</div>
          <Link
            href="/subscribe"
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
          >
            {cta}
          </Link>
        </div>
      )}

      {!locked && (
        <Link href={href} className="absolute inset-0">
          <span className="sr-only">{title}</span>
        </Link>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-white/70">{description}</p>
      </div>
    </div>
  );
}
