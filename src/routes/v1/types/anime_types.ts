import { createRoute, z } from "@hono/zod-openapi";

export const SubscribeRoute = createRoute({
  method: "post",
  path: "/subscribe",
  description: "Subscribe to an anime as a user.",
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

export const UnsubscribeRoute = createRoute({
  method: "post",
  path: "/unsubscribe",
  description: "Unsubscribe from an anime as a user.",
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

export const CurrentlyTrackingRoute = createRoute({
  method: "get",
  path: "/currently-tracking",
  description: "Get the anime that is currently getting tracked.",
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

export const ResentEpisodesRoute = createRoute({
  method: "get",
  path: "/resent-episodes",
  description: "Get the resent episodes.",
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

export interface ResentEpisode {
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
