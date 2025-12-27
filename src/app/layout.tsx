import "./globals.css";
import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/AuthProvider";
import SiteHeader from "@/components/site-header";
import DisclaimerGate from "@/components/DisclaimerGate";
import EntryDisclaimerModal from "@/components/EntryDisclaimerModal";

export const metadata: Metadata = {
  title: "SHORT-IT",
  description: "Ideas. Conviction. Macro.",
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

        <EntryDisclaimerModal />
      </body>
    </html>
  );
}
