import { ZODIAC_CODES, type ZodiacCode } from "@/features/fortune/domain";
import type { RankHistoryPoint, RankMovement } from "@/features/rank-market/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getMovement(input: {
  currentRank: number;
  previousRank: number;
}): RankMovement {
  const delta = input.previousRank - input.currentRank;
  return {
    places: Math.abs(delta),
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
  };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildCalendarHistory(
  startDate: string,
  endDate: string,
  captured: RankHistoryPoint[],
): RankHistoryPoint[] {
  const capturedByDate = new Map(captured.map((point) => [point.date, point.rank]));
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const history: RankHistoryPoint[] = [];

  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const date = toIsoDate(cursor);
    history.push({ date, rank: capturedByDate.get(date) ?? null });
  }

  return history;
}

export function getTopThreeStreak(history: RankHistoryPoint[]): number {
  let streak = 0;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const rank = history[index].rank;
    if (rank === null) {
      continue;
    }
    if (rank > 3) {
      break;
    }
    streak += 1;
  }

  return streak;
}

export function getBiggestMover(
  movements: Partial<Record<ZodiacCode, RankMovement | null>>,
): ZodiacCode | null {
  let biggest: ZodiacCode | null = null;
  let biggestMovement: RankMovement | null = null;

  for (const zodiacCode of ZODIAC_CODES) {
    const movement = movements[zodiacCode];
    if (!movement || movement.places === 0) {
      continue;
    }

    if (
      !biggestMovement ||
      movement.places > biggestMovement.places ||
      (movement.places === biggestMovement.places &&
        movement.direction === "up" &&
        biggestMovement.direction !== "up")
    ) {
      biggest = zodiacCode;
      biggestMovement = movement;
    }
  }

  return biggest;
}
