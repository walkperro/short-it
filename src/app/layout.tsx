import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import { AuthProvider } from "@/components/auth/AuthProvider";
import DisclaimerGate from "@/components/DisclaimerGate";

export const metadata: Metadata = {
  title: "SHORT-IT",
  description: "Trade intel. Clean. Tiered.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <AuthProvider>
          <DisclaimerGate>
            <SiteHeader />
            {children}
          </DisclaimerGate>
        </AuthProvider>
      </body>
    </html>
  );
}
