import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import SiteHeader from "@/components/site-header";
import DisclaimerGate from "@/components/DisclaimerGate";

export const metadata: Metadata = {
  title: "SHORT-IT",
  description: "Trade ideas. Not financial advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <AuthProvider>
          <SiteHeader />
          <DisclaimerGate>
            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8">{children}</main>
          </DisclaimerGate>
        </AuthProvider>
      </body>
    </html>
  );
}
