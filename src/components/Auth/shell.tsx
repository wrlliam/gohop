import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="max-w-8xl mx-auto  flex flex-col mt-[10rem]">
      <div className="flex flex-col gap-1 mb-[2rem]">
        <h1 className="text-lg font-bold">
          Welcome to go<span className="text-accent">Hop</span>
        </h1>

        <p className="text-stone max-w-[400px] text-sm">
          Share links, track popularity, get paid for your views and so much
          more.
        </p>
      </div>
      {children}
    </div>
  );
}
