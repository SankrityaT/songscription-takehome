"use client";

import { useSyncExternalStore } from "react";

/* "See my design decisions": numbered notes pinned to the live interface,
   each answering one of the questions the brief asks, in the place where the
   answer was built. Off by default. A note only shows while the thing it
   talks about is on screen, so the set changes with the state of the page
   (the empty library has different answers than three hundred songs). */

export interface DesignNote {
  id: string;
  /** the question from the brief this answers, in its words */
  asks: string;
  title: string;
  body: string;
  /** finds the element the note is pinned to; null while it is not on screen */
  find: () => Element | null;
}

const byText = (selector: string, text: string) => [...document.querySelectorAll(selector)].find((el) => el.textContent?.trim().startsWith(text)) ?? null;
const noted = (id: string) => document.querySelector(`[data-note="${id}"]`);

export const NOTES: DesignNote[] = [
  {
    id: "upload",
    asks: "How do we make the upload as smooth as possible?",
    title: "adding a song",
    body: "drop a midi file anywhere, or tap this button. you see it load step by step. if something breaks, it tells you why and gives you one button to fix it. added the same song twice? it catches that too.",
    find: () => noted("upload") ?? byText("button", "Add song"),
  },
  {
    id: "search",
    asks: "As the catalogue grows, how does someone find the song?",
    title: "search like you talk",
    body: "type a name. or just say what you want, like “easy in c major”. it shows you what it understood as little tags. press / to jump here.",
    find: () => noted("search") ?? document.getElementById("library-search")?.closest("label") ?? null,
  },
  {
    id: "scope",
    asks: "Search? Filter? Sort? Recently played? Favorites?",
    title: "quick filters",
    body: "favorites and recently played are just filters. mix them with level, key and hands. the numbers show how many songs you'll get.",
    find: () => noted("scope") ?? document.querySelector('[role="radiogroup"][aria-label="Scope"]'),
  },
  {
    id: "pick",
    asks: "What if they don't know what they want to practice today?",
    title: "can't decide? let it pick",
    body: "one tap picks a song and tells you why. it just scrolls to it. you can always say no.",
    find: () => noted("pick") ?? byText("button", "Pick for me"),
  },
  {
    id: "ear",
    asks: "Something else?",
    title: "hum it, like shazam",
    body: "know the tune but not the name? hum or tap a few notes and it finds the song. any key works, so no need to sing it right.",
    find: () => noted("ear") ?? byText("button", "Find by ear"),
  },
  {
    id: "rows",
    asks: "How do you make it easy to tell songs apart?",
    title: "every song has its own look",
    body: "the little picture is the song's real notes. green is right hand, blue is left. key, tempo, length and level sit side by side so they're easy to compare. dotted line under a key means we guessed it.",
    find: () => noted("rows") ?? document.querySelector('[id^="song-"]'),
  },
  {
    id: "starters",
    asks: "What does the catalogue feel like with 0 items?",
    title: "empty, but not boring",
    body: "no songs yet? here are three to try. press play to listen, one tap to add. no blank page.",
    find: () => noted("starters") ?? document.getElementById("starters-heading"),
  },
  {
    id: "detail",
    asks: "What details are relevant to a learner of the song?",
    title: "the stuff you need to practice",
    body: "a bigger view of the notes. how fast, how long, how far your hands stretch, which hands play. practice opens the keyboard, listen just plays it. accuracy is blank for now, since nothing listens to you play yet.",
    find: () => noted("detail") ?? document.querySelector('[aria-label^="Details for"]'),
  },
  {
    id: "player",
    asks: "Creative problem solving: surprise us.",
    title: "play any song right here",
    body: "hit play and listen. slow it to 0.5× to learn it. open the keys to watch the notes fall on a piano. practice mode would live here.",
    find: () => noted("player") ?? document.querySelector('[aria-label="Now playing"] .glass-panel'),
  },
  {
    id: "folders",
    asks: "Tags? Folders?",
    title: "folders, kept simple",
    body: "group songs by book, exam or mood. one song, one folder, so you always know where it is. jump back in shows what you played. hover a song to take it off.",
    find: () => noted("folders") ?? byText("nav button", "Folders"),
  },
  {
    id: "size",
    asks: "With 0 items? With 3? With 300?",
    title: "try it empty, small or huge",
    body: "the brief asks how it feels with 0, 3 and 300 songs. so here's all three. it's a demo switch, and you can undo every tap.",
    find: () => noted("size") ?? document.querySelector('[aria-label="Library size"]')?.parentElement ?? null,
  },
  {
    id: "settings",
    asks: "What settings might a user want? What lives where?",
    title: "where settings live",
    body: "whole library stuff is here: list or grid, starting speed, where it saves. one song stuff (name, folder, favorite) is on the song. volume and speed stay on the player.",
    find: () => noted("settings") ?? byText("nav button", "Settings"),
  },
  {
    id: "saved",
    asks: "It must persist. How do you store and query the data?",
    title: "nothing gets lost",
    body: "refresh and it's all still here. songs save to supabase, midi files too. your browser keeps a copy, so it loads fast and works offline. if saving fails, this line tells you and gives you a sync button.",
    find: () => noted("saved") ?? document.querySelector('nav [role="status"]') ?? byText("nav button", "Saved"),
  },
];

const KEY = "songscription.design-notes";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useDesignNotes(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.sessionStorage.getItem(KEY) === "on",
    () => false,
  );
}

export function setDesignNotes(on: boolean) {
  if (on) window.sessionStorage.setItem(KEY, "on");
  else window.sessionStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}
