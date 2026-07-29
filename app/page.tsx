import { HomePageClient } from "@/components/HomePageClient";
import { toPublicPosts, type PublicPost } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let authenticated = false;
  let username: string | undefined;
  let displayName: string | undefined;
  let posts: PublicPost[] = [];
  const supabase = await createClient();

  if (supabase) {
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (userId) {
      authenticated = true;
      const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", userId).maybeSingle();
      username = profile?.username;
      displayName = profile?.display_name ?? undefined;
    }

    const { data } = await supabase
      .from("posts")
      .select("id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), comments(count)")
      .order("created_at", { ascending: false })
      .limit(20);
    posts = toPublicPosts(data ?? []);
  }

  return <HomePageClient authenticated={authenticated} username={username} displayName={displayName} posts={posts} />;
}
