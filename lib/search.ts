import type { Language } from "@/lib/auth";
import type { PostCategory } from "@/lib/posts";

export const SEARCH_TYPES = ["posts", "users"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const SEARCH_PAGE_SIZE = 20;
const SEARCH_POST_CATEGORIES: readonly PostCategory[] = ["culture", "language", "travel", "study", "daily", "other"];
export type SearchSort = "recent" | "relevant";
export type SearchFilters = { category?: PostCategory; postLanguage?: Language; sort?: SearchSort; before?: string };

export function searchHref(language: Language, type: SearchType, query: string, filters: SearchFilters = {}) {
  const params = new URLSearchParams({ lang: language, type, q: query });
  if (filters.category) params.set("category", filters.category);
  if (filters.postLanguage) params.set("postLanguage", filters.postLanguage);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.before) params.set("before", filters.before);
  return `/search?${params.toString()}`;
}

export function parseSearchFilters(params: Record<string, unknown>): SearchFilters {
  return {
    category: typeof params.category === "string" && SEARCH_POST_CATEGORIES.includes(params.category as PostCategory) ? params.category as PostCategory : undefined,
    postLanguage: params.postLanguage === "CN" || params.postLanguage === "KR" ? params.postLanguage : undefined,
    sort: params.sort === "relevant" ? "relevant" : "recent",
  };
}

export type SearchCursor = { phase: "r" | "t" | "b" | "u" | "d"; createdAt?: string; id?: string; username?: string };
const USERNAME_CURSOR = /^[A-Za-z0-9_\u4e00-\u9fff\uac00-\ud7af]{2,30}$/u;
export function parseSearchCursor(value: unknown, type: SearchType, sort: SearchSort): SearchCursor | undefined {
  if (typeof value !== "string" || value.length > 120) return undefined;
  const [phase, ...parts] = value.split("|");
  if (type === "users") {
    if (phase === "d" && parts.length === 0) return { phase: "d" };
    if ((phase === "u" || phase === "d") && parts.length === 1 && USERNAME_CURSOR.test(parts[0])) return { phase, username: parts[0] };
    return undefined;
  }
  if (sort === "relevant" && phase === "b" && parts.length === 0) return { phase: "b" };
  if ((sort === "recent" && phase !== "r") || (sort === "relevant" && phase !== "t" && phase !== "b")) return undefined;
  const [createdAt, id, extra] = parts;
  if (extra !== undefined || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(createdAt ?? "") || !Number.isFinite(Date.parse(createdAt))) return undefined;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id ?? "")) return undefined;
  return { phase: phase as "r" | "t" | "b", createdAt, id };
}

export function searchPage<T extends { id: string; created_at: string }>(rows: T[], size = SEARCH_PAGE_SIZE) {
  const items = rows.slice(0, size);
  const last = items.at(-1);
  return { items, hasMore: rows.length > size, last };
}

export function mergeRecentSearchRows<T extends { id: string; created_at: string }>(left: T[], right: T[]) {
  return mergeUniqueByKey([...left, ...right], "id").sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}

export function phaseSearchPage<T>(primary: T[], secondary: T[], size = SEARCH_PAGE_SIZE) {
  const first = primary.slice(0, size);
  const second = secondary.slice(0, size - first.length);
  return { items: [...first, ...second], primaryMore: primary.length > size, secondaryMore: secondary.length > second.length, primaryCount: first.length, secondaryCount: second.length };
}

export type PublicSearchProfile = {
  username: string;
  display_name: string | null;
};

export function isSearchType(value: unknown): value is SearchType {
  return typeof value === "string" && SEARCH_TYPES.includes(value as SearchType);
}

export function normalizeSearchQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function searchLikePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

export function toPublicSearchProfiles(rows: unknown[]): PublicSearchProfile[] {
  return rows.flatMap((row) => {
    const value = row as Record<string, unknown>;
    if (typeof value.username !== "string") return [];
    return [{
      username: value.username,
      display_name: typeof value.display_name === "string" ? value.display_name : null,
    }];
  });
}

export function mergeUniqueByKey<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const seen = new Set<unknown>();
  return rows.filter((row) => {
    const value = row[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function searchLabels(language: Language) {
  return language === "KR"
    ? {
        nav: "검색",
        eyebrow: "SEARCH",
        title: "KCNY 검색",
        description: "게시물과 회원을 찾아보세요.",
        placeholder: "검색어를 입력하세요",
        submit: "검색",
        posts: "게시물",
        users: "회원",
        results: "검색 결과",
        empty: "검색 결과가 없습니다.",
        emptyHelp: "다른 검색어를 입력해 보세요.",
        start: "게시물 제목·본문 또는 사용자 이름을 검색할 수 있습니다.",
        category: "분류", allCategories: "전체 분류", contentLanguage: "게시물 언어", allLanguages: "모든 언어", chinese: "중국어", korean: "한국어", sort: "정렬", recent: "최신순", relevant: "제목 우선", apply: "적용", more: "더 보기", error: "검색 결과를 불러오지 못했습니다.", retry: "다시 시도", loading: "검색 결과를 불러오는 중…",
      }
    : {
        nav: "搜索",
        eyebrow: "SEARCH",
        title: "搜索 KCNY",
        description: "查找帖子和社区成员。",
        placeholder: "输入搜索内容",
        submit: "搜索",
        posts: "帖子",
        users: "用户",
        results: "搜索结果",
        empty: "没有找到相关结果。",
        emptyHelp: "试试其他关键词。",
        start: "可搜索帖子标题、正文、用户名和显示名称。",
        category: "分类", allCategories: "全部分类", contentLanguage: "帖子语言", allLanguages: "全部语言", chinese: "中文", korean: "韩文", sort: "排序", recent: "最新", relevant: "标题优先", apply: "应用", more: "加载更多", error: "无法加载搜索结果。", retry: "重试", loading: "正在加载搜索结果…",
      };
}
