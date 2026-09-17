"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface Greeting {
  /** "morning", "afternoon", "evening", "night" */
  partOfDay: string;
  /** "Wednesday" */
  weekday: string;
}

const FALLBACK: Greeting = { partOfDay: "", weekday: "" };

/* Time of day lives on the client. The server renders nothing for it and
   the layout effect fills it in before the first paint, so there is no
   visible flicker and no hydration mismatch. */
export function useGreeting(): Greeting {
  const [greeting, setGreeting] = useState<Greeting>(FALLBACK);
  useIsoLayoutEffect(() => {
    const now = new Date();
    const h = now.getHours();
    const partOfDay = h < 5 ? "night" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    setGreeting({ partOfDay, weekday });
  }, []);
  return greeting;
}
