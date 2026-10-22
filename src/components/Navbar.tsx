import Image from "next/image";
import LogoFull from "../../public/logo_full.png";
import type React from "react";
import { headers } from "next/headers";
import { useUser } from "./Auth/userProvider";
import { Button } from "./ui/button";
import { auth } from "~/server/better-auth";

export const GITHUB_LINK = "https://github.com/wrlliam/gohop";

export const NAV_ITEMS = [
  {
    text: "Home",
    href: "/",
  },
  {
    text: "About",
    href: "/",
  },
  {
    text: "Getting Started",
    href: "/login",
  },
];

export const LOGGED_IN_LINKS = [
  {
    text: "Dashboard",
    href: "/app",
  },
  {
    text: "Monitization",
    href: "/app/monitization",
  },
  {
    text: "Create Link",
    href: "/app/create",
  },
];

export default async function Navbar({ path = "" }) {
  const pathname = (await headers()).get("x-current-path") as string;
  const user = await auth.api.getSession();

  
  return (
    <div className="align-items flex flex-row items-center justify-evenly px-6 py-4">
      <a className="flex flex-row items-center justify-center gap-3" href="/">
        <Image src={LogoFull} alt="goHop Logo" className="h-[40px] w-fit" />
        <h1 className="text-2xl font-black">gohop</h1>
      </a>
      <div className="flex flex-row gap-3">
        {!pathname.toString().split("/")[1]?.startsWith("app") ? (
          <>
            {NAV_ITEMS.map((item, i) => (
              <Navitem key={i} {...item} />
            ))}
          </>
        ) : (
          <>
            {LOGGED_IN_LINKS.map((item, i) => (
              <Navitem key={i} {...item} />
            ))}
          </>
        )}
      </div>
      <div className="flex flex-row gap-3">
        <a
          href={GITHUB_LINK}
          className="smooth_transition text-stone hover:text-paper"
        >
          <i className="fa-brands fa-github"></i>
        </a>
        
        {user && <Button onClick={() => auth.api.signOut()}>Logout</Button>}
      </div>
    </div>
  );
}

export type NavitemProps = {
  text: string;
  href: string;
  className?: string;
};
export function Navitem(props: NavitemProps) {
  return (
    <a
      href={props.href}
      className={`${props.className} nav_item smooth_transition text-stone hover:text-paper text-sm font-semibold`}
    >
      {props.text}
    </a>
  );
}

export type NavIconProps = {
  icon: React.ReactElement | React.ReactNode;
};
export function NavIcon(props: NavIconProps) {
  return <i className="text-accent">{props.icon}</i>;
}
