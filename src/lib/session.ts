import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "~/server/better-auth/";

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export const getUser = cache(async () => (await getSession())?.user ?? null);
