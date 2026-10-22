"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";

type ApiResponse =
  | {
      status: "ok";
      monetised: boolean;
      url: string;
      ok: boolean;
      reasons: string[];
    }
  | { status: "password_required"; monetised: boolean }
  | { status: "wrong_password" }
  | { status: "rate_limited" }
  | { status: "expired" }
  | { status: "limit_reached" }
  | { status: "not_found" };

type State =
  | { phase: "checking" }
  | { phase: "redirecting"; url: string }
  | { phase: "password"; error?: string; submitting?: boolean }
  | { phase: "warning"; url: string; reasons: string[] }
  | { phase: "unavailable"; reason: "expired" | "limit_reached" | "not_found" }
  | { phase: "error" };

const MIN_DISPLAY_MS = 1500; // 1.5s

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ctrlRef = useRef<AbortController | null>(null);

  const apply = useCallback((data: ApiResponse, started: number) => {
    if ("monetised" in data) setMonetised(data.monetised);
    switch (data.status) {
      case "ok": {
        if (!data.ok) {
          setState({ phase: "warning", url: data.url, reasons: data.reasons });
          return;
        }
        setState({ phase: "redirecting", url: data.url });
        const wait = Math.max(0, MIN_DISPLAY_MS - (Date.now() - started));
        timerRef.current = setTimeout(
          () => window.location.replace(data.url),
          wait,
        );
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
      const started = Date.now();

      try {
        const data = await requestLink(slug, pw, ctrl.signal);
        if (!ctrl.signal.aborted) apply(data, started);
      } catch {
        if (!ctrl.signal.aborted) setState({ phase: "error" });
      }
    },
    [slug, apply],
  );

  useEffect(() => {
    void run();
    return () => {
      ctrlRef.current?.abort();
      clearTimeout(timerRef.current);
    };
  }, [run]);

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
                <Button type="submit" disabled={state.submitting || !password}>
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
          <AdSlot />
        </div>
      )}
    </div>
  );
}

export function AdSlot({ children }: { children?: React.ReactNode }) {
  return (
    <aside
      aria-label="Advertisement"
      className="flex flex-col items-center gap-1"
    >
      <span className="text-stone text-[10px] font-semibold tracking-widest uppercase">
        Advertisement
      </span>
      <div className="border-stone/30 text-stone flex h-[90px] w-full items-center justify-center rounded-lg border border-dashed text-xs font-semibold">
        {children ?? "Your ad here"}
      </div>
    </aside>
  );
}
