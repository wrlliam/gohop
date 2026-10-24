import type { ReactNode } from "react";
import { LEGAL } from "~/lib/legal";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  const unfilled = Object.values(LEGAL).some((v) => v.startsWith("["));

  return (
    <article className="w-full max-w-2xl self-center pb-16">
      {unfilled && process.env.NODE_ENV !== "production" && (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold"
        >
          Fill in the placeholders in src/lib/legal.ts, and have a solicitor
          review these pages, before launch.
        </p>
      )}
      <header className="border-stone/30 flex flex-col gap-2 border-b pb-6">
        <h1 className="text-4xl font-black tracking-tight">{title}</h1>
        <p className="text-stone text-sm font-semibold">
          Last updated {LEGAL.lastUpdated}
        </p>
        {intro && <p className="text-stone font-semibold">{intro}</p>}
      </header>
      <div className="mt-8 flex flex-col gap-4">{children}</div>
    </article>
  );
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-6 scroll-mt-24 text-2xl font-black tracking-tight"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 text-lg font-black">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed font-medium">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed font-medium">
      {children}
    </ul>
  );
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      className="text-accent underline underline-offset-2"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export function LegalTable({
  head,
  rows,
}: {
  head: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-stone/30 border-b">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-black">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-stone/30 border-b align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 font-medium">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
