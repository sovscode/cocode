import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoCode | Real-Time Audience Collaboration for VSCode",
  description:
    "Transform your coding streams and presentations. CoCode is a VSCode extension that lets instructors seamlessly accept real-time code contributions from their audience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased box-border bg-zinc-50`}
      >
        {children}
        <Toaster position="top-center" closeButton={true} />
      </body>
      <Analytics />
    </html>
  );
}
