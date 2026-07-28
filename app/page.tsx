import { HomePageClient } from "@/components/HomePageClient";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let authenticated = false;
  let username: string | undefined;
  let displayName: string | undefined;
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (userId) {
      authenticated = true;
      const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", userId).maybeSingle();
      username = profile?.username;
      displayName = profile?.display_name;
    }
  }
  return <HomePageClient authenticated={authenticated} username={username} displayName={displayName} />;
}
