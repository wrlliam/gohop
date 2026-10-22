import Link from "next/link";
import type React from "react";

export const GITHUB_LINK = "https://github.com/wrlliam/gohop";

export const NAV_ITEMS = [
  { text: "Home", href: "/" },
  { text: "About", href: "/" },
  { text: "Getting Started", href: "/login" },
];

export const LOGGED_IN_LINKS = [
  { text: "Dashboard", href: "/app" },
  { text: "Monitization", href: "/app/monitization" },
  { text: "Create Link", href: "/app/create" },
];

export type NavitemProps = {
  text: string;
  href: string;
  className?: string;
};

export function Navitem({ text, href, className = "" }: NavitemProps) {
  return (
    <Link
      href={href}
      className={`${className} nav_item smooth_transition text-stone hover:text-paper text-sm font-semibold`}
    >
      {text}
    </Link>
  );
}

export type NavIconProps = {
  icon: React.ReactElement | React.ReactNode;
};

export function NavIcon({ icon }: NavIconProps) {
  return <i className="text-accent">{icon}</i>;
}
