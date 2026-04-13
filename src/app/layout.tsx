import type { Metadata } from "next";
import { Merriweather, Bebas_Neue } from "next/font/google";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from "./navbar/navbar";
import Providers from "./providers";
import Footer from "./footer/footer";
import AnalyticsTracker from "./AnalyticsTracker/analyticsTracker";
import CookieBanner from './CookieBanner/cookieBanner';

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],  // normal and bold
  variable: "--font-body",
});



const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"], // usually one weight is enough
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
         {/*  <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-1Q15D7ZWMZ"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1Q15D7ZWMZ');
          `}
          </Script> */}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
