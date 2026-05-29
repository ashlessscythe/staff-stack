"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { Fragment, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  assignShiftFormAction,
  acknowledgeShiftFormAction,
  checkInFormAction,
  markNoShowFormAction,
  publishShiftFormAction,
} from "@/server/actions/shifts";
import { requestSwapFormAction } from "@/server/actions/swaps";

export type AssignmentSwapInfo = {
  status: "REQUESTED" | "PENDING_APPROVAL";
  role: "requester" | "target" | "other";
};

export type ScheduleTableShift = {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  site: { name: string; timezone: string };
  assignments: {
    id: string;
    userId: string;
    acknowledgedAt: string | null;
    checkInAt: string | null;
  }[];
};

export type ScheduleShiftsTableProps = {
  tenantSlug: string;
  currentUserId: string;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  shifts: ScheduleTableShift[];
  allShifts: ScheduleTableShift[];
  canWrite: boolean;
  canAssign: boolean;
  canRequestSwap: boolean;
  pendingSwapsByAssignmentId: Record<string, AssignmentSwapInfo>;
  userEmailById: Record<string, string>;
  tenantUsers: { userId: string; email: string }[];
};

const columnHelper = createColumnHelper<ScheduleTableShift>();

function buildEligibleTargets(
  requesterShiftId: string,
  allShifts: ScheduleTableShift[],
  currentUserId: string,
  pendingSwapsByAssignmentId: Record<string, AssignmentSwapInfo>,
  userEmailById: Record<string, string>,
): { id: string; label: string }[] {
  const now = Date.now();
  const targets: { id: string; label: string }[] = [];
  for (const shift of allShifts) {
    if (shift.status !== "PUBLISHED") continue;
    if (new Date(shift.startsAt).getTime() <= now) continue;
    if (shift.id === requesterShiftId) continue;
    for (const assignment of shift.assignments) {
      if (assignment.userId === currentUserId) continue;
      if (pendingSwapsByAssignmentId[assignment.id]) continue;
      const when = new Date(shift.startsAt).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
      targets.push({
        id: assignment.id,
        label: `${shift.title} · ${when} · ${userEmailById[assignment.userId] ?? assignment.userId}`,
      });
    }
  }
  return targets.sort((a, b) => a.label.localeCompare(b.label));
}

function SwapBadge({ info, tenantSlug }: { info: AssignmentSwapInfo; tenantSlug: string }) {
  if (info.role === "requester") {
    return (
      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
        {info.status === "REQUESTED" ? "Swap pending" : "Awaiting manager"}
      </span>
    );
  }
  if (info.role === "target") {
    return (
      <Link
        href={`/t/${tenantSlug}/swaps#needs-response`}
        className="text-xs font-medium text-amber-700 underline dark:text-amber-400"
      >
        Swap requested — respond
      </Link>
    );
  }
  return <span className="text-xs text-zinc-400">Swap pending</span>;
}

function groupShiftsByWeek(
  shifts: ScheduleTableShift[],
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6,
): { weekKey: number; label: string; rows: ScheduleTableShift[] }[] {
  const sorted = [...shifts].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const map = new Map<number, { label: string; rows: ScheduleTableShift[] }>();
  for (const s of sorted) {
    const d = new Date(s.startsAt);
    const w = startOfWeek(d, { weekStartsOn });
    const weekKey = w.getTime();
    const label = w.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const cur = map.get(weekKey);
    if (cur) cur.rows.push(s);
    else map.set(weekKey, { label, rows: [s] });
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekKey, v]) => ({ weekKey, label: v.label, rows: v.rows }));
}

function WeekShiftRows(
  props: Omit<ScheduleShiftsTableProps, "shifts" | "weekStartsOn"> & {
    rows: ScheduleTableShift[];
  },
) {
  const {
    rows,
    allShifts,
    tenantSlug,
    currentUserId,
    canWrite,
    canAssign,
    canRequestSwap,
    pendingSwapsByAssignmentId,
    userEmailById,
    tenantUsers,
  } = props;

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Shift",
        cell: (ctx) => (
          <span className="font-medium text-zinc-900 dark:text-zinc-50">{ctx.getValue()}</span>
        ),
      }),
      columnHelper.accessor((r) => r.site.name, {
        id: "site",
        header: "Site",
        cell: (ctx) => ctx.getValue(),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (ctx) => (
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {ctx.getValue()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "window",
        header: "Window",
        cell: ({ row }) => {
          const tz = row.original.site.timezone;
          return (
            <span className="whitespace-nowrap text-zinc-700 dark:text-zinc-300">
              {formatInTimeZone(row.original.startsAt, tz, "MMM d HH:mm")} →{" "}
              {formatInTimeZone(row.original.endsAt, tz, "HH:mm zzz")}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) =>
          canWrite && row.original.status === "DRAFT" ? (
            <form action={publishShiftFormAction}>
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="shiftId" value={row.original.id} />
              <Button type="submit" size="sm" variant="secondary">
                Publish
              </Button>
            </form>
          ) : null,
      }),
    ],
    [canWrite, tenantSlug],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <tbody className="[&>tr:nth-child(odd)]:bg-zinc-50/80 dark:[&>tr:nth-child(odd)]:bg-zinc-900/40">
      {table.getRowModel().rows.map((row) => (
        <Fragment key={row.id}>
          <tr className="border-b border-zinc-200 align-top dark:border-zinc-800">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="px-3 py-3 text-sm">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <td colSpan={5} className="space-y-3 px-3 pb-4 pt-0">
              <p className="text-xs font-medium uppercase text-zinc-500">Assignments</p>
              <ul className="space-y-2 text-sm">
                {row.original.assignments.map((a) => {
                  const swapInfo = pendingSwapsByAssignmentId[a.id];
                  const isOwn = a.userId === currentUserId;
                  const shiftIsSwappable =
                    row.original.status === "PUBLISHED" &&
                    new Date(row.original.startsAt).getTime() > Date.now();
                  const eligibleTargets =
                    isOwn && canRequestSwap && shiftIsSwappable && !swapInfo
                      ? buildEligibleTargets(
                          row.original.id,
                          allShifts,
                          currentUserId,
                          pendingSwapsByAssignmentId,
                          userEmailById,
                        )
                      : [];

                  return (
                    <li
                      key={a.id}
                      className="flex flex-col gap-2 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-900"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {userEmailById[a.userId] ?? a.userId}
                        </span>
                        {swapInfo ? <SwapBadge info={swapInfo} tenantSlug={tenantSlug} /> : null}
                        {isOwn && !a.acknowledgedAt && (
                          <form action={acknowledgeShiftFormAction}>
                            <input type="hidden" name="tenantSlug" value={tenantSlug} />
                            <input type="hidden" name="shiftId" value={row.original.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Acknowledge
                            </Button>
                          </form>
                        )}
                        {!isOwn && !a.acknowledgedAt && (
                          <span className="text-zinc-400">Pending ack</span>
                        )}
                        {isOwn && !a.checkInAt && (
                          <form action={checkInFormAction}>
                            <input type="hidden" name="tenantSlug" value={tenantSlug} />
                            <input type="hidden" name="shiftId" value={row.original.id} />
                            <Button type="submit" size="sm" variant="ghost">
                              Check in
                            </Button>
                          </form>
                        )}
                        {a.checkInAt && <span className="text-xs text-zinc-500">Checked in</span>}
                        {canAssign && !isOwn && (
                          <form action={markNoShowFormAction} className="inline">
                            <input type="hidden" name="tenantSlug" value={tenantSlug} />
                            <input type="hidden" name="shiftId" value={row.original.id} />
                            <input type="hidden" name="userId" value={a.userId} />
                            <Button type="submit" size="sm" variant="destructive">
                              Mark no-show
                            </Button>
                          </form>
                        )}
                      </div>
                      {eligibleTargets.length > 0 && (
                        <form
                          action={requestSwapFormAction}
                          className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-zinc-200 p-2 dark:border-zinc-800"
                        >
                          <input type="hidden" name="tenantSlug" value={tenantSlug} />
                          <input type="hidden" name="requesterAssignmentId" value={a.id} />
                          <div className="space-y-1">
                            <label
                              htmlFor={`swap-target-${a.id}`}
                              className="text-xs text-zinc-500"
                            >
                              Request swap with
                            </label>
                            <select
                              id={`swap-target-${a.id}`}
                              name="targetAssignmentId"
                              required
                              className="h-9 min-w-[220px] rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                            >
                              <option value="">Select shift…</option>
                              {eligibleTargets.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label htmlFor={`swap-msg-${a.id}`} className="text-xs text-zinc-500">
                              Message (optional)
                            </label>
                            <input
                              id={`swap-msg-${a.id}`}
                              name="message"
                              type="text"
                              placeholder="Reason for swap"
                              className="h-9 min-w-[180px] rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                            />
                          </div>
                          <Button type="submit" size="sm" variant="secondary">
                            Request swap
                          </Button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
              {canAssign && (
                <form
                  action={assignShiftFormAction}
                  className="flex flex-wrap items-end gap-2 pt-1"
                >
                  <input type="hidden" name="tenantSlug" value={tenantSlug} />
                  <input type="hidden" name="shiftId" value={row.original.id} />
                  <div className="space-y-1">
                    <label htmlFor={`user-${row.original.id}`} className="text-xs text-zinc-500">
                      Assign user
                    </label>
                    <select
                      id={`user-${row.original.id}`}
                      name="userId"
                      className="h-10 min-w-[200px] rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      {tenantUsers.map((tu) => (
                        <option key={tu.userId} value={tu.userId}>
                          {tu.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" size="sm">
                    Assign
                  </Button>
                </form>
              )}
            </td>
          </tr>
        </Fragment>
      ))}
    </tbody>
  );
}

function WeekScheduleTable(
  props: Omit<ScheduleShiftsTableProps, "shifts" | "weekStartsOn"> & {
    weekLabel: string;
    rows: ScheduleTableShift[];
  },
) {
  const { weekLabel } = props;

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <p className="border-b border-zinc-200 bg-zinc-100/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
        Week of {weekLabel}
      </p>
      <table className="w-full min-w-0 border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-white text-left text-xs font-medium uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <th className="px-3 py-2">Shift</th>
            <th className="px-3 py-2">Site</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Window</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <WeekShiftRows {...props} />
      </table>
    </div>
  );
}

export function ScheduleShiftsTable(props: ScheduleShiftsTableProps) {
  const { shifts, weekStartsOn } = props;
  const groups = useMemo(() => groupShiftsByWeek(shifts, weekStartsOn), [shifts, weekStartsOn]);

  if (shifts.length === 0) {
    return <p className="text-sm text-zinc-500">No shifts in this window.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((g) => (
        <WeekScheduleTable key={g.weekKey} {...props} rows={g.rows} weekLabel={g.label} />
      ))}
    </div>
  );
}
