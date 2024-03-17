import { User } from "@prisma/client";
import db from "../lib/db";
import { addAnimeIfNotFound as addAnimesIfNotFound } from "../util/animeUtil";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { TypedResponse } from "hono/types";

const route = new OpenAPIHono();

// GET /user/{id}/{username}

const getRoute = createRoute({
    method: "get",
    path: "/{id}/{username}",
    request: {
        params: z.object({
            id: z.string().openapi({
                param: {
                    name: "id",
                    in: "path",
                },
                type: "string",
                example: "27657382-e166-4ddc-851f-7f51de93775d",
            }),
            username: z.string().openapi({
                param: {
                    name: "username",
                    in: "path",
                },
                type: "string",
                example: "tohjuler",
            }),
        }),
    },
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.object({
                        id: z.string(),
                        username: z.string(),
                        discord_webhook: z.string().nullable(),
                        ntfy_url: z.string().nullable(),

                        createdAt: z.string(),
                        updatedAt: z.string(),
                    }),
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
    tags: ["User"],
});

route.openapi(getRoute, async (c) => {
    const { id, username } = c.req.valid("param");

    const user = await db.user
        .findUnique({
            where: { id, username },
        })
        .then((res) => res)
        .catch(() => null);

    return user ? c.json(user) : c.json({ error: "User not found" }, 404);
});

// POST /user/register

const registerRoute = createRoute({
    method: "post",
    path: "/register",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z
                        .object({
                            id: z.string().nullable().default(null),
                            username: z.string(),
                            discord_webhook: z
                                .string()
                                .nullable()
                                .default(null),
                            ntfy_url: z.string().nullable().default(null),
                            animes: z
                                .array(z.string())
                                .nullable()
                                .default(null),
                        })
                        .openapi({
                            required: ["username"],
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
                        user: z.object({
                            id: z.string(),
                            username: z.string(),
                            discord_webhook: z.string().nullable(),
                            ntfy_url: z.string().nullable(),
                            createdAt: z.string(),
                            updatedAt: z.string(),
                        }),
                    }),
                },
            },
            description: "Ok Response",
        },
        400: {
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string().default("Username already taken"),
                    }),
                },
            },
            description: "Bad Request",
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
    tags: ["User"],
});

route.openapi(registerRoute, async (c) => {
    const { id, username, discord_webhook, ntfy_url, animes } =
        c.req.valid("json");

    if (animes)
        await addAnimesIfNotFound(animes).catch((e) =>
            c.get("sentry").captureException(e)
        );

    const res: { user?: User; error?: any } =
        await db.user
            .create({
                data: {
                    ...(id ? { id } : {}),
                    username,
                    discord_webhook,
                    ntfy_url,
                    ...(animes
                        ? {
                              animes: {
                                  connect: animes.map((id: string) => ({ id })),
                              },
                          }
                        : {}),
                },
            })
            .then((res) => ({
                user: res
            }))
            .catch((e) => {
                if (e.code === "P2002")
                    return {
                        error: c.json({ error: "Username already taken" }, 400),
                    };
                c.get("sentry").captureException(e);
                return {
                    error: c.json({ error: "An error occurred" }, 500),
                };
            });

    return res.error
        ? res.error
        : c.json({
              success: true,
              user: res.user,
          });
});

// PUT /user/update

const UpdateRoute = createRoute({
    method: "put",
    path: "/update",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z
                        .object({
                            id: z.string(),
                            username: z.string(),
                            discord_webhook: z.string().nullable(),
                            ntfy_url: z.string().nullable(),
                        })
                        .openapi({
                            required: ["id", "username"],
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
        403: {
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string().default("Editing is disabled"),
                    }),
                },
            },
            description: "Forbidden",
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
    tags: ["User"],
});

route.openapi(UpdateRoute, async (c) => {
    const { id, username, discord_webhook, ntfy_url } = c.req.valid("json");

    if (process.env.ALLOW_EDIT !== "true")
        return c.json({ error: "Editing is disabled" }, 403);

    const res = await db.user
        .update({
            where: { id, username },
            data: {
                discord_webhook,
                ntfy_url,
            },
        })
        .then(() => null)
        .catch((e) => {
            c.get("sentry").captureException(e);
            return c.json({ error: "An error occurred" }, 500);
        });

    return res ? res : c.json({ success: true });
});

// DELETE /user/delete

const deleteRoute = createRoute({
    method: "delete",
    path: "/delete",
    request: {
        body: {
            content: {
                "application/json": {
                    schema: z
                        .object({
                            id: z.string(),
                            username: z.string(),
                        })
                        .openapi({
                            required: ["id", "username"],
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
        403: {
            content: {
                "application/json": {
                    schema: z.object({
                        error: z.string().default("Deletion is disabled"),
                    }),
                },
            },
            description: "Forbidden",
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
    tags: ["User"],
});

route.openapi(deleteRoute, async (c) => {
    const { id, username } = await c.req.json();

    if (process.env.ALLOW_DELETE !== "true")
        return c.json({ error: "Deletion is disabled" }, 403);

    const res = await db.user
        .delete({
            where: { id, username },
        })
        .then(() => null)
        .catch((e) => {
            c.get("sentry").captureException(e);
            return c.json({ error: "An error occurred" }, 500);
        });

    return res ? res : c.json({ success: true });
});

export default route;
