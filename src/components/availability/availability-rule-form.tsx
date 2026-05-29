"use client";

import type { FocusEvent } from "react";
import type { TimeDisplayFormat } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMinuteOfDay, normalizeTimeInput, timeInputPlaceholder } from "@/lib/time-format";
import { addAvailabilityRuleAction } from "@/server/actions/availability";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeTimeField(event: FocusEvent<HTMLInputElement>, format: TimeDisplayFormat) {
  event.currentTarget.value = normalizeTimeInput(event.currentTarget.value, format);
}

export function AvailabilityRuleForm({
  tenantSlug,
  timeDisplayFormat,
  defaultStartMinute = 9 * 60,
  defaultEndMinute = 17 * 60,
}: {
  tenantSlug: string;
  timeDisplayFormat: TimeDisplayFormat;
  defaultStartMinute?: number;
  defaultEndMinute?: number;
}) {
  const placeholder = timeInputPlaceholder(timeDisplayFormat);

  return (
    <form action={addAvailabilityRuleAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <div className="space-y-2">
        <Label htmlFor="dayOfWeek">Day</Label>
        <select
          id="dayOfWeek"
          name="dayOfWeek"
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          {days.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block" />
      <div className="space-y-2">
        <Label htmlFor="startTime">Start time</Label>
        <Input
          id="startTime"
          name="startTime"
          type="text"
          required
          placeholder={placeholder}
          defaultValue={formatMinuteOfDay(defaultStartMinute, timeDisplayFormat)}
          onBlur={(e) => normalizeTimeField(e, timeDisplayFormat)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="endTime">End time</Label>
        <Input
          id="endTime"
          name="endTime"
          type="text"
          required
          placeholder={placeholder}
          defaultValue={formatMinuteOfDay(defaultEndMinute, timeDisplayFormat)}
          onBlur={(e) => normalizeTimeField(e, timeDisplayFormat)}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit">Add rule</Button>
      </div>
    </form>
  );
}
