import type { Metadata, Viewport } from "next";
import { Fredoka, Geist_Mono } from "next/font/google";

import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { AuthProvider } from "@/components/providers/auth-provider";
import { createRootMetadata } from "@/lib/metadata";
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

export const metadata: Metadata = createRootMetadata();

export const viewport: Viewport = {
  themeColor: "#ffe502",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${fredoka.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
        <InstallAppPrompt />
      </body>
    </html>
  );
}
