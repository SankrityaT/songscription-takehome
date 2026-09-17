"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Three hundred rows with a thumbnail each is too much to mount at once, so
   the list grows as you scroll: sixty rows, then sixty more when the end
   comes into view. Search and filters reset it, so results stay instant. */
export function useProgressive<T>(items: T[], page = 60) {
  const [limit, setLimit] = useState(page);
  const sentinel = useRef<HTMLDivElement>(null);
  const key = items.length;

  useEffect(() => {
    setLimit(page);
  }, [key, page]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || limit >= items.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((l) => Math.min(items.length, l + page));
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [limit, items.length, page]);

  const showAll = useCallback(() => setLimit(items.length), [items.length]);

  return { visible: items.slice(0, limit), remaining: Math.max(0, items.length - limit), sentinel, showAll };
}
