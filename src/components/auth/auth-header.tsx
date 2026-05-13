import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

type AuthHeaderProps = {
  /** Optional right-side CTA shown next to the theme toggle on >=sm screens. */
  cta?: {
    href: string;
    label: string;
  };
};

export function AuthHeader({ cta }: AuthHeaderProps) {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--ss-accent)] shadow-[0_0_18px_var(--ss-glow)]"
          />
          <span className="text-base font-semibold tracking-tight">StaffStack</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {cta ? (
            <Link
              href={cta.href}
              className="hidden text-sm font-medium text-[color:var(--ss-muted-foreground)] transition-colors hover:text-[color:var(--ss-foreground)] sm:inline-block"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
