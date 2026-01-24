import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import { AuthProvider } from "@/components/auth/AuthProvider";
import DisclaimerGate from "@/components/DisclaimerGate";
import AnalyticsEvents from "@/components/analytics/AnalyticsEvents";

export const metadata: Metadata = {
  themeColor: "#000000",
  keywords: [
    "trade ideas",
    "market intel",
    "options",
    "SPY",
    "setups",
    "macro",
    "trade intel",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade",
  ),
  title: {
    default: "SHORT-IT — Trade Intel",
    template: "%s • SHORT-IT",
  },
  description:
    "Short-It Trade Intel — tiered market ideas, conviction setups, and macro context. Clean. Fast. Focused.",
  applicationName: "SHORT-IT",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SHORT-IT",
    title: "SHORT-IT — Trade Intel",
    description: "Tiered market ideas, conviction setups, and macro context.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "SHORT-IT — Trade Intel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SHORT-IT — Trade Intel",
    description: "Tiered market ideas, conviction setups, and macro context.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <AuthProvider>
          <DisclaimerGate>
            <SiteHeader />
            <AnalyticsEvents />
            {children}
          </DisclaimerGate>
        </AuthProvider>

        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
