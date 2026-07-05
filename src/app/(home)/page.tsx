import ConsumerHomePage from "./components/ConsumerHomePage";
import DashboardPage from "./components/DashboardPage";
import { LandingPage } from "@/components/landing/landing-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "consumer") {
    return <ConsumerHomePage />;
  }

  return <DashboardPage />;
}
