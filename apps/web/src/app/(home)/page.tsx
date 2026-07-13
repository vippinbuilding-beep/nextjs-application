import { redirect } from "next/navigation";

import ConsumerHomePage from "./components/ConsumerHomePage";
import DashboardPage from "./components/DashboardPage";
import { LandingPage } from "@/components/landing/landing-page";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  if (profile?.role === "consumer") {
    return <ConsumerHomePage />;
  }

  return <DashboardPage />;
}
