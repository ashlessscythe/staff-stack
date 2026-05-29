"use client";

import { TimeDisplayFormat } from "@prisma/client";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type TenantSettingsFormState,
  updateTimeDisplayFormatAction,
} from "@/server/actions/tenant-settings";

const initial: TenantSettingsFormState = {};

const OPTIONS: { value: TimeDisplayFormat; label: string; example: string }[] = [
  { value: "TWELVE_HOUR", label: "12-hour", example: "9am – 5pm" },
  { value: "TWENTY_FOUR_HOUR", label: "24-hour", example: "0900 – 1700" },
];

export function TimeDisplayFormatForm({
  tenantSlug,
  currentFormat,
}: {
  tenantSlug: string;
  currentFormat: TimeDisplayFormat;
}) {
  const [state, action] = useActionState(updateTimeDisplayFormatAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time display</CardTitle>
        <CardDescription>
          Controls how availability windows are shown across this tenant (e.g. schedule availability
          rules).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <fieldset className="space-y-3">
            <legend className="sr-only">Time display format</legend>
            {OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 has-[:checked]:border-zinc-900 dark:border-zinc-800 dark:has-[:checked]:border-zinc-100"
              >
                <input
                  type="radio"
                  name="timeDisplayFormat"
                  value={opt.value}
                  defaultChecked={currentFormat === opt.value}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {opt.label}
                  </span>
                  <span className="text-sm text-zinc-500">{opt.example}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Button type="submit">Save</Button>
        </form>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.saved && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Settings saved.</p>
        )}
      </CardContent>
    </Card>
  );
}
