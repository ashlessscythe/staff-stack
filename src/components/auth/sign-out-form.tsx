"use client";

import type { ButtonHTMLAttributes, FormEvent, ReactNode } from "react";
import { useState } from "react";

import { signOutAction } from "@/server/actions/auth";

type SignOutFormProps = {
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
};

export function SignOutForm({
  children,
  className,
  buttonClassName,
  buttonProps,
}: SignOutFormProps) {
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await signOutAction();
    } catch {
      // If the server action fails in production (proxy/env mismatch),
      // still navigate so the user isn't stuck.
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <form className={className} onSubmit={onSubmit}>
      <button
        type="submit"
        className={buttonClassName}
        disabled={submitting || buttonProps?.disabled}
        {...buttonProps}
      >
        {children}
      </button>
    </form>
  );
}
