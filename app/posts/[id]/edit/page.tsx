import { notFound, redirect } from "next/navigation";
import { PostEditor } from "@/components/PostEditor";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { isSafePostId, isPostCategory } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  if (!isSafePostId(id)) notFound();

  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) {
    redirect(`/auth/login?lang=${language}&returnTo=/posts/${id}/edit`);
  }

  const { data: post, error } = await supabase
    .from("posts")
    .select("id, author_id, title, content, category, language")
    .eq("id", id)
    .maybeSingle();

  if (
    error ||
    !post ||
    post.author_id !== userId ||
    typeof post.title !== "string" ||
    typeof post.content !== "string" ||
    !isPostCategory(post.category) ||
    !isLanguage(post.language)
  ) {
    notFound();
  }

  return <PostEditor post={post} language={isLanguage(lang) ? lang : post.language} />;
}
