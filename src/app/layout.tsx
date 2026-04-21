import type { Metadata } from "next";
import { Merriweather, Bebas_Neue } from "next/font/google";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from "./navbar/navbar";
import Providers from "./providers";
import Footer from "./footer/footer";
import AnalyticsTracker from "./AnalyticsTracker/analyticsTracker";
import Script from "next/script";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-menu",
});

export const metadata: Metadata = {
  title: "Retro Horror Hub – Horror Movies & Collectibles for Fans",
  description: "Discover cult horror films from the 70s, 80s and 90s. Explore cast & crew, trailers, fan contributions, collectibles, vinyls, and rare memorabilia in a curated horror archive for fans and collectors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <meta name="impact-site-verification" content="ce9cc761-2c62-493a-bddc-58beddb9f633" />
        <link rel="stylesheet" href="/silktide-consent-manager.css" />
      </head>
      <body className={`${merriweather.variable} ${bebasNeue.variable}`}>
        <Providers>
          <Navbar />
          <AnalyticsTracker />
          {children}
          <Footer />
        </Providers>

        {/* 1. GA consent defaults — beforeInteractive so it fires before GA loads */}
        <Script id="gtag-consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied'
            });
          `}
        </Script>

        {/* 2. Silktide — library loaded dynamically, config runs in onload to guarantee correct order */}
        <Script id="silktide-combined" strategy="afterInteractive">
          {`
            var silktideScript = document.createElement('script');
            silktideScript.src = '/silktide-consent-manager.js';
            silktideScript.onload = function() {
              silktideCookieBannerManager.updateCookieBannerConfig({
                background: { showBackground: true },
                cookieIcon: { position: "bottomLeft" },
                cookieTypes: [
                  {
                    id: "necessary",
                    name: "Necessary",
                    description: "<p>These cookies are necessary for the website to function properly.</p>",
                    required: true,
                    onAccept: function() {}
                  },
                  {
                    id: "analytics",
                    name: "Analytics",
                    description: "<p>These cookies help us improve the site by tracking which pages are most popular.</p>",
                    required: false,
                    onAccept: function() {
                      gtag('consent', 'update', { analytics_storage: 'granted' });
                      dataLayer.push({ event: 'consent_accepted_analytics' });
                    },
                    onReject: function() {
                      gtag('consent', 'update', { analytics_storage: 'denied' });
                    }
                  }
                ],
                text: {
                  banner: {
                    description: "<p>We use cookies to enhance your experience and analyze traffic. <a href='/cookie-policy' target='_blank'>Cookie Policy</a></p>",
                    acceptAllButtonText: "Accept all",
                    rejectNonEssentialButtonText: "Reject non-essential",
                    preferencesButtonText: "Preferences"
                  },
                  preferences: {
                    title: "Customize your cookie preferences",
                    description: "<p>You can choose not to allow some types of cookies.</p>"
                  }
                },
                position: { banner: "center" }
              });
            };
            document.head.appendChild(silktideScript);
          `}
        </Script>

        {/* 3. Google Analytics — loads after consent defaults are set */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1Q15D7ZWMZ"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            gtag('js', new Date());
            gtag('config', 'G-1Q15D7ZWMZ', { anonymize_ip: true });
          `}
        </Script>

      </body>
    </html>
  );
}