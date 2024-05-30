import { prometheus } from "@hono/prometheus";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import * as Sentry from "@sentry/bun";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as fs from "node:fs";
import * as path from "node:path";
import startCron from "./util/cronChecks";
import { performAnimeCheck, performNewAnimeCheck } from "./util/animeUtil";

const app = new OpenAPIHono();

const { printMetrics, registerMetrics } = prometheus();

// Middlewares
if (process.env.DISABLE_SENTRY_DSN !== "true") {
  Sentry.init({
    release: "ani-notify@" + process.env.npm_package_version,
    dsn:
      process.env.SENTRY_DSN ??
      "https://513dd05fe7a697e50f87747cbd6b3108@o4506722572304384.ingest.us.sentry.io/4506920763129856",
    environment: process.env.NODE_ENV,
    enableTracing: true,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
      Sentry.consoleIntegration(),
      Sentry.prismaIntegration(),
      Sentry.inboundFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.linkedErrorsIntegration({ limit: 30 }),
      Sentry.contextLinesIntegration(),
      Sentry.localVariablesIntegration({
        captureAllExceptions: true,
      }),
      Sentry.requestDataIntegration,
    ],
  });
  app.use("*", async (c, next) => {
    await next();
    if (c.error) Sentry.captureException(c.error);
  });
}
app.use(logger());
app.use("*", registerMetrics);
app.use(cors());

if (process.env.API_KEY)
  app.use("/api/*", bearerAuth({ token: process.env.API_KEY }));

// I was not able to get the ip. I will try to fix it later

// const rateLimiter = new Map<string, number>();
// var resetTime: Date = new Date(new Date().getTime() + 60 * 1000);

// // Rate limiter
// app.use(async (c, next) => {
//     let ip = (c.env?.address as any).address;
//     console.log(ip, c.env?.address)
//     if (!ip) {
//         return c.json(
//             { error: "Could not get IP, contact site admin." },
//             { status: 500 }
//         );
//     }

//     if (resetTime.getTime() < new Date().getTime()) {
//         rateLimiter.clear();
//         resetTime = new Date(new Date().getTime() + 60 * 1000);
//     } else {
//         if ((rateLimiter.get(ip) || 0) >= 60)
//             return c.text("Too many requests", {status: 429});
//         else rateLimiter.set(ip, (rateLimiter.get(ip) || 0) + 1);
//     }

//     await next();
// });

// Prometheus metrics
app.get("/metrics", printMetrics);

app.get("/", async (c) => {
  return c.render(fs.readFileSync("./src/routes/index.html", "utf-8"));
});
const loadApi = (ver: string, alias?: string) => {
  const routesPath = path.join(__dirname, "routes", ver);
  for (const file of fs
    .readdirSync(routesPath)
    .filter((f) => f.endsWith(".ts"))) {
    app.route(
      "/api/" + ver + "/" + file.replace(".ts", ""),
      require(path.join(routesPath, file)).default,
    );
    if (alias)
      app.route(
        "/api/" + (alias === "" ? "" : alias + "/") + file.replace(".ts", ""),
        require(path.join(routesPath, file)).default,
      );
  }
};

loadApi("v1", "");

// Docs

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.8.3",
    title: "Ani-Notify",
  },
});

app.get("/ui", swaggerUI({ url: "/doc" }));

startCron();

performNewAnimeCheck();

export default app;
