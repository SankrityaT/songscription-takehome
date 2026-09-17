import type { Config } from "tailwindcss";

/* Palette is Songscription's own cream + teal + yellow, tuned warmer.
   Saturated green/blue exist only inside piano rolls (hand colors). */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F5",
        "paper-deep": "#F3EDE4",
        card: "#FFFDFB",
        ink: "#14130F",
        "ink-soft": "#5C574D",
        "ink-dim": "#8E887C",
        line: "rgba(20,19,15,0.08)",
        "line-strong": "rgba(20,19,15,0.16)",
        teal: "#22877B",
        "teal-deep": "#0F5C53",
        "teal-soft": "#E6F1EE",
        sun: "#FFE28A",
        "sun-ink": "#7A5A00",
        "sun-soft": "#FFF6D6",
        coral: "#E4553A",
        "coral-soft": "#FBE3DD",
        sage: "#3F8F5F",
        "sage-soft": "#E3F0E7",
        roll: "#0E0F10",
        "hand-r": "#3DDC97",
        "hand-l": "#5B8DEF",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-dm-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        ctl: "12px",
        card: "16px",
        stage: "24px",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 20px rgba(45,41,33,0.06)",
        lift: "0 1px 0 rgba(255,255,255,0.8) inset, 0 18px 40px rgba(45,41,33,0.12)",
        focus: "0 0 0 2px #FAF7F5, 0 0 0 4px #22877B",
      },
      keyframes: {
        "key-press": {
          "0%": { transform: "translateY(0)" },
          "35%": { transform: "translateY(3px)" },
          "100%": { transform: "translateY(0)" },
        },
        "row-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        breathe: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "bar-slide": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "24px 0" },
        },
      },
      animation: {
        "key-press": "key-press 420ms cubic-bezier(0.16,1,0.3,1) both",
        "row-in": "row-in 260ms cubic-bezier(0.16,1,0.3,1) both",
        breathe: "breathe 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
        "bar-slide": "bar-slide 900ms linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
