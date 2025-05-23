import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Inter,
  Kalam,
} from "next/font/google";
import "./globals.css";
import localFont from "next/font/local";
import Providers from "@/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["devanagari"],
  weight: ["300"],
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

const FiraCode = localFont({
  src: "../public/fonts/fira-code.woff2",
  variable: "--font-fira-mono",
});

const DepartureMono = localFont({
  src: "../public/fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased ${inter.variable} ${kalam.variable} ${FiraCode.variable} ${DepartureMono.variable} ${instrument.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
