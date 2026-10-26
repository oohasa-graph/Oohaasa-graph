import Link from "next/link";
import { messages, type Language } from "@/features/market/i18n";
import styles from "@/features/market/market.module.css";

export function TopBar({ lang, current, returnPath }: {
  lang: Language; current: "main" | "board" | "language"; returnPath: string;
}) {
  const t = messages[lang];
  return (
    <nav className={styles.bar}>
      <span className={styles.barTitle}>☆ Rank Market</span>
      {current !== "language" && (
        <>
          <span className={styles.crumb}>{current === "board" ? `${t.main} › ${t.board}` : t.main}</span>
          <Link className={styles.langButton} href={`/language?return=${encodeURIComponent(returnPath)}`}>
            あ/A {t.languageButton} ▾
          </Link>
        </>
      )}
    </nav>
  );
}
