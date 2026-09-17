"use client";

import { addSongs, hydrateFromBackend, librarySize, removeGenerated } from "./store";
import { generateSongs } from "./seed";
import { pushToast } from "@/lib/ui-store";

/* First open: a reviewer should land in a library they can search, filter
   and sort straight away, not in front of an empty table. So the very first
   time there is nothing anywhere (no rows in the database, nothing cached in
   this browser) the three hundred generated songs are loaded, flagged as
   generated and removable in one click. It happens once: clear the library
   and it stays clear, which is how the empty state is reached. */
const DEMO_KEY = "songscription.demo-loaded.v1";
export const DEMO_COUNT = 300;

let booted = false;

export async function bootLibrary() {
  if (booted) return;
  booted = true;
  await hydrateFromBackend();
  if (librarySize() > 0 || window.localStorage.getItem(DEMO_KEY)) return;
  try {
    const list = await generateSongs(DEMO_COUNT, null);
    if (librarySize() > 0) return;
    addSongs(list);
    window.localStorage.setItem(DEMO_KEY, new Date().toISOString());
    pushToast(`Loaded ${DEMO_COUNT} demo songs so there is a library to explore`, { label: "Start empty", onClick: () => removeGenerated() });
  } catch (e) {
    /* No demo data is not a failure of the app: the empty state takes over. */
    console.warn("[library] demo songs unavailable", e);
  }
}
