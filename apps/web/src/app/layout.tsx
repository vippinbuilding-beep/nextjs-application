import type { Metadata, Viewport } from "next";
import { Fredoka, Geist_Mono } from "next/font/google";

import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { CreatorDashboardGate } from "@/components/creator/creator-dashboard-gate";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { NotificationToastListener } from "@/components/notifications/notification-toast-listener";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";
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
        <AuthProvider>
          <NotificationToastListener />
          <AppNavigation />
          <CreatorDashboardGate>{children}</CreatorDashboardGate>
        </AuthProvider>
        <Toaster />
        <ServiceWorkerRegister />
        <InstallAppPrompt />
      </body>
    </html>
  );
}
