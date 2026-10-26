"use client";

import { useState } from "react";
import { marketQuery, parseMarketParams, searchToParams, type MarketState } from "@/features/market/market-params";

// On a browser back/forward the view can remount with the props of its first render, while the URL already
// carries the later selection, so the URL wins whenever it has market params. On first load both agree.
function fromLocation(initial: MarketState): MarketState {
  if (typeof window === "undefined") return initial;
  const params = searchToParams(window.location.search);
  return "sign" in params || "source" in params || "range" in params ? parseMarketParams(params) : initial;
}

export function useMarketState(initial: MarketState): [MarketState, (patch: Partial<MarketState>) => void] {
  const [state, setState] = useState(() => fromLocation(initial));
  const update = (patch: Partial<MarketState>) => {
    const next = { ...state, ...patch };
    setState(next);
    window.history.replaceState(null, "", window.location.pathname + marketQuery(next));
  };
  return [state, update];
}
