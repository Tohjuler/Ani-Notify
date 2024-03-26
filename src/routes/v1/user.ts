import { User } from "@prisma/client";
import db from "../../lib/db";
import {
    AnimesRes,
    addAnime,
    addAnimesIfNotFound as addAnimesIfNotFound,
} from "../../util/animeUtil";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import * as Sentry from "@sentry/bun";
import { getUserId, updateUser } from "../../util/aniListUtil";

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
                            id: z.string().nullable(),
                            username: z.string(),
                            discord_webhook: z.string().nullable(),
                            ntfy_url: z.string().nullable(),
                            animes: z.array(z.string()).nullable(),
                            anilist: z.string().nullable(),
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
                            anilist_id: z.string().nullable(),
                            createdAt: z.string(),
                            updatedAt: z.string(),
                        }),
                        failedAnimes: z.array(z.string()).nullable().openapi({
                            description:
                                "Animes that failed to fetch, is it must likely because they don't exist.",
                        }),
                        queuedAnimes: z.array(z.string()).nullable().openapi({
                            description:
                                "Animes that are queued to be fetched, it will be done within 2-3 minutes.",
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
    const { id, username, discord_webhook, ntfy_url, animes, anilist } =
        c.req.valid("json");

    let addAnimesRes: AnimesRes | null = null;
    if (animes) {
        addAnimesRes = await addAnimesIfNotFound(animes).catch((e) => {
            Sentry.captureException(e);
            return null;
        });

        if (addAnimesRes === null)
            return c.json({ error: "An error occurred" }, 500);
    }

    const aniListId: string | null = anilist ? await getUserId(anilist) : null;

    const res: { user?: User; error?: any } = await db.user
        .create({
            data: {
                ...(id ? { id } : {}),
                username,
                discord_webhook,
                ntfy_url,
                ...(aniListId ? { aniListId } : {}),
                ...(animes
                    ? {
                          animes: {
                              connect: animes
                                  .filter(
                                      (a) =>
                                          !addAnimesRes?.failedAnime.includes(
                                              a
                                          ) &&
                                          !addAnimesRes?.queuedAnime.includes(a)
                                  )
                                  .map((id: string) => ({ id })),
                          },
                      }
                    : {}),
            },
        })
        .then((res) => {
            if (addAnimesRes)
                addAnimesRes.queuedAnime.forEach((id) => addAnime(id, res));

            return {
                user: res,
            };
        })
        .catch((e) => {
            if (e.code === "P2002")
                return {
                    error: c.json({ error: "Username already taken" }, 400),
                };
            Sentry.setContext("user", {
                id,
                username,
                discord_webhook,
                ntfy_url,
                animes,
                aniListId,
            });
            Sentry.captureException(e);
            return {
                error: c.json({ error: "An error occurred" }, 500),
            };
        });

    if (res.user && aniListId)
        updateUser(res.user, animes || []).catch((e) => Sentry.captureException(e));

    return res.error
        ? res.error
        : c.json({
              success: true,
              user: res.user,
              failedAnimes: addAnimesRes?.failedAnime,
              queuedAnimes: addAnimesRes?.queuedAnime,
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
                            anilist: z.string().nullable(),
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
    const { id, username, discord_webhook, ntfy_url, anilist } = c.req.valid("json");

    if (process.env.ALLOW_EDIT !== "true")
        return c.json({ error: "Editing is disabled" }, 403);

    const aniListId = anilist ? await getUserId(anilist) : null;

    const res = await db.user
        .update({
            where: { id, username },
            data: {
                discord_webhook,
                ntfy_url,
                ...(aniListId ? { aniListId } : {})
            },
        })
        .then(() => null)
        .catch((e) => {
            Sentry.captureException(e);
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
            Sentry.captureException(e);
            return c.json({ error: "An error occurred" }, 500);
        });

    return res ? res : c.json({ success: true });
});

export default route;
