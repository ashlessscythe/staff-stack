"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type TenantSettingsFormState,
  updateSchedulingEnforcementAction,
} from "@/server/actions/tenant-settings";

const initial: TenantSettingsFormState = {};

const OPTIONS: { value: "warn" | "block"; label: string; description: string }[] = [
  {
    value: "warn",
    label: "Warn (default)",
    description:
      "Availability issues show warnings; managers can assign anyway. Hard blocks still apply for PTO and unavailable exceptions.",
  },
  {
    value: "block",
    label: "Block",
    description:
      "Outside weekly availability is treated as a hard block (same as PTO conflicts) until availability is updated.",
  },
];

export function SchedulingEnforcementForm({
  tenantSlug,
  currentMode,
}: {
  tenantSlug: string;
  currentMode: "warn" | "block";
}) {
  const [state, action] = useActionState(updateSchedulingEnforcementAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling constraints</CardTitle>
        <CardDescription>
          How strictly assignment and swaps enforce employee availability rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <fieldset className="space-y-3">
            <legend className="sr-only">Availability enforcement</legend>
            {OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 has-[:checked]:border-zinc-900 dark:border-zinc-800 dark:has-[:checked]:border-zinc-100"
              >
                <input
                  type="radio"
                  name="enforceAvailability"
                  value={opt.value}
                  defaultChecked={currentMode === opt.value}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {opt.label}
                  </span>
                  <span className="text-sm text-zinc-500">{opt.description}</span>
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
