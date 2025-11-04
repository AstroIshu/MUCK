import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Use the user already set by Express middleware to avoid redundant authentication
  // The Express middleware in server/_core/index.ts already calls authenticateRequest
  // and sets req.user, so we don't need to authenticate again here
  const user: User | null = opts.req.user ?? null;

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
