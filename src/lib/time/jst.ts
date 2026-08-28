const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
});

export function getJstDate(now: Date): string {
  return jstDateFormatter.format(now);
}
