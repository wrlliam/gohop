"use client";

import { Toaster } from "sonner";

/**
 * Sonner styled with the app's own tokens (ink / paper / stone / accent) and
 * the same shapes used elsewhere: rounded-lg bordered panels, square buttons,
 * font-black titles and font-semibold stone body text.
 *
 * The leading ! forces these over Sonner's built-in styles.
 */
export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "!bg-ink !text-paper !border !border-stone/30 !rounded-lg !shadow-lg !font-sans !gap-3",
          title: "!text-sm !font-black",
          description: "!text-xs !font-semibold !text-stone",
          icon: "!text-paper",
          success: "!border-accent/50 [&_[data-icon]]:!text-accent",
          error:
            "!border-red-500/50 !bg-red-500/10 [&_[data-icon]]:!text-red-400",
          warning: "!border-accent/50 [&_[data-icon]]:!text-accent",
          info: "!border-stone/60",
          actionButton: "!bg-accent !text-ink !rounded-none !font-bold",
          cancelButton: "!bg-stone/20 !text-paper !rounded-none !font-bold",
          closeButton: "!bg-ink !text-paper !border-stone/30",
        },
      }}
    />
  );
}
