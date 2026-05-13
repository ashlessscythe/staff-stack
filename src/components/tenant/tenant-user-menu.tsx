"use client";

import { UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/actions/auth";

type TenantUserMenuProps = {
  user: { name: string | null; email: string | null };
  className?: string;
};

export function TenantUserMenu({ user, className }: TenantUserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const displayName = user.name?.trim() || null;
  const subtitle = user.email ?? null;

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 shadow-sm hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-500"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <UserRound className="h-4 w-4" aria-hidden />
        <span className="sr-only">Open account menu</span>
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[12.5rem] overflow-hidden rounded-md border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          role="menu"
          aria-label="Account"
        >
          <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            {displayName ? (
              <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{displayName}</p>
            ) : null}
            {subtitle ? (
              <p
                className={cn(
                  "truncate text-zinc-500 dark:text-zinc-400",
                  displayName ? "text-xs" : "font-medium text-zinc-900 dark:text-zinc-50",
                )}
              >
                {subtitle}
              </p>
            ) : (
              <p className="text-zinc-500 dark:text-zinc-400">Signed in</p>
            )}
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
              role="menuitem"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
