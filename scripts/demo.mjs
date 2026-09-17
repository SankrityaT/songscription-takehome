#!/usr/bin/env node
/* One command for the full setup: local Supabase (Postgres + storage, in
   Docker) and the app. If Docker is not running it still starts the app,
   which then keeps the library in the browser instead. */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const shell = process.platform === "win32";
const SUPABASE = ["--yes", "supabase@2.117.0"];
const ENV_FILE = ".env.local";
const say = (msg) => console.log(`\n  ${msg}`);

function startSupabase() {
  if (spawnSync("docker", ["info"], { stdio: "ignore", shell }).status !== 0) {
    say("Docker is not running, so there is no database this time.");
    say("The app still works: your library is kept in this browser. Start Docker and run this again for Supabase.");
    return;
  }
  say("Starting local Supabase. The first run downloads its images and can take a few minutes.");
  if (spawnSync("npx", [...SUPABASE, "start"], { stdio: "inherit", shell }).status !== 0) {
    say("Supabase did not start (see above). Carrying on without it: the library is kept in this browser.");
    return;
  }
  const status = spawnSync("npx", [...SUPABASE, "status", "-o", "env"], { encoding: "utf8", shell }).stdout ?? "";
  const read = (name) => status.match(new RegExp(`^${name}="?([^"\\n]+)"?$`, "m"))?.[1];
  const url = read("API_URL");
  const key = read("PUBLISHABLE_KEY") ?? read("ANON_KEY");
  if (!url || !key) {
    say("Supabase is up but its address could not be read. Copy .env.example to .env.local by hand.");
    return;
  }
  const current = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  if (current.includes(`NEXT_PUBLIC_SUPABASE_URL=${url}`) && current.includes(key)) {
    say(`${ENV_FILE} already points at this Supabase.`);
  } else {
    const kept = current
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("NEXT_PUBLIC_SUPABASE_") && !line.startsWith("# Local Supabase"))
      .join("\n");
    writeFileSync(ENV_FILE, `${kept ? `${kept}\n` : ""}# Local Supabase, written by npm run demo. Local defaults, not secrets.\nNEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${key}\n`);
    say(`Wrote ${ENV_FILE}.`);
  }
  say("Supabase is ready. The sidebar will say “Saved to Supabase”. Stop it later with: npm run demo:stop");
}

startSupabase();
say("Starting the app…\n");
const app = spawn("npx", ["next", "dev"], { stdio: "inherit", shell });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => app.kill(signal));
app.on("exit", (code) => process.exit(code ?? 0));
