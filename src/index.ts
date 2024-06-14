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
import { setupDefauls } from "./util/settingsHandler";
import db from "./lib/db";
import { generateString } from "./util/util";

const app = new OpenAPIHono();

const { printMetrics, registerMetrics } = prometheus();

// Middlewares
// ---
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
        if (c.req.path.includes("/admin")) return;
        if (c.error) Sentry.captureException(c.error);
    });
}
app.use(logger());
app.use("*", registerMetrics);
app.use(cors());

if (process.env.API_KEY)
    app.use("/api/*", bearerAuth({ token: process.env.API_KEY }));

// Prometheus metrics
// ---
app.get("/metrics", printMetrics);

// Index
// ---
app.get("/", async (c) => {
    return c.render(fs.readFileSync("./src/routes/index.html", "utf-8"));
});

// Init Settings
// ---
setupDefauls();

// Routes
// ---
const loadApi = (ver: string, alias?: string) => {
    const routesPath = path.join(__dirname, "routes", ver);
    const router = new OpenAPIHono();
    for (const file of fs
        .readdirSync(routesPath)
        .filter((f) => f.endsWith(".ts"))) {
        router.route(
            "/" + file.replace(".ts", ""),
            require(path.join(routesPath, file)).default
        );
    }
    router.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
        type: "http",
        scheme: "bearer",
    });
    router.doc("/doc", {
        openapi: "3.0.0",
        info: {
            version: ver,
            title: "Ani-Notify",
        },
        servers: [
            {
                url: "/api/" + ver,
                description: "Current environment",
            },
        ],
    });

    app.route("/api/" + ver, router);
    app.route("/api/" + (alias === "" ? "" : alias + "/"), router);
};

loadApi("v1", "");

// Docs
// ---

app.doc("/doc", {
    openapi: "3.0.0",
    info: {
        version: "1.9.2",
        title: "Ani-Notify",
    },
});

const swaggerV1 = swaggerUI({
    url: "/api/v1/doc",
});
app.get("/ui", swaggerV1);
app.get("/ui/v1", swaggerV1);

// Start cron jobs
// ---
startCron();

// Api Keys
// ---
db.apiKey.findMany({ where: { admin_access: true } }).then(async (keys) => {
    if (keys.length !== 0) return;

    console.log("No admin API keys found, generating one.");
    const key = generateString(32);
    await db.apiKey.create({
        data: {
            key: key,
            admin_access: true,
        },
    });
    console.log("Key: " + key);
});

export default app;
