import db from "../lib/db";
import { getNewEps } from "../util/consumet";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";

const route = new OpenAPIHono();

interface Episode {
    title: string;
    number: number;
    providers: string;
    dub: boolean;
    releasedAt: string;
}

// GET /notifications/{userId}

const getRoute = createRoute({
    method: "get",
    path: "/{userId}",
    request: {
        params: z.object({
            userId: z.string().openapi({
                param: {
                    name: "userId",
                    in: "path",
                },
                type: "string",
                example: "27657382-e166-4ddc-851f-7f51de93775d",
            }),
        }),
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.array(z.object({
                        title: z.string(),
                        number: z.number(),
                        providers: z.string(),
                        dub: z.boolean(),
                        releasedAt: z.string(),
                    })),
                },
            },
            description: "Ok Response",
        },
        404: {
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string().default("User not found"),
                    }),
                },
            },
            description: "Not Found",
        },
    },
    tags: ["Notifications"],
});

route.openapi(getRoute, async (c) => {
    const { userId } = c.req.valid("param");

    const user = await db.user.findUnique({
        where: { id: userId }
    });

    if (!user) return c.json({ error: "User not found" }, 404);

    // Get eps from db there is created in the last 5 (loaded from env) days
    const eps: Episode[] = await db.episode.findMany({
        where: {
            anime: {
                users: {
                    some: {
                        id: userId
                    }
                }
            },
            createdAt: {
                gte: new Date(new Date().getTime() - parseInt(process.env.NEW_EP_TIME || "5") * 24 * 60 * 60 * 1000) // Default 5 days
            }
        }
    }).then((res) => res.map((ep) => ({
        title: ep.title,
        number: ep.number,
        providers: ep.providers,
        dub: ep.dub,
        releasedAt: ep.createdAt.toISOString()
    }))).catch(() => []);

    // Check for new episodes, if the cron job is not running
    if (!process.env.CRON)
        await db.anime.findMany({
            where: {
                status: 'RELEASING',
                users: {
                    some: {
                        id: userId
                    }
                }
            },
            include: {
                episodes: true
            }
        }).then(async (animes) => {
            for (const anime of animes) {
                const newEps = await getNewEps(anime);

                eps.push(...newEps.map((ep) => ({
                    title: ep.title,
                    number: ep.number,
                    providers: ep.providers,
                    dub: ep.dub,
                    releasedAt: new Date().toISOString()
                })));
            }
        })

    return c.json(eps);
})

export default route;