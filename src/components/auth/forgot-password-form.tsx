"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TurnstileField } from "@/components/auth/turnstile-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/server/actions/password-reset";

const schema = z.object({
  email: z.string().email(),
});

type Form = z.infer<typeof schema>;

type ForgotPasswordFormProps = {
  turnstileSiteKey?: string;
};

export function ForgotPasswordForm({ turnstileSiteKey }: ForgotPasswordFormProps) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const resetTurnstileRef = useRef<(() => void) | null>(null);
  const registerTurnstileReset = useCallback((fn: () => void) => {
    resetTurnstileRef.current = fn;
  }, []);
  const form = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (data) => {
    setError(null);
    if (turnstileSiteKey && !turnstileToken?.trim()) {
      setError("Please complete the security check.");
      return;
    }
    const res = await requestPasswordResetAction({
      email: data.email,
      turnstileToken: turnstileToken ?? undefined,
    });
    if (!res.ok) {
      resetTurnstileRef.current?.();
      setError(res.error);
      return;
    }
    setDone(true);
  });

  if (done) {
    return (
      <Card className="w-full max-w-md border-[color:var(--ss-border)] bg-[color:var(--ss-surface)] text-[color:var(--ss-foreground)]">
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            If an account exists for that email with a password set, we sent reset instructions. The
            link expires in one hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className="text-sm font-medium text-[color:var(--ss-accent)] hover:underline"
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
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>We will email you a secure link to choose a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
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
            {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-[color:var(--ss-muted-foreground)]">
            <Link
              href="/login"
              className="font-medium text-[color:var(--ss-accent)] hover:underline"
            >
              Sign in instead
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
