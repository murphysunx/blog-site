import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { MikroORM } from "@mikro-orm/core";
import bodyParser from "body-parser";
import connectRedis from "connect-redis";
import cors from "cors";
import express from "express";
import session from "express-session";
import http from "http";
import { createClient } from "redis";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import mikroOrmConfig from "./mikro-orm.config";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { MyContext } from "./types";

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  orm.getMigrator().up();
  // need to use fork() method so avoiding global Entitiy manager error
  // https://stackoverflow.com/a/72799993
  const em = orm.em.fork();

  const app = express();
  const httpServer = http.createServer(app);

  const RedisStore = connectRedis(session);
  // TODO: client not working yet
  const redisClient = createClient({
    legacyMode: true,
  });
  await redisClient.connect();

  app.use(
    session({
      name: "qid",
      store: new RedisStore({
        client: redisClient,
        disableTTL: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 100, // 10 years
        httpOnly: true,
        // sameSite: "lax", // csrf
        // secure: __prod__, // cookie only works in https
        sameSite: "none",
        secure: true,
      },
      saveUninitialized: true,
      secret: "wfwefwfcvw",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer<MyContext>({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
  });

  await apolloServer.start();

  app.use(
    cors({
      credentials: true,
      origin: "https://studio.apollographql.com",
    }),
    bodyParser.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => ({ req, res, em }),
    })
  );

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 4000 }, resolve)
  );

};

main().catch((err) => {
  console.error(err);
});
