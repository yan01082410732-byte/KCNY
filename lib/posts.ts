import type { Language } from "@/lib/auth";

export const POST_FIELDS = "id, title, content, category, language, created_at, author_id";
export const POST_CATEGORIES = ["culture", "language", "travel", "study", "daily", "other"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export function isPostCategory(value: unknown): value is PostCategory {
  return typeof value === "string" && POST_CATEGORIES.includes(value as PostCategory);
}

export function postCategoryLabel(category: PostCategory, language: Language) {
  const labels = language === "KR"
    ? { culture: "문화 교류", language: "언어 학습", travel: "여행", study: "유학 생활", daily: "일상", other: "기타" }
    : { culture: "文化交流", language: "语言学习", travel: "旅行", study: "留学生活", daily: "日常", other: "其他" };
  return labels[category];
}

export function postLanguageLabel(postLanguage: Language, language: Language) {
  if (language === "KR") return postLanguage === "KR" ? "한국어" : "중국어";
  return postLanguage === "KR" ? "韩文" : "中文";
}

export type PublicPost = {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  language: Language;
  created_at: string;
  author_id: string;
  author: {
    username: string;
    display_name: string | null;
  } | null;
};

export function toPublicPosts(rows: unknown[]): PublicPost[] {
  return rows.flatMap((row) => {
    const value = row as Record<string, unknown>;
    const authorValue = Array.isArray(value.author) ? value.author[0] : value.author;
    const author = authorValue as Record<string, unknown> | undefined;
    if (
      typeof value.id !== "string" ||
      typeof value.author_id !== "string" ||
      typeof value.title !== "string" ||
      typeof value.content !== "string" ||
      !isPostCategory(value.category) ||
      (value.language !== "CN" && value.language !== "KR") ||
      typeof value.created_at !== "string" ||
      !author ||
      typeof author.username !== "string"
    ) return [];
    return [{
      id: value.id,
      author_id: value.author_id,
      title: value.title,
      content: value.content,
      category: value.category,
      language: value.language,
      created_at: value.created_at,
      author: { username: author.username, display_name: typeof author.display_name === "string" ? author.display_name : null },
    }];
  });
}

export function isSafePostId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validatePostInput(input: {
  title: unknown;
  content: unknown;
  category: unknown;
  language: unknown;
}) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";

  if (title.length < 1 || title.length > 120) return { error: "invalid_title" as const };
  if (content.length < 1 || content.length > 5000) return { error: "invalid_content" as const };
  if (!isPostCategory(input.category)) return { error: "invalid_category" as const };
  if (input.language !== "CN" && input.language !== "KR") return { error: "invalid_language" as const };

  return { error: null, title, content, category: input.category, language: input.language };
}

export function postAvatarInitial(author: { username: string; display_name: string | null }) {
  const source = author.display_name?.trim() || author.username.trim();
  return Array.from(source)[0] || "K";
}

export function formatPostDate(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "KR" ? "ko-KR" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
