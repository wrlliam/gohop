"use client";

import { redirect } from "next/navigation";
import { useUser } from "~/components/Auth/userProvider";

export default function HomePage() {
  const user = useUser();
  if (user) {
    redirect("/app");
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex flex-col gap-1"></div>
    </div>
  );
}
