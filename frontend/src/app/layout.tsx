import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Keepalive from "@/components/Keepalive";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jhionnea — Private AI Employee System",
  description: "Role-based AI employee system for writing, teaching, content operations, business management, and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://jhionnea-backend-vwboktzs.fly.dev" />
        <link rel="dns-prefetch" href="https://jhionnea-backend-vwboktzs.fly.dev" />
      </head>
      <body className="min-h-full flex flex-col">
        <Keepalive />
        {children}
      </body>
    </html>
  );
}
