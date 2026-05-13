export const APP_THEMES = ["corporate", "day", "night"] as const;
export type AppTheme = (typeof APP_THEMES)[number];

export function isAppTheme(value: string): value is AppTheme {
  return (APP_THEMES as readonly string[]).includes(value);
}
