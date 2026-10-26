import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from "@/features/market/i18n";

export const LANGUAGE_COOKIE = "rm-lang";

export function parseLanguage(value: string | undefined): Language {
  return LANGUAGES.find((lang) => lang === value) ?? DEFAULT_LANGUAGE;
}

export function languageCookieString(lang: Language): string {
  return `${LANGUAGE_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

// Browser only: called from the language page's click handler.
export function rememberLanguage(lang: Language): void {
  document.cookie = languageCookieString(lang);
}

const PROBE_ORIGIN = "https://same-site.invalid";

// Returns a same-site path, normalized the way browsers and Next's router resolve it, or "/".
// URL parsing drops tabs/newlines, treats "\" as "/" and collapses dot segments, so e.g. "/\t/x.com" and
// "/.//x.com" would otherwise become the protocol-relative "//x.com".
export function sanitizeReturnPath(value: string | null | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return "/";
  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return "/";
  }
  if (url.origin !== PROBE_ORIGIN || url.pathname.startsWith("//")) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
