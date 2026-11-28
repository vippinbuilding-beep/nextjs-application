import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { MotionProvider } from "@vippin/ui/motion-provider";
import { ThemeScript } from "@vippin/ui/theme-script";

import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { CreatorDashboardGate } from "@/components/creator/creator-dashboard-gate";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { NotificationToastListener } from "@/components/notifications/notification-toast-listener";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import { createRootMetadata } from "@/lib/metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = createRootMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b10" },
  ],
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MotionProvider>
          <AuthProvider>
            <NotificationToastListener />
            <AppNavigation />
            <CreatorDashboardGate>{children}</CreatorDashboardGate>
          </AuthProvider>
          <Toaster />
          <ServiceWorkerRegister />
          <InstallAppPrompt />
        </MotionProvider>
      </body>
    </html>
  );
}
