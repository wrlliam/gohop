import { Check, X } from "@phosphor-icons/react";

import { cn } from "~/lib/utils";
import { passwordRules } from "~/lib/schemas/auth";

type PasswordStrengthProps = {
  value: string;
  showErrors?: boolean;
};

export function PasswordStrength({ value, showErrors = false }: PasswordStrengthProps) {
  const results = passwordRules.map((rule) => ({ ...rule, met: rule.test(value) }));
  const score = results.filter((r) => r.met).length;
  const percent = (score / passwordRules.length) * 100;

  const barColor =
    score === passwordRules.length
      ? "bg-green-500"
      : score >= 3
        ? "bg-amber-500"
        : score >= 1
          ? "bg-orange-500"
          : "bg-transparent";

  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={passwordRules.length}
        aria-valuenow={score}
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="flex flex-col gap-1">
        {results.map(({ id, label, met }) => (
          <li
            key={id}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              met ? "text-green-600" : showErrors ? "text-destructive" : "text-stone",
            )}
          >
            {met ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            <span>{label}</span>
            <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}