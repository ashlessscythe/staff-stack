"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, CalendarClock, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

const features = [
  {
    icon: CalendarClock,
    title: "Schedules that build themselves",
    body: "Drag-and-drop shifts, recurring templates, and conflict detection so your week falls into place.",
  },
  {
    icon: Users,
    title: "Built for multi-site teams",
    body: "Per-tenant sites, memberships, and roles. Give the right people the right access — nothing more.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance you can audit",
    body: "Tamper-evident audit logs, PTO approvals, and check-in records keep operations honest.",
  },
  {
    icon: Sparkles,
    title: "Five built-in themes",
    body: "Corporate, Day, Night, Neon, or Cyberpunk — match the mood of your team in one click.",
  },
];

export function LandingPage() {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: reduce ? 0 : 0.1 },
    },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--ss-background)] text-[color:var(--ss-foreground)]">
      <BackgroundFx reduce={!!reduce} />

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
            <Link
              href="/login"
              className="hidden text-sm font-medium text-[color:var(--ss-muted-foreground)] transition-colors hover:text-[color:var(--ss-foreground)] sm:inline-block"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mx-auto max-w-3xl text-center"
          >
            <motion.span
              variants={item}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ss-border)] bg-[color:var(--ss-surface)]/70 px-3 py-1 text-xs font-medium text-[color:var(--ss-muted-foreground)] backdrop-blur"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--ss-accent)]" />
              Multi-tenant workforce scheduling
            </motion.span>

            <motion.h1
              variants={item}
              className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl"
            >
              Staffing, <span className="ss-gradient-text inline-block">orchestrated.</span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[color:var(--ss-muted-foreground)]"
            >
              StaffStack gives operators a calm command center for shifts, swaps, availability, and
              compliance — without the spreadsheet sprawl.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[color:var(--ss-accent)] px-6 text-sm font-semibold text-[color:var(--ss-accent-foreground)] shadow-[0_8px_32px_var(--ss-glow)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ss-accent)]"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-[color:var(--ss-border)] bg-[color:var(--ss-surface)]/70 px-6 text-sm font-semibold text-[color:var(--ss-foreground)] backdrop-blur transition-colors hover:border-[color:var(--ss-accent)]/60 hover:bg-[color:var(--ss-surface-2)]"
              >
                Sign in
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={item}
                  whileHover={reduce ? undefined : { y: -4 }}
                  className="group relative overflow-hidden rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-surface)]/70 p-5 backdrop-blur transition-colors hover:border-[color:var(--ss-accent)]/60"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: "var(--ss-glow)" }}
                  />
                  <div className="relative">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[color:var(--ss-muted)] text-[color:var(--ss-accent)]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--ss-muted-foreground)]">
                      {f.body}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[color:var(--ss-border)] bg-[color:var(--ss-surface)]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-[color:var(--ss-muted-foreground)] sm:flex-row">
          <p>&copy; {new Date().getFullYear()} StaffStack</p>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-[color:var(--ss-foreground)]">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-[color:var(--ss-foreground)]">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BackgroundFx({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 ss-grid-bg opacity-40" />
      <motion.div
        className="absolute -left-32 top-[-10%] h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: "var(--ss-gradient-from)", opacity: 0.25 }}
        animate={reduce ? undefined : { x: [0, 40, -20, 0], y: [0, 20, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10%] top-[20%] h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "var(--ss-gradient-via)", opacity: 0.22 }}
        animate={reduce ? undefined : { x: [0, -30, 30, 0], y: [0, 30, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-20%] left-1/3 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{ background: "var(--ss-gradient-to)", opacity: 0.2 }}
        animate={reduce ? undefined : { x: [0, 20, -40, 0], y: [0, -20, 10, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
