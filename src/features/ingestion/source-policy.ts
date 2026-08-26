import * as holidayJp from "@holiday-jp/holiday_jp";
import type { Source } from "@/features/fortune/domain";

export function isSourceExpected(source: Source, date: string): boolean {
  if (source === "gogo") {
    return true;
  }

  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return !isWeekend && !holidayJp.isHoliday(date);
}
