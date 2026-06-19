import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as ToasterLegacy } from "@/components/ui/toaster";
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
  title: "Brew POS — Point of Sale System",
  description: "Modern point-of-sale web app for cafes, retail, and small businesses. Manage products, process sales, and track inventory in real time.",
  keywords: ["POS", "point of sale", "retail", "cafe", "inventory", "sales"],
  authors: [{ name: "Brew POS" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <ToasterLegacy />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
