import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

export interface Episode {
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

export const GetRoute = createRoute({
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
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            notifications: z.array(
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
              }),
            ),
            pageInfo: z.object({
              page: z.number(),
              total: z.number(),
              nextPage: z.boolean(),
            }),
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
  tags: ["Notifications"],
});

export const AnimeRoute = createRoute({
  method: "get",
  path: "/anime/{animeId}",
  request: {
    params: z.object({
      animeId: z.string().openapi({
        param: {
          name: "animeId",
          in: "path",
        },
        type: "string",
        example: "1",
      }),
    }),
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
          type: "integer",
          example: "1",
        }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            notifications: z.array(
              z.object({
                title: z.string().nullable(),
                number: z.number(),
                providers: z.string(),
                dub: z.boolean(),
                releasedAt: z.string(),
              }),
            ),
            pageInfo: z.object({
              page: z.number(),
              total: z.number(),
              nextPage: z.boolean(),
            }),
          }),
        },
      },
      description: "Ok Response",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Anime not found"),
          }),
        },
      },
      description: "Not Found",
    },
  },
  tags: ["Notifications"],
});
