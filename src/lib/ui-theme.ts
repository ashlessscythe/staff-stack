export const APP_THEMES = ["corporate", "day", "night", "neon", "cyberpunk"] as const;
export type AppTheme = (typeof APP_THEMES)[number];

export const APP_THEME_LABELS: Record<AppTheme, string> = {
  corporate: "Corporate",
  day: "Day",
  night: "Night",
  neon: "Neon",
  cyberpunk: "Cyberpunk",
};

/** Themes that should toggle Tailwind's `dark` utility variant. */
export const DARK_APP_THEMES: ReadonlySet<AppTheme> = new Set(["night", "neon", "cyberpunk"]);

export function isAppTheme(value: string): value is AppTheme {
  return (APP_THEMES as readonly string[]).includes(value);
}
