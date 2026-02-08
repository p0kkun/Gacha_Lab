import type { Metadata } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorModalProvider } from "@/components/ErrorModalProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const treDisplay = Cinzel({
  variable: "--font-tre-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TRE BOX - ガチャアプリ",
  description: "LINE上で動作するガチャアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${treDisplay.variable} antialiased`}
      >
        <ErrorModalProvider>{children}</ErrorModalProvider>
      </body>
    </html>
  );
}
