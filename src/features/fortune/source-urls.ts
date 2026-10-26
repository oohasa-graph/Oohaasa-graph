import type { Source } from "./domain";

export const SOURCE_URLS: Readonly<Record<Source, string>> = Object.freeze({
  ohaasa: "https://www.asahi.co.jp/data/ohaasa2020/horoscope.json",
  gogo: "https://www.tv-asahi.co.jp/goodmorning/uranai/",
});
