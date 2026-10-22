import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { authClient } from "~/server/better-auth/client";
import { error } from "~/lib/logger";

export default function GithubButton({ callbackUrl = "/app" }) {
  const [loading, setLoading] = useState(false);
  const signInWithGithub = async () => {
    setLoading(true);
    try {
      const { error: err } = await authClient.signIn.social({
        provider: "github",
        callbackURL: callbackUrl,
      });

      if (err) {
        throw new Error(err as any);
      }

      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (err) {
      toast.error("Error logging in with github, please try again soon.");
      error(JSON.parse(err as any));
    }
  };
  return (
    <Button
      variant={"secondary"}
      className={"w-full"}
      onClick={() => signInWithGithub()}
    >
      <i className="fa-brands fa-github"></i>
      Continue with Github
    </Button>
  );
}
