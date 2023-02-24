import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request, Response } from "express";

// https://akoskm.com/how-to-use-express-session-with-custom-sessiondata-typescript
declare module "express-session" {
  interface SessionData {
    userID: number;
  }
}

export type MyContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
  req: Request;
  res: Response;
};
