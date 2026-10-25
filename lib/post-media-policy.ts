export const MEDIA_TEST_URL = "https://kirvcbkbkvotnsqnbcyf.supabase.co";
export const MEDIA_PRODUCTION_URL = "https://czcyarmramlpmilfhpqo.supabase.co";
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_MAX_PIXELS = 4 * 1024 * 1024;
export const MEDIA_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
// Shared by the application and BOTH Edge entry points. Provider/server config only.
// A URL alone is not an environment declaration; no implicit test/development fallback.
export function mediaEnvironment(env: Record<string, string | undefined>): "test" | "production" | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const deployment = env.KCNY_MEDIA_DEPLOYMENT_ENV;
  if (!deployment || !env.KCNY_MEDIA_ENVIRONMENT) return null;
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL !== env.SUPABASE_URL) return null;
  if (env.VERCEL_ENV && env.VERCEL_ENV !== deployment) return null;
  if (url === MEDIA_TEST_URL && env.KCNY_MEDIA_ENVIRONMENT === "test" && ["development", "preview"].includes(deployment)) return "test";
  if (url === MEDIA_PRODUCTION_URL && deployment === "production" && env.KCNY_MEDIA_ENVIRONMENT === "production") return "production";
  return null;
}
export function mediaReadsAvailable(env: Record<string, string | undefined>) {
  return mediaEnvironment(env) !== null;
}
export function mediaWritesAvailable(env: Record<string, string | undefined>) {
  return mediaReadsAvailable(env) && env.KCNY_POST_IMAGES_ENABLED === "true";
}
export function mediaUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function mediaFileError(size: number, mime: string) {
  if (!Number.isInteger(size) || size < 1 || size > MEDIA_MAX_BYTES) return "file_size";
  if (!(MEDIA_MIMES as readonly string[]).includes(mime)) return "file_type";
  return null;
}
export function imageSignature(bytes: Uint8Array) {
  if (bytes.length < 12 || bytes.length > MEDIA_MAX_BYTES) throw Error("file_size");
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    if (bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw Error("image_corrupt");
    return "image/jpeg";
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.slice(0, 8).every((v, i) => v === [137,80,78,71,13,10,26,10][i])) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset), kind = ascii(offset + 4, offset + 8);
      if (kind === "acTL") throw Error("image_animated");
      offset += length + 12;
      if (offset > bytes.length) throw Error("image_corrupt");
      if (kind === "IEND") { if (offset !== bytes.length) throw Error("image_corrupt"); return "image/png"; }
    }
    throw Error("image_corrupt");
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(4, true) + 8 !== bytes.length) throw Error("image_corrupt");
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const kind = ascii(offset, offset + 4), length = view.getUint32(offset + 4, true);
      if (kind === "ANIM" || kind === "ANMF") throw Error("image_animated");
      offset += 8 + length + (length % 2);
      if (offset > bytes.length) throw Error("image_corrupt");
    }
    return "image/webp";
  }
  throw Error("file_type");
}
export function mediaErrorMessage(code: string, language: "CN" | "KR") {
  const kr = language === "KR";
  if (code === "file_size") return kr ? "이미지는 비어 있지 않은 5 MiB 이하 파일이어야 합니다." : "图片不能为空，且不能超过 5 MiB。";
  if (code === "file_type" || code === "image_mime") return kr ? "JPEG, PNG, WebP만 지원합니다. 확장자만 변경하지 마세요." : "仅支持 JPEG、PNG、WebP，请勿仅修改扩展名伪装格式。";
  if (code.startsWith("image_") || code === "invalid_validated_image") return kr ? "이미지를 확인할 수 없습니다. 정상적인 정지 이미지(최대 4백만 픽셀)를 선택하세요. 기존 이미지는 유지됩니다." : "图片校验失败，请选择有效静态图片（最多 419 万像素）。原有图片保持不变。";
  if (code === "authentication_required") return kr ? "로그인이 만료되었습니다. 다시 로그인하세요. 글은 보관됩니다." : "登录已失效，请重新登录。文字草稿仍保留。";
  if (code === "media_disabled") return kr ? "이미지 업로드가 현재 꺼져 있습니다. 일반 텍스트는 계속 사용할 수 있습니다." : "图片上传当前关闭，纯文字功能仍可使用。";
  if (code === "rate_limited") return kr ? "요청이 많습니다. 잠시 후 다시 시도하세요." : "请求较多，请稍后重试。";
  if (code === "outcome_unknown") return kr ? "저장 결과를 아직 확인하지 못했습니다. 입력은 유지됩니다. 잠시 후 같은 요청으로 다시 확인하세요." : "暂时无法确认保存结果，输入已保留。请稍后使用同一请求重试核对。";
  return kr ? "처리하지 못했습니다. 글과 기존 이미지는 유지됩니다. 다시 시도하세요." : "处理失败，文字和原有图片已保留，请重试。";
}
export function mediaSavedMessage(pending: boolean, language: "CN" | "KR") {
  return language === "KR" ? pending ? "이미지 변경은 저장되었습니다. 이전 파일 정리는 대기 중이며 다시 시도할 수 있습니다." : "이미지 변경을 저장했습니다."
    : pending ? "图片变更已保存；旧文件清理待重试，不影响本次保存。" : "图片变更已保存。";
}
