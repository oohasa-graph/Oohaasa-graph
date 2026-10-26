"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ZodiacCode } from "@/features/fortune/domain";
import { Mochi } from "@/features/market/components/mochi";
import { TopBar } from "@/features/market/components/top-bar";
import { messages, type Language } from "@/features/market/i18n";
import { rememberLanguage, sanitizeReturnPath } from "@/features/market/language";
import styles from "@/features/market/market.module.css";

const OPTIONS: [Language, ZodiacCode, string][] = [["en", "aries", "Hello!"], ["ja", "libra", "こんにちは！"], ["ko", "pisces", "안녕하세요!"]];

export function LanguageView({ lang, returnPath }: { lang: Language; returnPath: string }) {
  const router = useRouter(), target = sanitizeReturnPath(returnPath);
  const choose = (next: Language) => {
    rememberLanguage(next);
    router.replace(target);
    router.refresh();
  };
  return (
    <div className={styles.page}>
      <TopBar lang={lang} current="language" returnPath={target} />
      <main className={styles.langpage}>
        <Link className={styles.back} href={target}>{messages[lang].back}</Link>
        <div className={styles.langhero} aria-hidden="true">
          <span><Mochi sign="leo" rank={2} size={78} /></span>
          <span><Mochi sign="libra" rank={1} size={96} /></span>
          <span><Mochi sign="aquarius" rank={2} size={78} /></span>
        </div>
        <h1>☆ Rank Market</h1>
        <p className={styles.langsub}>
          {OPTIONS.map(([code], i) => <span key={code} lang={code}>{i > 0 && <br />}{messages[code].langTitle}</span>)}
        </p>
        <div className={styles.langopts}>
          {OPTIONS.map(([code, sign, greeting]) => (
            <button
              key={code} type="button" lang={code} className={styles.langopt}
              aria-current={code === lang ? "true" : undefined} onClick={() => choose(code)}
            >
              <Mochi sign={sign} rank={2} size={58} />
              <b>{messages[code].languageButton}</b>
              <span>{greeting}</span>
            </button>
          ))}
        </div>
        <p className={styles.langnote}>{OPTIONS.map(([code]) => messages[code].langNote).join(" · ")}</p>
      </main>
    </div>
  );
}
