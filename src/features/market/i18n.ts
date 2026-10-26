import type { Source } from "@/features/fortune/domain";
import type { MarketRange } from "@/features/market/types";

export const LANGUAGES = ["ja", "en", "ko"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "ja";

// Interface copy only. Fortune text from the shows is rendered as stored and never passes through here.
const en = {
  brandA: "Uranai Stock Exchange", brandC: "Zodiac Market Board",
  watch: "Today's board", chart: "Rank chart", gainers: "Top gainers ↗", losers: "Top losers ↘", streaks: "Hot streaks",
  race: "Rank race", stampcal: "Stamp calendar",
  thSign: "Sign", thRank: "Rank", thChg: "Chg", thHiLo: "Best/Worst", vsYesterday: "vs yesterday",
  avg: "AVG", best: "BEST", ones: "#1", swing: "SWING",
  hint: "Tap to open the market board ↗", back: "← Main", main: "Main", board: "Market board",
  sameSign: "same sign", starDay: "★ = #1 day", higher: "higher is better", noStreak: "No streaks right now",
  mvp: "Weekly MVP", cheer: "Hang in there", king: "#1 King", chip: "Blue chip",
  vsLastWeek: "vs last week", ones3m: "#1 in 3 months", avg3m: "3-month average", close: "close",
  raceHint: "tap a character to follow it", calHint: "one stamp per morning",
  top: "Top", middle: "Middle", bottom: "Bottom",
  mood: ["#1! Hooray ✦", "Feeling good ♪", "Pretty normal day", "Taking it slow~", "A little gloomy…", "Tomorrow we rise…!"],
  fortune: "Today's fortune", luckyHint: "Lucky item", luckyColor: "Lucky color", luckyKey: "Lucky key",
  scoreMoney: "Money", scoreLove: "Love", scoreWork: "Work", scoreHealth: "Health", overall: "Overall",
  noData: "No data yet", langTitle: "Choose your language", langNote: "Change it anytime from the top bar",
  languageButton: "English", source: "Show", range: "Range",
  coverage: (covered: number, expected: number) => `${covered}/${expected} mornings`,
  stale: (date: string) => `Data from ${date} JST`,
  times: (n: number) => `${n}×`,
  streakDays: (n: number) => `${n} days in a row ✦`,
};

export type Messages = typeof en;
export type MessageKey = { [K in keyof Messages]: Messages[K] extends string ? K : never }[keyof Messages];

const ja: Messages = {
  brandA: "うらない証券取引所", brandC: "星座ランキング市場",
  watch: "今日の銘柄", chart: "順位チャート", gainers: "急上昇 ↗", losers: "急降下 ↘", streaks: "連続トップ3",
  race: "順位レース", stampcal: "スタンプカレンダー",
  thSign: "星座", thRank: "順位", thChg: "前日比", thHiLo: "最高/最低", vsYesterday: "前日比",
  avg: "平均", best: "最高", ones: "1位", swing: "ゆれ",
  hint: "タップで市場ボードへ ↗", back: "← メインへ", main: "メイン", board: "市場ボード",
  sameSign: "同じ星座", starDay: "★ = 1位の日", higher: "上ほど良い順位", noStreak: "いまは連続ランクインなし",
  mvp: "今週のMVP", cheer: "がんばれ賞", king: "1位王", chip: "安定株",
  vsLastWeek: "先週より", ones3m: "3か月で1位", avg3m: "3か月の平均", close: "終値",
  raceHint: "キャラをタップして追いかけよう", calHint: "毎朝ひとつスタンプ",
  top: "上位", middle: "まんなか", bottom: "下位",
  mood: ["1位だよ！やったー ✦", "いい感じ〜♪", "まあまあ、ふつう日和", "のんびりいこう〜", "ちょっと しょんぼり…", "明日はきっと上がる…！"],
  fortune: "今日の運勢", luckyHint: "ラッキーアイテム", luckyColor: "ラッキーカラー", luckyKey: "幸運のカギ",
  scoreMoney: "金運", scoreLove: "恋愛運", scoreWork: "仕事運", scoreHealth: "健康運", overall: "総合",
  noData: "まだデータがありません", langTitle: "ことばをえらんでね", langNote: "あとで上のバーから変えられます",
  languageButton: "日本語", source: "番組", range: "期間",
  coverage: (covered, expected) => `${covered}/${expected}朝`,
  stale: (date) => `${date}（JST）のデータ`,
  times: (n) => `${n}回`,
  streakDays: (n) => `${n}日連続 ✦`,
};

const ko: Messages = {
  brandA: "운세 증권거래소", brandC: "별자리 랭킹 시장",
  watch: "오늘의 종목", chart: "순위 차트", gainers: "급상승 ↗", losers: "급하락 ↘", streaks: "연속 톱3",
  race: "순위 레이스", stampcal: "스탬프 캘린더",
  thSign: "별자리", thRank: "순위", thChg: "전일비", thHiLo: "최고/최저", vsYesterday: "전일비",
  avg: "평균", best: "최고", ones: "1위", swing: "변동",
  hint: "탭해서 시장 보드로 ↗", back: "← 메인으로", main: "메인", board: "시장 보드",
  sameSign: "같은 별자리", starDay: "★ = 1위한 날", higher: "위로 갈수록 좋은 순위", noStreak: "지금은 연속 랭크인 없음",
  mvp: "이번 주 MVP", cheer: "힘내라상", king: "1위왕", chip: "우량주",
  vsLastWeek: "지난주 대비", ones3m: "3개월간 1위", avg3m: "3개월 평균", close: "종가",
  raceHint: "캐릭터를 탭해서 따라가 보세요", calHint: "아침마다 스탬프 하나",
  top: "상위", middle: "중간", bottom: "하위",
  mood: ["1위다! 야호 ✦", "기분 좋아~♪", "그럭저럭 평범한 날", "느긋하게 가자~", "조금 시무룩…", "내일은 꼭 오를 거야…!"],
  fortune: "오늘의 운세", luckyHint: "행운의 아이템", luckyColor: "행운의 색", luckyKey: "행운의 열쇠",
  scoreMoney: "금전운", scoreLove: "연애운", scoreWork: "업무운", scoreHealth: "건강운", overall: "종합",
  noData: "아직 데이터가 없어요", langTitle: "언어를 골라 주세요", langNote: "상단 바에서 언제든 바꿀 수 있어요",
  languageButton: "한국어", source: "방송", range: "기간",
  coverage: (covered, expected) => `${covered}/${expected} 아침`,
  stale: (date) => `${date}(JST) 데이터`,
  times: (n) => `${n}회`,
  streakDays: (n) => `${n}일 연속 ✦`,
};

export const messages: Record<Language, Messages> = { ja, en, ko };

const SOURCE_NAMES: Record<Source, Record<Language, string>> = {
  ohaasa: { ja: "おはあさ", en: "Ohaasa", ko: "오하아사" },
  gogo: { ja: "ゴーゴー", en: "Gogo", ko: "고고" },
};
const RANGE_LABELS: Record<MarketRange, Record<Language, string>> = {
  "1w": { ja: "1週", en: "1W", ko: "1주" },
  "1m": { ja: "1か月", en: "1M", ko: "1개월" },
  "3m": { ja: "3か月", en: "3M", ko: "3개월" },
  all: { ja: "ぜんぶ", en: "ALL", ko: "전체" },
};

export function formatRank(lang: Language, rank: number | string): string {
  return lang === "en" ? `#${rank}` : `${rank}${lang === "ja" ? "位" : "위"}`;
}

export const sourceName = (lang: Language, source: Source) => SOURCE_NAMES[source][lang];
export const rangeLabel = (lang: Language, range: MarketRange) => RANGE_LABELS[range][lang];

// Small second-language label: English under Japanese, Japanese under English and Korean.
export function flavor(lang: Language, key: MessageKey): string {
  return lang === "ja" ? messages.en[key].toUpperCase() : messages.ja[key];
}

export const moodLine = (lang: Language, index: 0 | 1 | 2 | 3 | 4 | 5) => messages[lang].mood[index];
