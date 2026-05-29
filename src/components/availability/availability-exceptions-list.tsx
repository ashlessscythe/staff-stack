"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AvailabilityExceptionForm } from "@/components/availability/availability-exception-form";
import { Button } from "@/components/ui/button";
import { deleteAvailabilityExceptionAction } from "@/server/actions/availability";

export type AvailabilityExceptionItem = {
  id: string;
  date: string;
  available: boolean;
  note: string | null;
};

export function AvailabilityExceptionsList({
  tenantSlug,
  exceptions,
  canEdit,
}: {
  tenantSlug: string;
  exceptions: AvailabilityExceptionItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleDelete(formData: FormData) {
    startTransition(async () => {
      await deleteAvailabilityExceptionAction(formData);
      setEditingId(null);
      router.refresh();
    });
  }

  if (exceptions.length === 0) {
    return <p className="text-sm text-zinc-500">No exceptions yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {exceptions.map((e) => (
        <li key={e.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          {editingId === e.id ? (
            <AvailabilityExceptionForm
              tenantSlug={tenantSlug}
              exceptionId={e.id}
              defaultDate={e.date}
              defaultAvailable={e.available}
              defaultNote={e.note ?? ""}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">
                {e.date} · {e.available ? "Available" : "Unavailable"}
                {e.note ? ` · ${e.note}` : ""}
              </span>
              {canEdit && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(e.id)}
                  >
                    Edit
                  </Button>
                  <form action={handleDelete}>
                    <input type="hidden" name="tenantSlug" value={tenantSlug} />
                    <input type="hidden" name="exceptionId" value={e.id} />
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
