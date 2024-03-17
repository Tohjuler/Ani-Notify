import { Anime } from "@prisma/client";
import db from "../lib/db";
import { getNewEps } from "../util/consumet";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";

const route = new OpenAPIHono();

interface Episode {
    title: string | null;
    number: number;
    providers: string;
    dub: boolean;
    releasedAt: string;
    anime: {
        id: string;
        title: string | null;
        status: string;
        totalEps: number;
        createdAt: string;
        updatedAt: string;
    } | null;
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
                    schema: z.array(
                        z.object({
                            title: z.string().nullable(),
                            number: z.number(),
                            providers: z.string(),
                            dub: z.boolean(),
                            releasedAt: z.string(),
                            anime: z
                                .object({
                                    id: z.string(),
                                    title: z.string().nullable(),
                                    status: z.string(),
                                    totalEps: z.number(),
                                    createdAt: z.string(),
                                    updatedAt: z.string(),
                                })
                                .nullable(),
                        })
                    ),
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
        where: { id: userId },
    });

    if (!user) return c.json({ error: "User not found" }, 404);

    // Get eps from db there is created in the last 5 (loaded from env) days
    const eps: Episode[] = await db.episode
        .findMany({
            where: {
                anime: {
                    users: {
                        some: {
                            id: userId,
                        },
                    },
                },
                createdAt: {
                    gte: new Date(
                        new Date().getTime() -
                            parseInt(process.env.NEW_EP_TIME || "5") *
                                24 *
                                60 *
                                60 *
                                1000
                    ), // Default 5 days
                },
            },
            include: {
                anime: true,
            },
        })
        .then((res) =>
            res.map((ep) => ({
                title: ep.title,
                number: ep.number,
                providers: ep.providers,
                dub: ep.dub,
                releasedAt: ep.releaseAt.toISOString(),
                anime: ep.anime
                    ? {
                          id: ep.anime.id,
                          title: ep.anime.title,
                          status: ep.anime.status,
                          totalEps: ep.anime.totalEps,
                          createdAt: ep.anime.createdAt.toISOString(),
                          updatedAt: ep.anime.updatedAt.toISOString(),
                      }
                    : null,
            }))
        )
        .catch((e) => {
            c.get("sentry").captureException(e);
            return [];
        });

    // Check for new episodes, if the cron job is not running
    if (!process.env.CRON && process.env.INTELLIGENT_CHECKS === "false")
        await db.anime
            .findMany({
                where: {
                    status: "RELEASING",
                    users: {
                        some: {
                            id: userId,
                        },
                    },
                },
                include: {
                    episodes: true,
                },
            })
            .then(async (animes) => {
                for (const anime of animes) {
                    const newEps = await getNewEps(anime);

                    eps.push(
                        ...newEps.map((ep) => ({
                            title: ep.title,
                            number: ep.number,
                            providers: ep.providers,
                            dub: ep.dub,
                            releasedAt: new Date().toISOString(),
                            anime: {
                                id: anime.id,
                                title: anime.title,
                                status: anime.status,
                                totalEps: anime.totalEps,
                                createdAt: anime.createdAt.toISOString(),
                                updatedAt: anime.updatedAt.toISOString(),
                            },
                        }))
                    );
                }
            })
            .catch((e) => c.get("sentry").captureException(e));

    return c.json(eps);
});

export default route;
