import type { Metadata } from "next";
import { Merriweather, Antonio, Bebas_Neue } from "next/font/google";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from "./navbar/navbar";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],  // normal and bold
  variable: "--font-body",
});

const antonio = Antonio({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-title",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"], // usually one weight is enough
  variable: "--font-menu",
});

export const metadata: Metadata = {
  title: "Retro Horror Hub",
  description: "70s,80s,90s Horror Movies Hub for collectors and fans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${merriweather.variable} ${antonio.variable} ${bebasNeue.variable}`}>
        <Navbar/>
        {children}
      </body>
    </html>
  );
}
