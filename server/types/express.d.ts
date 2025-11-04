import { User } from "../../drizzle/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
