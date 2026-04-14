import type { Metadata } from "next";
import { Merriweather, Bebas_Neue } from "next/font/google";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from "./navbar/navbar";
import Providers from "./providers";
import Footer from "./footer/footer";
import AnalyticsTracker from "./AnalyticsTracker/analyticsTracker";
import CookieBanner from './CookieBanner/cookieBanner';
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
    <html lang="en">
      <body className={`${merriweather.variable} ${bebasNeue.variable}`}>
        <Providers>
          <Navbar />
          <AnalyticsTracker />
          {children}
          <CookieBanner />
          <Footer />
        </Providers>
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied'
            });
            gtag('js', new Date());
            gtag('config', 'G-1Q15D7ZWMZ', { anonymize_ip: true });
          `}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1Q15D7ZWMZ"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}