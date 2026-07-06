"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ConsumerProfileForm } from "@/components/profile/consumer-profile-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { isConsumer } from "@/lib/user-role";

export default function EditProfilePage() {
  const router = useRouter();
  const redirectToLogin = useLoginRedirect();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      redirectToLogin();
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [loading, user, router, redirectToLogin]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return isConsumer(user) ? <ConsumerProfileForm /> : <ProfileForm />
}