import { describe, expect, it } from "vitest";
import { LANGUAGE_COOKIE, languageCookieString, parseLanguage, sanitizeReturnPath } from "@/features/market/language";

describe("language persistence", () => {
  it("accepts only supported languages and defaults to Japanese", () => {
    expect(parseLanguage("ko")).toBe("ko");
    expect(parseLanguage("en")).toBe("en");
    for (const value of ["fr", "", "KO", "ja; en", undefined]) expect(parseLanguage(value)).toBe("ja");
  });

  it("writes a site-wide, year-long, lax cookie", () => {
    expect(LANGUAGE_COOKIE).toBe("rm-lang");
    expect(languageCookieString("ko")).toBe("rm-lang=ko; Path=/; Max-Age=31536000; SameSite=Lax");
  });
});

describe("sanitizeReturnPath", () => {
  it("keeps same-site paths with their query and hash", () => {
    expect(sanitizeReturnPath("/board?sign=leo")).toBe("/board?sign=leo");
    expect(sanitizeReturnPath("/?sign=libra&source=ohaasa&range=1m")).toBe("/?sign=libra&source=ohaasa&range=1m");
    expect(sanitizeReturnPath("/board#stamps")).toBe("/board#stamps");
  });

  it("rejects external, protocol-relative, and malformed targets", () => {
    for (const value of [
      "//evil.com", "https://evil.com", "/\\evil", "\\\\evil.com", "javascript:alert(1)",
      "evil.com", "", " /board", undefined, null,
    ]) expect(sanitizeReturnPath(value), String(value)).toBe("/");
  });

  // Decoded `return` values that WHATWG URL parsing (browsers, Next's router) would turn into another origin.
  it("rejects forms that URL normalization turns into an external destination", () => {
    for (const value of [
      "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\u0000/evil.com", "/ /evil.com",
      "/.//evil.com", "/%2e//evil.com", "/%2E//evil.com", "/./\\evil.com", "/a/..//evil.com",
      "/　/evil.com",
    ]) expect(sanitizeReturnPath(value), JSON.stringify(value)).toBe("/");
  });

  it("only ever returns a path that resolves to the same origin", () => {
    for (const value of ["/board", "/%2F%2Fevil.com", "/board?return=//evil.com", "/..", "/a/../board"]) {
      const result = sanitizeReturnPath(value);
      expect(result.startsWith("/") && !result.startsWith("//"), result).toBe(true);
      expect(new URL(result, "https://oohaasa.example").origin).toBe("https://oohaasa.example");
    }
    expect(sanitizeReturnPath("/a/../board")).toBe("/board");
  });
});
