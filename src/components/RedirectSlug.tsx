"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "~/components/ui/button";

type ApiResponse =
  | {
      status: "ok";
      monetised: boolean;
      url: string;
      ok: boolean;
      reasons: string[];
      viewId?: number;
      impressionToken?: string | null;
    }
  | { status: "password_required"; monetised: boolean }
  | { status: "wrong_password" }
  | { status: "rate_limited" }
  | { status: "expired" }
  | { status: "limit_reached" }
  | { status: "not_found" };

type Impression = { viewId: number; token: string };

type State =
  | { phase: "checking" }
  | { phase: "redirecting"; url: string; impression?: Impression }
  | { phase: "password"; error?: string; submitting?: boolean }
  | { phase: "warning"; url: string; reasons: string[] }
  | { phase: "unavailable"; reason: "expired" | "limit_reached" | "not_found" }
  | { phase: "error" };

const MIN_DISPLAY_MS = 1500; // page shown at least this long (no ad / unmonetised)
const AD_VISIBLE_MS = 1500; // a filled ad must be on screen this long before we confirm it
const AD_MAX_WAIT_MS = 6000; // give up waiting for an ad and just redirect

const isHttpUrl = (u: string) => /^https?:\/\//i.test(u);

async function requestLink(
  slug: string,
  password: string | undefined,
  signal: AbortSignal,
): Promise<ApiResponse> {
  const url = `/api/links/redirect/${encodeURIComponent(slug)}`;
  const res =
    password === undefined
      ? await fetch(url, { signal })
      : await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
          signal,
        });

  // 401 / 404 / 410 / 429 all carry a JSON { status } body we want to read.
  const data = (await res.json().catch(() => null)) as ApiResponse | null;
  if (!data || typeof data.status !== "string") throw new Error("bad response");
  return data;
}

export function RedirectSlug({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ phase: "checking" });
  const [password, setPassword] = useState("");
  const [monetised, setMonetised] = useState(false);
  const [adFilled, setAdFilled] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);
  const startedRef = useRef(Date.now());

  const onFilled = useCallback(() => setAdFilled(true), []);

  const apply = useCallback((data: ApiResponse) => {
    if ("monetised" in data) setMonetised(data.monetised);

    switch (data.status) {
      case "ok": {
        if (!data.ok) {
          setState({ phase: "warning", url: data.url, reasons: data.reasons });
          return;
        }
        setState({
          phase: "redirecting",
          url: data.url,
          impression:
            data.viewId && data.impressionToken
              ? { viewId: data.viewId, token: data.impressionToken }
              : undefined,
        });
        return;
      }
      case "password_required":
        setState({ phase: "password" });
        return;
      case "wrong_password":
        setState({ phase: "password", error: "Incorrect password." });
        return;
      case "rate_limited":
        setState({
          phase: "password",
          error: "Too many attempts. Try again in a few minutes.",
        });
        return;
      case "expired":
      case "limit_reached":
      case "not_found":
        setState({ phase: "unavailable", reason: data.status });
        return;
    }
  }, []);

  const run = useCallback(
    async (pw?: string) => {
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      startedRef.current = Date.now();

      try {
        const data = await requestLink(slug, pw, ctrl.signal);
        if (!ctrl.signal.aborted) apply(data);
      } catch {
        if (!ctrl.signal.aborted) setState({ phase: "error" });
      }
    },
    [slug, apply],
  );

  useEffect(() => {
    void run();
    return () => ctrlRef.current?.abort();
  }, [run]);

  // Redirect logic. Monetised links wait for an ad to be shown so the view can
  // be confirmed; everything else just waits out the minimum display time.
  useEffect(() => {
    if (state.phase !== "redirecting") return;
    const { url, impression } = state;
    let timer: ReturnType<typeof setTimeout>;

    if (!impression) {
      const wait = Math.max(
        0,
        MIN_DISPLAY_MS - (Date.now() - startedRef.current),
      );
      timer = setTimeout(() => window.location.replace(url), wait);
    } else if (adFilled) {
      const confirmThenGo = async () => {
        try {
          await fetch("/api/links/impression", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(impression),
            keepalive: true,
            signal: AbortSignal.timeout(2000),
          });
        } catch {
          // Never block the visitor on this.
        }
        window.location.replace(url);
      };
      timer = setTimeout(() => void confirmThenGo(), AD_VISIBLE_MS);
    } else {
      timer = setTimeout(() => window.location.replace(url), AD_MAX_WAIT_MS);
    }

    return () => clearTimeout(timer);
  }, [state, adFilled]);

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setState({ phase: "password", submitting: true });
    void run(password);
  };

  const unavailableCopy = {
    expired: {
      title: "This link has expired.",
      body: "The owner set it to stop working after a certain date.",
    },
    limit_reached: {
      title: "This link has hit its limit.",
      body: "It has been used the maximum number of times its owner allowed.",
    },
    not_found: {
      title: "We couldn’t find that link.",
      body: "It may have been deleted or switched off.",
    },
  } as const;

  return (
    <div className="bg-ink fixed inset-0 z-50 flex flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-[420px] flex-col items-start gap-6">
        {(state.phase === "checking" || state.phase === "redirecting") && (
          <>
            <div className="border-stone/30 border-t-accent size-8 animate-spin rounded-full border-2" />
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black">Hopping you over…</h1>
              <p className="text-stone text-sm font-semibold">
                {state.phase === "checking"
                  ? "Making sure the link is safe."
                  : "All good. Redirecting now."}
              </p>
            </div>
            <div className="bg-stone/20 h-1 w-full overflow-hidden rounded-full">
              <div className="bg-accent h-full w-1/3 animate-pulse rounded-full" />
            </div>
          </>
        )}

        {state.phase === "password" && (
          <>
            <p className="text-accent text-6xl leading-none font-black">*</p>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black">Password required.</h1>
              <p className="text-stone text-sm font-semibold">
                The owner protected this link. Enter the password to continue.
              </p>
            </div>

            <form
              onSubmit={submitPassword}
              className="flex w-full flex-col gap-3"
            >
              <input
                type="password"
                autoFocus
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                maxLength={256}
                className="border-stone/30 w-full rounded-lg border bg-transparent px-3 py-2 text-sm font-semibold outline-none focus:border-white/40"
              />
              {state.error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold"
                >
                  {state.error}
                </p>
              )}
              <div className="flex flex-row gap-3">
                <Button
                  type="submit"
                  disabled={!!state.submitting || !password}
                >
                  {state.submitting ? "Checking…" : "Unlock"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (window.location.href = "/")}
                >
                  Take me back
                </Button>
              </div>
            </form>
          </>
        )}

        {state.phase === "unavailable" && (
          <>
            <p className="text-accent text-6xl leading-none font-black">✕</p>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black">
                {unavailableCopy[state.reason].title}
              </h1>
              <p className="text-stone text-sm font-semibold">
                {unavailableCopy[state.reason].body}
              </p>
            </div>
            <Button onClick={() => (window.location.href = "/")}>
              Take me back
            </Button>
          </>
        )}

        {state.phase === "warning" && (
          <>
            <p className="text-accent text-6xl leading-none font-black">!</p>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black">Hold on a second.</h1>
              <p className="text-stone text-sm font-semibold">
                We found a problem with where this link goes:
              </p>
            </div>

            <ul className="flex w-full list-disc flex-col gap-1 rounded-lg border border-red-500/40 bg-red-500/10 py-3 pr-4 pl-8 text-sm font-semibold">
              {state.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>

            <p className="text-stone w-full rounded-lg border border-white/10 p-3 font-mono text-xs break-all">
              {state.url}
            </p>

            <div className="flex flex-row gap-3">
              <Button onClick={() => (window.location.href = "/")}>
                Take me back
              </Button>
              {isHttpUrl(state.url) && (
                <Button
                  variant="outline"
                  onClick={() => window.location.replace(state.url)}
                >
                  Continue anyway
                </Button>
              )}
            </div>
          </>
        )}

        {state.phase === "error" && (
          <>
            <p className="text-accent text-6xl leading-none font-black">:(</p>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black">Couldn’t load this link.</h1>
              <p className="text-stone text-sm font-semibold">
                Something went wrong on our end. Try again in a moment.
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>Try again</Button>
          </>
        )}
      </div>

      {monetised && (
        <div className="absolute bottom-6 left-1/2 w-[calc(100vw-2rem)] max-w-[728px] -translate-x-1/2">
          <AdSlot onFilled={onFilled} />
        </div>
      )}
    </div>
  );
}

/**
 * Real AdSense unit when NEXT_PUBLIC_ADSENSE_CLIENT / _SLOT are set, otherwise
 * a placeholder. `onFilled` fires only when AdSense reports the slot as filled,
 * which is what lets a view become billable.
 *
 * Only mount this after the visitor has accepted advertising cookies where the
 * law requires it (UK/EEA): gate it with your consent state.
 */
export function AdSlot({
  children,
  onFilled,
}: {
  children?: React.ReactNode;
  onFilled?: () => void;
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;
  const configured = !!client && !!slot;
  const devFill =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ADS_DEV_FILL === "true";
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!configured) {
      // Local testing without a real ad account.
      if (devFill) {
        const t = setTimeout(() => onFilled?.(), 500);
        return () => clearTimeout(t);
      }
      return;
    }

    const ins = insRef.current;
    if (!ins) return;

    const check = () => {
      if (ins.getAttribute("data-ad-status") === "filled") {
        onFilled?.();
        return true;
      }
      return false;
    };

    const observer = new MutationObserver(() => {
      if (check()) observer.disconnect();
    });
    observer.observe(ins, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });

    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle ?? []).push({});
    } catch {
      // Ad blockers or script errors: the slot just stays unfilled.
    }

    return () => observer.disconnect();
  }, [configured, devFill, onFilled]);

  return (
    <aside
      aria-label="Advertisement"
      className="flex flex-col items-center gap-1"
    >
      {configured && (
        <Script
          id="adsense-loader"
          async
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        />
      )}
      <span className="text-stone text-[10px] font-semibold tracking-widest uppercase">
        Advertisement
      </span>
      {configured ? (
        <div className="min-h-[90px] w-full overflow-hidden">
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        </div>
      ) : (
        <div className="border-stone/30 text-stone flex h-[90px] w-full items-center justify-center rounded-lg border border-dashed text-xs font-semibold">
          {children ?? "Your ad here"}
        </div>
      )}
    </aside>
  );
}
