import Image from "next/image";
import LogoFull from "~/../public/logo_full.png";
import { GITHUB_LINK } from "./nav-items";
import { NavLinks } from "./NavLinks";
import { Button } from "../ui/button";
import { auth } from "~/server/better-auth";
import { getUser } from "~/lib/session";
import { LogoutButton } from "./LogoutButton";

export default async function Navbar() {
  const user = await getUser()
  return (
    <div className="align-items flex flex-row items-center justify-evenly px-6 py-4">
      <a className="flex flex-row items-center justify-center gap-3" href="/">
        <Image src={LogoFull} alt="goHop Logo" className="h-[40px] w-fit" />
        <h1 className="text-2xl font-black">gohop</h1>
      </a>

      <NavLinks />

      <div className="flex flex-row gap-3 items-center justify-center">
        <a
          href={GITHUB_LINK}
          className="smooth_transition text-stone hover:text-paper"
        >
          <i className="fa-brands fa-github"></i>
        </a>

        {user && <LogoutButton/>}
      </div>
    </div>
  );
}
