"use client";

import { usePathname } from "next/navigation";
import { LOGGED_IN_LINKS, NAV_ITEMS, Navitem } from "./nav-items";

export function NavLinks() {
  const pathname = usePathname() ?? "";
  const inApp = pathname.split("/")[1]?.startsWith("app");
  const items = inApp ? LOGGED_IN_LINKS : NAV_ITEMS;

  return (
    <div className="flex flex-row gap-3">
      {items.map((item) => (
        <Navitem key={item.href + item.text} {...item} />
      ))}
    </div>
  );
}
