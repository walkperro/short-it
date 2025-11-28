import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Short-It",
  description: "Overlay markets. Save combos. Share lists."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text">{children}</body>
    </html>
  );
}
