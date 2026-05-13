export function formatShiftStartsAt(startsAt: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(startsAt);
}

export function renderReminderBody(
  template: string,
  vars: { shiftTitle: string; startsAt: string },
) {
  return template
    .replaceAll("{{shiftTitle}}", vars.shiftTitle)
    .replaceAll("{{startsAt}}", vars.startsAt);
}
