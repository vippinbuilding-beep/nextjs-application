"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ProfileForm } from "@/components/profile/profile-form";
import { useAuth } from "@/components/providers/auth-provider";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return (
    <LayoutBackground
      element="main"
      background="primary"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <ProfileForm />
    </LayoutBackground>
  );
}
