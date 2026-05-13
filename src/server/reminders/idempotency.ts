/** Stable across republish; one scheduled row per shift × assignee × template. */
export function shiftReminderIdempotencyKey(shiftId: string, userId: string, templateId: string) {
  return `reminder:v1:${shiftId}:${userId}:${templateId}`;
}
