"use client";

import { useEffect, useRef } from "react";

type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.turnstile) {
    return Promise.resolve();
  }
  const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile-api]");
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed")), {
        once: true,
      });
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.dataset.turnstileApi = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile script failed"));
    document.head.appendChild(s);
  });
}

type TurnstileFieldProps = {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
  /** Called so the parent can reset the widget after a failed submit */
  registerReset: (reset: () => void) => void;
};

export function TurnstileField({ siteKey, onTokenChange, registerReset }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const registerResetRef = useRef(registerReset);
  onTokenChangeRef.current = onTokenChange;
  registerResetRef.current = registerReset;

  useEffect(() => {
    let cancelled = false;
    const reset = () => {
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        window.turnstile.reset(id);
      }
      onTokenChangeRef.current(null);
    };
    registerResetRef.current(reset);

    void (async () => {
      try {
        await loadTurnstileScript();
      } catch {
        if (!cancelled) {
          onTokenChangeRef.current(null);
        }
        return;
      }
      if (cancelled || !containerRef.current || !window.turnstile) {
        return;
      }
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (t) => onTokenChangeRef.current(t),
        "expired-callback": () => onTokenChangeRef.current(null),
        "error-callback": () => onTokenChangeRef.current(null),
        theme: "auto",
      });
      widgetIdRef.current = id;
    })();

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      if (id && window.turnstile) {
        window.turnstile.remove(id);
      }
      onTokenChangeRef.current(null);
    };
  }, [siteKey]);

  return <div ref={containerRef} className="flex min-h-[65px] justify-center" />;
}
