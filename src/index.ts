import { logger } from "hono/logger";
import { getNewEps } from "./util/consumet";
import sendNotifications from "./util/notifications";
import db from "./lib/db";
import * as fs from "node:fs";
import * as path from "node:path";
import * as cron from "node-cron";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { sentry } from "@hono/sentry";
import { prometheus } from "@hono/prometheus";
import { compress } from "hono/compress";

const app = new OpenAPIHono();

const { printMetrics, registerMetrics } = prometheus();

// Middlewares
if (process.env.DISABLE_SENTRY_DSN !== "true")
    app.use(
        "*",
        sentry({
            dsn:
                process.env.SENTRY_DSN ??
                "https://513dd05fe7a697e50f87747cbd6b3108@o4506722572304384.ingest.us.sentry.io/4506920763129856",
            environment: process.env.NODE_ENV,
            enableTracing: true,
        })
    );
app.use(logger());
app.use(compress());
app.use("*", registerMetrics);

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
    return c.text("Welcome to Ani-Notify!");
});

const routesPath = path.join(__dirname, "routes");
for (const file of fs.readdirSync(routesPath))
    app.route(
        file.replace(".ts", ""),
        require(path.join(routesPath, file)).default
    );

if (process.env.CRON)
    cron.schedule(process.env.CRON, async () => {
        await db.anime
            .findMany({
                where: {
                    status: "RELEASING",
                },
                include: {
                    episodes: true,
                },
            })
            .then(async (animes) => {
                for (const anime of animes) {
                    const newEps = await getNewEps(anime);

                    // Send notifications
                    if (newEps.length > 0) {
                        for (const ep of newEps) sendNotifications(anime, ep);
                    }
                }
            });
    });

// Docs

app.doc("/doc", {
    openapi: "3.0.0",
    info: {
        version: "0.1.0",
        title: "Ani-Notify",
    },
});

app.get("/ui", swaggerUI({ url: "/doc" }));

export default app;
