import type { Language } from "@/lib/auth";

export const SEARCH_TYPES = ["posts", "users"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

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
      };
}
