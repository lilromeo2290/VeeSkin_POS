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
  title: "VeeSkin Essentials POS — Point of Sale",
  description: "Point-of-sale system for VeeSkin Essentials — skincare & perfume boutique. Manage products, process sales, and track inventory in real time.",
  keywords: ["VeeSkin", "POS", "skincare", "perfume", "boutique", "retail", "point of sale"],
  authors: [{ name: "VeeSkin Essentials" }],
  icons: {
    icon: "/veeskin-brand.jpg",
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
