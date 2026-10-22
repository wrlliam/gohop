import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-6">
      <p className="text-accent text-8xl leading-none font-black">404</p>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black">This link doesn’t hop anywhere.</h1>
        <p className="text-stone text-sm font-semibold">
          The page you’re looking for has moved, expired, or never existed in
          the first place.
        </p>
      </div>

      <div className="flex flex-row gap-3">
        <Button >
          <Link href="/">Back home</Link>
        </Button>
        <Button variant="outline">
          <Link href="/app">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
