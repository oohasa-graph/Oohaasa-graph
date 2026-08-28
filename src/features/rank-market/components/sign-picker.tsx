import { ZODIAC_CODES, type ZodiacCode } from "@/features/fortune/domain";
import styles from "@/features/rank-market/rank-market.module.css";

export const ZODIAC_LABELS: Record<ZodiacCode, string> = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces",
};

export function SignPicker({
  selected,
  onSelect,
}: {
  selected: ZodiacCode;
  onSelect: (zodiac: ZodiacCode) => void;
}) {
  return (
    <div className={styles.signPicker} aria-label="Choose zodiac sign">
      {ZODIAC_CODES.map((zodiacCode) => (
        <button
          key={zodiacCode}
          type="button"
          className={zodiacCode === selected ? styles.signButtonActive : styles.signButton}
          aria-pressed={zodiacCode === selected}
          onClick={() => onSelect(zodiacCode)}
        >
          {ZODIAC_LABELS[zodiacCode]}
        </button>
      ))}
    </div>
  );
}
