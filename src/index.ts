import { Hono } from 'hono'
import { logger } from 'hono/logger';
import { getNewEps } from './util/consumet';
import sendNotifications from './util/notifications';
import db from './lib/db';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cron from 'node-cron';
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

const app = new OpenAPIHono()

app.use(logger())

app.get('/', async (c) => {
    return c.text('Welcome to Ani-Notify!')
})

const routesPath = path.join(__dirname, 'routes');
for (const file of fs.readdirSync(routesPath))
    app.route(file.replace('.ts', ''), require(path.join(routesPath, file)).default);

if (process.env.CRON)
    cron.schedule(process.env.CRON, async () => {
        await db.anime.findMany({
            where: {
                status: 'RELEASING'
            },
            include: {
                episodes: true
            }
        }).then(async (animes) => {
            for (const anime of animes) {
                const newEps = await getNewEps(anime);

                // Send notifications 
                if (newEps.length > 0) {
                    for (const ep of newEps)
                        sendNotifications(anime, ep);
                }
            }
        })
    })

// Docs

app.doc("/doc", {
    openapi: "3.0.0",
    info: {
        version: "0.1.0",
        title: "Ani-Notify",
    },
});

app.get("/ui", swaggerUI({ url: "/doc" }));

export default app
