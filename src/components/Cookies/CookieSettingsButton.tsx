"use client";

import { resetConsent } from "~/components/Cookies/CookieConsent";
import { Button } from "~/components/ui/button";

export function CookieSettingsButton() {
  return (
    <Button type="button" variant="outline" onClick={resetConsent}>
      Change cookie settings
    </Button>
  );
}
