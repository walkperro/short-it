import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import { AuthProvider } from "@/components/auth/AuthProvider";
import DisclaimerGate from "@/components/DisclaimerGate";

export const metadata: Metadata = {
  themeColor: "#000000",
  keywords: ["trade ideas","market intel","options","SPY","setups","macro","trade intel"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade"),
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
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SHORT-IT — Trade Intel" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SHORT-IT — Trade Intel",
    description: "Tiered market ideas, conviction setups, and macro context.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <AuthProvider>
          <DisclaimerGate>
            <SiteHeader />
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
          <Script
            id="ga-subscribe-events"
            strategy="afterInteractive"
          >{`
            
            (function(){
              function send(name, params){
                try {
                  if (typeof window.gtag === "function") window.gtag("event", name, params || {});
                } catch(e) {}

              // Fire on full content pages (paid/unlocked content)
              try {
                var path2 = (window.location && window.location.pathname) ? window.location.pathname : "";

                // /ideas/<slug>/full
                var f1 = path2.match(/^\/ideas\/([^\/]+)\/full$/);
                if (f1) {
                  send("view_idea_full", {
                    page_path: path2,
                    teaser_type: "ideas",
                    teaser_slug: f1[1]
                  });
                }

                // /conviction/<slug>/full
                var f2 = path2.match(/^\/conviction\/([^\/]+)\/full$/);
                if (f2) {
                  send("view_conviction_full", {
                    page_path: path2,
                    teaser_type: "conviction",
                    teaser_slug: f2[1]
                  });
                }

                // Key funnel pages (optional signals)
                if (path2 === "/pricing") send("view_pricing", { page_path: path2 });
                if (path2 === "/macro") send("view_macro", { page_path: path2 });
              } catch(e) {}

              }

              function getTeaserContext(){
                try {
                  var path = (window.location && window.location.pathname) ? window.location.pathname : "";
                  // /ideas/<slug>  (but NOT /ideas itself)
                  var m1 = path.match(/^\/ideas\/([^\/]+)$/);
                  if (m1) return { isTeaser: true, teaser_type: "ideas", teaser_slug: m1[1] };

                  // /conviction/<slug> (but NOT /conviction itself)
                  var m2 = path.match(/^\/conviction\/([^\/]+)$/);
                  if (m2) return { isTeaser: true, teaser_type: "conviction", teaser_slug: m2[1] };

                  return { isTeaser: false };
                } catch(e) {
                  return { isTeaser: false };
                }
              }

              // Fire on subscribe page view (explicit funnel signal)
              try {
                if (window.location && window.location.pathname === "/subscribe") {
                  send("view_subscribe", { page_path: window.location.pathname });
                }
              } catch(e) {}

              // Fire on teaser page view
              try {
                var ctx = getTeaserContext();
                if (ctx.isTeaser) {
                  send("view_teaser", {
                    page_path: window.location.pathname,
                    teaser_type: ctx.teaser_type,
                    teaser_slug: ctx.teaser_slug
                  });
                }
              } catch(e) {}

              // Track clicks that navigate to /subscribe anywhere in the app
              document.addEventListener("click", function(e){
                var el = e.target;

                // walk up to nearest anchor
                while (el && el !== document.body) {
                  if (el.tagName === "A" && el.getAttribute) break;
                  el = el.parentNode;
                }
                if (!el || !el.getAttribute) return;

                var href = el.getAttribute("href") || "";
                if (href === "/subscribe" || href.startsWith("/subscribe?")) {
                  var ctx = getTeaserContext();
                  send("subscribe_click", {
                    link_url: href,
                    page_path: window.location.pathname,
                    cta_context: ctx.isTeaser ? "teaser" : "site",
                    teaser_type: ctx.teaser_type || undefined,
                    teaser_slug: ctx.teaser_slug || undefined
                  });
                }
              }, true);
            })();

          `}</Script>

          </>
        ) : null}
      </body>
    </html>
  );
}
