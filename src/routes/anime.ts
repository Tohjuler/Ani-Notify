import db from "../lib/db";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";

const route = new OpenAPIHono();

// post /anime/subscribe

const subscribeRoute = createRoute({
    method: "post",
    path: "/subscribe",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z
                        .object({
                            id: z.string(),
                            username: z.string(),
                            animeId: z.string(),
                        }).openapi({
                            required: ["username", "id", "animeId"],
                        }),
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean(),
                    }),
                },
            },
            description: "Ok Response",
        },
        404: {
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                    }),
                    examples: {
                        "User not found": {
                            value: {
                                error: "User not found",
                            },
                        },
                        "Anime not found": {
                            value: {
                                error: "Anime not found",
                            },
                        },
                    },
                },
            },
            description: "Not Found",
        },
        500: {
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                    }),
                },
            },
            description: "Internal Server Error",
        },
    },
    tags: ["Anime"],
});

route.openapi(subscribeRoute, async (c) => {
    const { id, username, animeId } = c.req.valid("json");

    const user = await db.user.findUnique({
        where: { id, username }
    })
        .then((res) => res)
        .catch(() => null)

    if (!user) return c.json({ error: "User not found" }, 404);

    const anime = await db.anime.findUnique({
        where: { id: animeId }
    })
        .then((res) => res)
        .catch(() => null)

    if (!anime) return c.json({ error: "Anime not found" }, 404);

    const res = await db.user.update({
        where: { id, username },
        data: {
            animes: {
                connect: {
                    id: animeId
                }
            }
        }
    })
        .then(() => null)
        .catch(() => c.json({ error: "An error occurred" }, 500))

    return res ? res : c.json({ success: true });
})

// post /anime/unsubscribe

const unsubscribeRoute = createRoute({
    method: "post",
    path: "/unsubscribe",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z
                        .object({
                            id: z.string(),
                            username: z.string(),
                            animeId: z.string(),
                        }).openapi({
                            required: ["username", "id", "animeId"],
                        }),
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean(),
                    }),
                },
            },
            description: "Ok Response",
        },
        404: {
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                    }),
                    examples: {
                        "User not found": {
                            value: {
                                error: "User not found",
                            },
                        },
                        "Anime not found": {
                            value: {
                                error: "Anime not found",
                            },
                        },
                    },
                },
            },
            description: "Not Found",
        },
        500: {
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string(),
                    }),
                },
            },
            description: "Internal Server Error",
        },
    },
    tags: ["Anime"],
});

route.openapi(unsubscribeRoute, async (c) => {
    const { id, username, animeId } = c.req.valid("json");

    const user = await db.user.findUnique({
        where: { id, username }
    })
        .then((res) => res)
        .catch(() => null)

    if (!user) return c.json({ error: "User not found" }, 404);

    const anime = await db.anime.findUnique({
        where: { id: animeId }
    })
        .then((res) => res)
        .catch(() => null)

    if (!anime) return c.json({ error: "Anime not found" }, 404);

    const res = await db.user.update({
        where: { id, username },
        data: {
            animes: {
                disconnect: {
                    id: animeId
                }
            }
        }
    })
        .then(() => null)
        .catch(() => c.json({ error: "An error occurred" }, 500))

    return res ? res : c.json({ success: true });
})

export default route;