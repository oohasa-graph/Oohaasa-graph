import { ZODIAC_CODES, type ZodiacCode } from "@/features/fortune/domain";
import type { Language } from "@/features/market/i18n";

type SignMeta = { ticker: string; glyph: string; hue: number; names: Record<Language, string> };

const ROWS: [ticker: string, glyph: string, ja: string, ko: string][] = [
  ["ARI", "♈", "おひつじ座", "양자리"], ["TAU", "♉", "おうし座", "황소자리"], ["GEM", "♊", "ふたご座", "쌍둥이자리"],
  ["CAN", "♋", "かに座", "게자리"], ["LEO", "♌", "しし座", "사자자리"], ["VIR", "♍", "おとめ座", "처녀자리"],
  ["LIB", "♎", "てんびん座", "천칭자리"], ["SCO", "♏", "さそり座", "전갈자리"], ["SAG", "♐", "いて座", "궁수자리"],
  ["CAP", "♑", "やぎ座", "염소자리"], ["AQU", "♒", "みずがめ座", "물병자리"], ["PIS", "♓", "うお座", "물고기자리"],
];

// U+FE0E keeps the glyphs as text, not emoji.
export const SIGN_META = Object.fromEntries(ZODIAC_CODES.map((code, i) => {
  const [ticker, glyph, ja, ko] = ROWS[i];
  const en = code[0].toUpperCase() + code.slice(1);
  return [code, { ticker, glyph: `${glyph}︎`, hue: i * 30, names: { ja, en, ko } }];
})) as Record<ZodiacCode, SignMeta>;

export const lineColor = (code: ZodiacCode) => `hsl(${SIGN_META[code].hue} 70% 64%)`;
export const pastelColor = (code: ZodiacCode) => `hsl(${SIGN_META[code].hue} 92% 87%)`;
export const signName = (lang: Language, code: ZodiacCode) => SIGN_META[code].names[lang];
