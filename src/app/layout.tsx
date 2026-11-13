import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import ServiceWorkerProvider from
  "@/components/providers/ServiceWorkerProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skedora",
  description: "Plan tasks, track deadlines, and get notified before they are due.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <ServiceWorkerProvider/>
        {children}</body>
    </html>
  );
}
