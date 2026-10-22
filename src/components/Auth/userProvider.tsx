"use client";
import { createContext, useContext } from "react";
import type { auth } from "~/server/better-auth";

type User = (typeof auth.$Infer.Session)["user"] | null;

const UserContext = createContext<User>(null);

export function UserProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
