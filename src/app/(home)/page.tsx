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

  return <DashboardPage />;
}