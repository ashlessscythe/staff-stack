"use server";

import { signOut } from "@/auth";

export async function signOutAction() {
  // Avoid `redirect()` from this server action: production can fail to complete the
  // RSC navigation after the action POST; callers do a full `window.location` instead.
  await signOut({ redirect: false, redirectTo: "/login" });
}
