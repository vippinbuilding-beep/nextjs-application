import type { Metadata } from "next";
import { Fredoka, Geist_Mono } from "next/font/google";

import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vippin Dashboard",
  description: "Painel administrativo Vippin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${fredoka.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
