import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export function FormShell({ children, title, description }: AuthShellProps) {
  return (
    <div className="w-full">
      <div className="mb-[2rem] flex flex-col gap-1 w-full">
        <h1 className="text-lg font-bold">{title}</h1>

        <p className="text-stone max-w-[400px] text-sm">{description}</p>
      </div>
      {children}
    </div>
  );
}
