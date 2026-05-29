"use client";

import type { TimeDisplayFormat } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AvailabilityRuleForm } from "@/components/availability/availability-rule-form";
import { Button } from "@/components/ui/button";
import { formatMinuteRange } from "@/lib/time-format";
import { deleteAvailabilityRuleAction } from "@/server/actions/availability";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type AvailabilityRuleItem = {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export function AvailabilityRulesList({
  tenantSlug,
  timeDisplayFormat,
  rules,
  canEdit,
}: {
  tenantSlug: string;
  timeDisplayFormat: TimeDisplayFormat;
  rules: AvailabilityRuleItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleDelete(formData: FormData) {
    startTransition(async () => {
      await deleteAvailabilityRuleAction(formData);
      setEditingId(null);
      router.refresh();
    });
  }

  if (rules.length === 0) {
    return <p className="text-sm text-zinc-500">No rules yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {rules.map((r) => (
        <li key={r.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          {editingId === r.id ? (
            <AvailabilityRuleForm
              tenantSlug={tenantSlug}
              timeDisplayFormat={timeDisplayFormat}
              ruleId={r.id}
              defaultDayOfWeek={r.dayOfWeek}
              defaultStartMinute={r.startMinute}
              defaultEndMinute={r.endMinute}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">
                {days[r.dayOfWeek]} ·{" "}
                {formatMinuteRange(r.startMinute, r.endMinute, timeDisplayFormat)}
              </span>
              {canEdit && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(r.id)}
                  >
                    Edit
                  </Button>
                  <form action={handleDelete}>
                    <input type="hidden" name="tenantSlug" value={tenantSlug} />
                    <input type="hidden" name="ruleId" value={r.id} />
                    <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
                      Delete
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
