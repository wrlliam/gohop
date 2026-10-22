"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  requestWithdrawal,
  setLinkMonetisation,
} from "~/server/actions/monetisation";

export function LinkMonetisationSwitch({
  linkId,
  enabled,
  label,
}: {
  linkId: number;
  enabled: boolean;
  label: string;
}) {
  const [checked, setChecked] = useState(enabled);
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={checked}
      disabled={pending}
      aria-label={label}
      onCheckedChange={(next) => {
        setChecked(next); // optimistic
        startTransition(async () => {
          const result = await setLinkMonetisation(linkId, next);
          if (!result.ok) {
            setChecked(!next);
            toast.error(result.error);
            return;
          }
          toast.success(
            next
              ? "Monetisation turned on for this link."
              : "Monetisation turned off. No ads will show on this link.",
          );
        });
      }}
    />
  );
}

export function WithdrawButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await requestWithdrawal();
          if (result.ok) toast.success(result.message ?? "Withdrawal sent.");
          else toast.error(result.error);
        })
      }
    >
      {pending ? "Sending…" : label}
    </Button>
  );
}
