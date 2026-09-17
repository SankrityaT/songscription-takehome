# Songscription Fullstack Take-Home

## Running this build

**Live:** https://songscription-library.vercel.app (no setup). The hosted copy has no database, so it keeps your library in your browser. Run it locally with `npm run demo` to see the Supabase backend.

**Quickest (no setup):**

```bash
npm install
npm run dev        # http://localhost:3000
```

That is all it needs. With no database configured the library is kept in your browser, survives refresh, and the sidebar says "Saved on this device".

**With the real backend (one command, needs Docker running):**

```bash
npm install
npm run demo       # starts local Supabase, writes .env.local, starts the app
```

`npm run demo` runs `supabase start` (Postgres + storage in Docker, migrations in `supabase/migrations/` applied automatically), writes the local URL and key into `.env.local`, then starts the app. The sidebar will say "Saved to Supabase". The first run downloads the Supabase images, so give it a few minutes. If Docker is not running it says so and starts the app anyway. `npm run demo:stop` shuts Supabase down. Nothing to sign up for, no keys to paste. It uses ports 54421 to 54429, so it will not collide with a Supabase you already run on the defaults.

**It opens with 300 demo songs** so search, filters, sort and "Pick for me" can be tried straight away. They are generated from the three sample files (transposed, re-timed, some given a left hand), titled after real piano repertoire, flagged `generated` in the database, and loaded only once, when both the database and the browser are empty. To see the other states, use **See it at size** in the sidebar: *Empty · 3 songs · 300* switches the library between the first-run state (with starter songs), the three sample files, and the full generated set. Every switch has Undo.

**See my design decisions** (top bar) pins numbered notes onto the live page. Each one quotes a question from this brief and answers it where the answer was built: upload, telling songs apart, finding a song, what to practice, settings, 0 / 3 / 300, persistence. Notes only appear while their subject is on screen, so open a song, play one, or switch the library size to see the rest.

**Data model** (`supabase/migrations/`): a `songs` table where everything a learner sees in a row is a column (key, bpm, length, level, hands, note count, favorite, folder, play count, last played), so the catalogue can be filtered and sorted in SQL without reopening files (at this size the rows load once and filter in the browser; the indexes are there for when it grows). A unique `fingerprint` of the notes catches duplicate uploads even when the file is renamed. The piano-roll thumbnail and a capped note list are stored as `jsonb` so the library never reparses MIDI. `folders` is its own table, and the original `.mid` goes to a private `midi` storage bucket. The adapter is `src/lib/db/supabase.ts`; `src/lib/library/store.ts` writes to a local cache first (instant first paint, optimistic UI) and mirrors to Postgres.

---

Thanks for taking the time to do this. This project gives you a feel for the kind of work you'd be doing at Songscription, and gives us a sense of how you think about UI, UX, and backend integration.

## Product context

We're building a piano learning app where users can transcribe any music into a MIDI file, then learn it using an interactive piano roll. One page of that app is the **catalogue page** where users see every transcription they've created and click into one to practice it.

**You're building that catalogue page.**

You don't need to build any transcription logic. Treat uploading a `.mid` file as a stand-in for "the user just transcribed a song". The upload is the action that adds an entry to their library.

## The task

Build a single-page web app where a user can:

1. **Upload a MIDI file** to add it to their catalogue. (Stand-in for "transcribe a song.")
2. **Browse the catalogue** of every file they've added.
3. **Click into a file** to see some details about it. Think about what details would be relevant for a learner of the song.

## Things to think about

These are examples of the kinds of product questions we think about. You don't have to answer or address them all in your build, they're just here as examples of different paths you could explore.

- How do we make the **upload process** as smooth as possible? What happens during upload, after, and on failure?
- Once a file is in the catalogue, **how does it appear to the user?** How do you make it easy to differentiate between songs? What if they don't know exactly what they want to practice that day?
- As the catalogue grows, **how does someone find the song they want to come back to?** Search? Filter? Sort? Tags? Recently played? Favorites? Folders? Something else?
- **What settings might a user want?** Per-file? Library-wide? What lives where?
- What does the catalogue feel like with **0 items**? With **3**? With **300**?

If you need data we haven't given you (favorites, last-practiced timestamps, accuracy metrics, practice logs, tags, difficulty, user info, etc.), invent it. Mock data is fine and encouraged.

## What we're looking for

- **It must persist.** Refreshing the page should keep the files. Use any backend you like to store the file and any extra metadata about it. We use Supabase, but you can choose whatever backend you're comfortable with.
- **Visual polish.** This is a product surface. Empty states, hover states, loading, transitions, typography, spacing etc should be reasonable.
- **How you store and query data.** We want to see how you store the data, which metadata you decide to add to the database, etc. 
- **Product thinking.** Is the final output intuitive and usable? Can you take inspiration from other similar applications?
- **Creative problem solving.** We've given you the bare minimum to get started. If you think the catalogue needs audio playback, previews, thumbnails, waveforms, anything, feel free to add it. There's no "right" set of features...surprise us.

## What we're NOT looking for

- **Auth.** Don't build login, that's a time sink. Treat it as a single user. If you want richer UI (avatars, settings, "your" stats, etc.), feel free to mock a user's data. We just want to see the product surface.
- **A custom piano roll or practice experience.** If you want to design around it (e.g., a "Practice" button on each catalogue entry), feel free to leave a placeholder region (something like a panel that says *"this is where the piano roll would go"* is totally fine).

## Time

**Spend 2-3 hours.** We'd like to see what you can do in this time window. We recommend time boxing it and sending us what you've got by the 3-hour mark.

Tools like Cursor, Copilot, ChatGPT, Claude, etc. are all fair game.

## Getting started

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). Sample `.mid` files are in the `public/samples/` folder. You're also free to use your own.

## Stack

The starter is **Next.js 15 (App Router) + TypeScript + Tailwind**.

You're free to:

- Restructure the project layout however you want.
- Swap the styling system, add a component library (shadcn, MUI, Mantine, etc.).
- Add any libraries you'd add at work.

## Submission

When you're done, email **[katie@songscription.ai](mailto:katie@songscription.ai)** and **[alex@songscription.ai](mailto:alex@songscription.ai)** with:

1. A link to your **GitHub repo** (public, or invite `ayeitskatie1212` if private).
2. Screenshots of the finished UI.
3. A short note (3–5 sentences) covering:
  - What backend you chose and why.
  - One thing you'd do differently with more time.
  - One thing you're proud of.


That's it. Looking forward to seeing what you build!