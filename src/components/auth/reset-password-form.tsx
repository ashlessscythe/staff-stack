"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TurnstileField } from "@/components/auth/turnstile-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completePasswordResetAction,
  type ResetPasswordTokenState,
} from "@/server/actions/password-reset";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(1, "Confirm your password."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

type Form = z.infer<typeof schema>;

type ResetPasswordFormProps = {
  tokenState: ResetPasswordTokenState;
  turnstileSiteKey?: string;
};

export function ResetPasswordForm({ tokenState, turnstileSiteKey }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const resetTurnstileRef = useRef<(() => void) | null>(null);
  const registerTurnstileReset = useCallback((fn: () => void) => {
    resetTurnstileRef.current = fn;
  }, []);
  const form = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (data) => {
    setError(null);
    if (tokenState !== "valid" || !token || token.length !== 64) {
      setError("This reset link is missing or invalid.");
      return;
    }
    if (turnstileSiteKey && !turnstileToken?.trim()) {
      setError("Please complete the security check.");
      return;
    }
    const res = await completePasswordResetAction({
      token,
      password: data.password,
      turnstileToken: turnstileToken ?? undefined,
    });
    if (!res.ok) {
      resetTurnstileRef.current?.();
      setError(res.error);
      return;
    }
    router.push("/login?reset=1");
    router.refresh();
  });

  if (tokenState === "missing" || tokenState === "malformed") {
    return (
      <Card className="w-full max-w-md border-[color:var(--ss-border)] bg-[color:var(--ss-surface)] text-[color:var(--ss-foreground)]">
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>
            This password reset link is incomplete or malformed. Request a new link from the sign-in
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-[color:var(--ss-accent)] hover:underline"
          >
            Request a new link
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (tokenState === "invalid") {
    return (
      <Card className="w-full max-w-md border-[color:var(--ss-border)] bg-[color:var(--ss-surface)] text-[color:var(--ss-foreground)]">
        <CardHeader>
          <CardTitle>Link no longer valid</CardTitle>
          <CardDescription>
            This reset link has expired or was already used. If you still need to change your
            password, request a new link.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-[color:var(--ss-accent)] hover:underline"
          >
            Request a new link
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-[color:var(--ss-muted-foreground)] hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-[color:var(--ss-border)] bg-[color:var(--ss-surface)] text-[color:var(--ss-foreground)]">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Pick a strong password you have not used elsewhere.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...form.register("confirm")}
            />
            {form.formState.errors.confirm && (
              <p className="text-sm text-red-600">{form.formState.errors.confirm.message}</p>
            )}
          </div>
          {turnstileSiteKey ? (
            <TurnstileField
              siteKey={turnstileSiteKey}
              onTokenChange={setTurnstileToken}
              registerReset={registerTurnstileReset}
            />
          ) : null}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
