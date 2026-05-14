"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TurnstileField } from "@/components/auth/turnstile-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUserAction } from "@/server/actions/register";

const schema = z
  .object({
    name: z.string().trim().max(120).optional(),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(1, "Please confirm your password."),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

type Form = z.infer<typeof schema>;

type SignupFormProps = {
  turnstileSiteKey?: string;
};

export function SignupForm({ turnstileSiteKey }: SignupFormProps) {
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
    const result = await registerUserAction({
      name: data.name,
      email: data.email,
      password: data.password,
      turnstileToken: turnstileToken ?? undefined,
    });
    if (!result.ok) {
      resetTurnstileRef.current?.();
      if (result.field === "email" || result.field === "password" || result.field === "name") {
        form.setError(result.field, { message: result.error });
      } else {
        setError(result.error);
      }
      return;
    }

    const signInRes = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (signInRes?.error) {
      setError("Account created, but sign in failed. Please try logging in.");
      return;
    }
    window.location.assign("/account/pending");
  });

  return (
    <Card className="w-full max-w-md border-[color:var(--ss-border)] bg-[color:var(--ss-surface)] text-[color:var(--ss-foreground)]">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start with a free StaffStack account. Workspaces are invite-only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" type="text" autoComplete="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
            {form.formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-[color:var(--ss-muted-foreground)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[color:var(--ss-accent)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
