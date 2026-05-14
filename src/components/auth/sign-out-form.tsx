"use client";

import type { ButtonHTMLAttributes, FormEvent, ReactNode } from "react";

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
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await signOutAction();
    window.location.assign("/login");
  }

  return (
    <form className={className} onSubmit={onSubmit}>
      <button type="submit" className={buttonClassName} {...buttonProps}>
        {children}
      </button>
    </form>
  );
}
