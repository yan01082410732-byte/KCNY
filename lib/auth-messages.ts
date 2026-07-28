import type { Language } from "./auth";

const messages: Record<Language, Record<string, string>> = {
  CN: {
    configuration: "认证服务暂时不可用，请稍后再试。",
    invalid_username: "用户名格式不正确。",
    invalid_display_name: "显示名称格式不正确。",
    invalid_email: "请输入有效的邮箱地址。",
    weak_password: "密码至少需要 8 个字符。",
    password_mismatch: "两次输入的密码不一致。",
    invalid_language: "语言参数无效。",
    invalid_password: "请输入密码。",
    auth_failed: "认证失败，请稍后再试。",
    resend_failed: "暂时无法重新发送验证邮件，请稍后再试。",
    missing_code: "邮箱验证链接缺失或已失效。",
    verification_failed: "邮箱验证失败，请重新登录或注册。",
    invalid_link: "链接无效。",
    unknown: "发生了安全错误，请稍后再试。",
  },
  KR: {
    configuration: "인증 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    invalid_username: "사용자 이름 형식이 올바르지 않습니다.",
    invalid_display_name: "표시 이름 형식이 올바르지 않습니다.",
    invalid_email: "올바른 이메일 주소를 입력해 주세요.",
    weak_password: "비밀번호는 8자 이상이어야 합니다.",
    password_mismatch: "비밀번호가 일치하지 않습니다.",
    invalid_language: "언어 값이 올바르지 않습니다.",
    invalid_password: "비밀번호를 입력해 주세요.",
    auth_failed: "인증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    resend_failed: "인증 이메일을 다시 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
    missing_code: "이메일 인증 링크가 없거나 만료되었습니다.",
    verification_failed: "이메일 인증에 실패했습니다. 다시 로그인하거나 가입해 주세요.",
    invalid_link: "링크가 올바르지 않습니다.",
    unknown: "보안 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  },
};

export function message(code: string | undefined, language: Language) {
  return messages[language][code || "unknown"] || messages[language].unknown;
}
