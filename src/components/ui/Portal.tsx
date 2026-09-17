"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* Anything fixed to the viewport must live outside the glass panels: a
   backdrop-filter turns its element into the containing block for fixed
   descendants, which silently offsets them by the panel's position. */
export function Portal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return createPortal(children, document.body);
}
