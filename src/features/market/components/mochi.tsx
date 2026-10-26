import type { ZodiacCode } from "@/features/fortune/domain";
import { moodFor } from "@/features/market/metrics";
import { SIGN_META, pastelColor } from "@/features/market/signs";

const INK = "#4b3a34";
const stroke = { stroke: INK, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Original character (prototype geometry): a round mochi in the sign's pastel color; the face follows the rank.
export function Mochi({ sign, rank, size, label, className }: {
  sign: ZodiacCode; rank: number | null; size: number; label?: string; className?: string;
}) {
  const mood = moodFor(rank);
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg
      width={size} height={(size * 14) / 15} viewBox="0 0 60 56" data-mood={mood} focusable="false"
      className={className} style={{ display: "inline-block", verticalAlign: "middle", overflow: "visible", flex: "none" }}
      {...a11y}
    >
      <path data-part="body" d="M7 36 C7 17 19 9 30 9 C41 9 53 17 53 36 C53 47 45 51 30 51 C15 51 7 47 7 36 Z" fill={pastelColor(sign)} {...stroke} />
      <text x="30" y="22" textAnchor="middle" fontSize="10" fill={INK} opacity=".45">{SIGN_META[sign].glyph}</text>
      <ellipse cx="16.5" cy="37" rx="4.5" ry="2.8" fill="#ff9fb8" opacity=".75" />
      <ellipse cx="43.5" cy="37" rx="4.5" ry="2.8" fill="#ff9fb8" opacity=".75" />
      {mood === "star" || mood === "happy" ? (
        <>
          <path d="M18 31 q4 -5 8 0 M34 31 q4 -5 8 0" fill="none" {...stroke} />
          <path d="M25 37 q5 7 10 0 z" fill="#e8607d" {...stroke} />
        </>
      ) : mood === "calm" ? (
        <>
          <circle cx="22" cy="30" r="2.8" fill={INK} />
          <circle cx="38" cy="30" r="2.8" fill={INK} />
          <circle cx="22.9" cy="29" r="0.9" fill="#fff" />
          <circle cx="38.9" cy="29" r="0.9" fill="#fff" />
          <path d="M25 37 q2.5 3 5 0 q2.5 3 5 0" fill="none" {...stroke} />
        </>
      ) : (
        <>
          <path d="M17 29 l7 2.5 M43 29 l-7 2.5" fill="none" {...stroke} />
          <path d="M26 41 q4 -3.5 8 0" fill="none" {...stroke} />
          <path data-part="sweat" d="M49 15 q-4 6 0 8 q4 -2 0 -8 z" fill="#9fd0ff" stroke={INK} strokeWidth="1.6" />
        </>
      )}
      {mood === "star" && (
        <g data-part="crown">
          <path d="M20 11 l3 -9 l7 6 l7 -6 l3 9 z" fill="#ffd34d" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M53 8 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill="#ffd34d" />
        </g>
      )}
    </svg>
  );
}
