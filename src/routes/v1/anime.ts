import db from "../../lib/db";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import * as Sentry from "@sentry/bun";
import { addAnimeToUser } from "../../util/animeUtil";

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
            })
            .openapi({
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

  const user = await db.user
    .findUnique({
      where: { id, username },
    })
    .then((res) => res)
    .catch((e) => {
      Sentry.captureException(e);
      return null;
    });

  if (!user) return c.json({ error: "User not found" }, 404);

  const res: Error | null = await addAnimeToUser(animeId, user)
    .then(() => null)
    .catch((e) => e);

  return res
    ? c.json({ error: res.message }, 500)
    : c.json({ success: true }, 200);
});

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
            })
            .openapi({
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

  const user = await db.user
    .findUnique({
      where: { id, username },
    })
    .then((res) => res)
    .catch((e) => {
      Sentry.captureException(e);
      return null;
    });

  if (!user) return c.json({ error: "User not found" }, 404);

  const anime = await db.anime
    .findUnique({
      where: { id: animeId },
    })
    .then((res) => res)
    .catch((e) => {
      Sentry.captureException(e);
      return null;
    });

  if (!anime) return c.json({ error: "Anime not found" }, 404);

  const res = await db.user
    .update({
      where: { id, username },
      data: {
        animes: {
          disconnect: {
            id: animeId,
          },
        },
      },
    })
    .then(() => null)
    .catch((e) => {
      Sentry.captureException(e);
      return c.json({ error: "An error occurred" }, 500);
    });

  return res ? res : c.json({ success: true }, 200);
});

const currentlyTrackingRoute = createRoute({
  method: "get",
  path: "/currently-tracking",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.string(),
              title: z.string().nullable(),
              subEpisodes: z.number(),
              dubEpisodes: z.number(),
              totalEpisodes: z.number(),
              status: z.string(),
              createdAt: z.string(),
              updatedAt: z.string(),
            }),
          ),
        },
      },
      description: "Ok Response",
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

route.openapi(currentlyTrackingRoute, async (c) => {
  const animes = await db.anime
    .findMany()
    .then(async (res) =>
      Promise.all(
        res.map(async (ani) => ({
          id: ani.id,
          title: ani.title,
          subEpisodes: await db.episode.count({
            where: { animeId: ani.id, dub: false },
          }),
          dubEpisodes: await db.episode.count({
            where: { animeId: ani.id, dub: true },
          }),
          totalEpisodes: ani.totalEps,
          status: ani.status,
          createdAt: ani.createdAt.toISOString(),
          updatedAt: ani.updatedAt.toISOString(),
        })),
      ),
    )
    .catch((e) => {
      Sentry.captureException(e);
      return null;
    });

  return animes
    ? c.json(animes, 200)
    : c.json({ error: "An error occurred" }, 500);
});

const resentEpisodesRoute = createRoute({
  method: "get",
  path: "/resent-episodes",
  request: {
    query: z.object({
      page: z
        .string()
        .optional()
        .default("1")
        .openapi({
          param: {
            name: "page",
            in: "query",
          },
          type: "string",
          example: "1",
        }),
      prPage: z
        .string()
        .optional()
        .default("15")
        .openapi({
          param: {
            name: "prPage",
            in: "query",
          },
          type: "string",
          example: "15",
        }),
      newEpTime: z
        .string()
        .optional()
        .default("5")
        .openapi({
          param: {
            name: "newEpTime",
            in: "query",
          },
          type: "string",
          example: "5",
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
              anime: z.object({
                id: z.string(),
                title: z.string(),
              }),
            }),
          ),
        },
      },
      description: "Ok Response",
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

interface ResentEpisode {
  title: string | null;
  number: number;
  providers: string;
  dub: boolean;
  releasedAt: string;
  anime: {
    id: string;
    title: string | null;
  } | null;
}

route.openapi(resentEpisodesRoute, async (c) => {
  const { page, prPage, newEpTime } = c.req.valid("query");

  const pageNum = parseInt(page || "1") || 1;
  const prPageNum = parseInt(prPage || "15") || 15;

  const eps: ResentEpisode[] = await db.episode
    .findMany({
      where: {
        releaseAt: {
          gte: new Date(
            new Date().getTime() -
              parseInt(newEpTime || "5") * 24 * 60 * 60 * 1000,
          ), // Default 5 days
        },
      },
      include: {
        anime: true,
      },
      orderBy: {
        releaseAt: "desc",
      },
      skip: (pageNum - 1) * prPageNum,
      take: prPageNum,
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
            }
          : null,
      })),
    )
    .catch((e) => {
      Sentry.captureException(e);
      return [];
    });

  return c.json(eps, 200);
});

export default route;
