import type { FortuneScores, ParsedFortune, Source, WinnerCategory, ZodiacCode } from "@/features/fortune/domain";
import { RankBadge, SectionHeading } from "@/features/market/components/market-bits";
import { Mochi } from "@/features/market/components/mochi";
import { formatRank, messages, sourceName, type Language, type MessageKey } from "@/features/market/i18n";
import styles from "@/features/market/market.module.css";
import { signName } from "@/features/market/signs";

const SCORE_KEYS: Record<keyof FortuneScores, MessageKey> = {
  money: "scoreMoney", love: "scoreLove", work: "scoreWork", health: "scoreHealth",
};
const WINNER_KEYS: Record<WinnerCategory, MessageKey> = { overall: "overall", ...SCORE_KEYS };

// The show's own text is shown exactly as stored, in Japanese, in every interface language.
export function FortuneCard({ lang, source, sign, entry }: {
  lang: Language; source: Source; sign: ZodiacCode; entry: ParsedFortune | null;
}) {
  const t = messages[lang];
  return (
    <section className={styles.card}>
      <SectionHeading lang={lang} k="fortune" />
      {entry ? (
        <>
          <div className={styles.fortuneHead}>
            <Mochi sign={sign} rank={entry.rank} size={40} />
            <span>{signName(lang, sign)} · {sourceName(lang, source)}</span>
            <RankBadge lang={lang} rank={entry.rank} />
          </div>
          <p className={styles.fortuneText} lang="ja">{entry.comment}</p>
          {lang !== "ja" && <p className={styles.originalNote}>{t.originalText}</p>}
          <dl className={styles.lucky}>
            {source === "ohaasa" && entry.luckyHint && <><dt>{t.luckyHint}</dt><dd lang="ja">{entry.luckyHint}</dd></>}
            {source === "gogo" && entry.luckyColor && <><dt>{t.luckyColor}</dt><dd lang="ja">{entry.luckyColor}</dd></>}
            {source === "gogo" && entry.luckyKey && <><dt>{t.luckyKey}</dt><dd lang="ja">{entry.luckyKey}</dd></>}
            {source === "gogo" && (Object.keys(SCORE_KEYS) as (keyof FortuneScores)[]).map((key) => {
              const label = t[SCORE_KEYS[key]] as string, score = entry.scores[key];
              const filled = score === null ? 0 : Math.max(0, Math.min(5, score));
              return (
                <div key={key} style={{ display: "contents" }}>
                  <dt>{label}</dt>
                  <dd className={styles.hearts} aria-label={`${label} ${score === null ? "−" : `${filled}/5`}`}>
                    {score === null ? "−" : <>{"♥".repeat(filled)}<span>{"♥".repeat(5 - filled)}</span></>}
                  </dd>
                </div>
              );
            })}
          </dl>
          {source === "gogo" && entry.winnerCategories.length > 0 && (
            <div className={styles.winners}>
              {entry.winnerCategories.map((category) => (
                <span key={category} className={styles.hanko}>{`${t[WINNER_KEYS[category]]} ${formatRank(lang, 1)}`}</span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className={styles.empty}>{t.noData}</p>
      )}
    </section>
  );
}
