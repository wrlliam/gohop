"use client";

import Link from "next/link";
import { useSyncExternalStore, type ComponentProps } from "react";
import { Button } from "~/components/ui/button";

const COOKIE_NAME = "gohop_cookie_consent";
const MAX_AGE = 60 * 60 * 24 * 180; // 6 months

export type Consent = "all" | "essential";

const listeners = new Set<() => void>();

function readConsent(): Consent | null {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  return value === "all" || value === "essential" ? value : null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function setConsent(value: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  notify();
}

/** Lets people change their mind: clears the choice so the banner returns. */
export function resetConsent() {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  notify();
}

/**
 * consent is undefined while hydrating, null until the visitor chooses,
 * then "all" or "essential". Only load ads or analytics when it is "all".
 */
export function useCookieConsent() {
  const consent = useSyncExternalStore<Consent | null | undefined>(
    subscribe,
    readConsent,
    () => undefined,
  );
  return { consent, decided: consent != null };
}

export function CookieBanner() {
  const { consent } = useCookieConsent();
  if (consent !== null) return null;

  return (
    <section
      id="cookie-banner"
      tabIndex={-1}
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-text"
      className="bg-background focus-visible:ring-ring fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-col gap-4 rounded-xl border p-5 shadow-lg outline-none focus-visible:ring-2 sm:flex-row sm:items-center"
    >
      <div className="flex flex-col gap-1">
        <h2 id="cookie-title" className="text-sm font-semibold">
          Cookies on goHop
        </h2>
        <p id="cookie-text" className="text-muted-foreground text-sm">
          Essential cookies keep you signed in. With your OK we also use
          advertising cookies, which help pay for goHop. Choose an option to log
          in or sign up.{" "}
          <Link href="/cookies" className="underline underline-offset-4">
            Cookie policy
          </Link>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" onClick={() => setConsent("essential")}>
          Essential only
        </Button>
        <Button variant="outline" onClick={() => setConsent("all")}>
          Accept all
        </Button>
      </div>
    </section>
  );
}

type ConsentLinkButtonProps = Omit<ComponentProps<typeof Button>, "asChild"> & {
  href: string;
};

/**
 * A button that only navigates once a cookie choice has been made.
 * Until then it moves focus to the cookie banner instead.
 */
export function ConsentLinkButton({
  href,
  children,
  ...props
}: ConsentLinkButtonProps) {
  const { decided } = useCookieConsent();

  if (decided) {
    return (
      <Button {...props}>
        <Link href={href}>{children}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      {...props}
      onClick={() => document.getElementById("cookie-banner")?.focus()}
    >
      {children}
    </Button>
  );
}
