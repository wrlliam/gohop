"use client";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { authClient } from "~/server/better-auth/client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Logout
    </Button>
  );
}
