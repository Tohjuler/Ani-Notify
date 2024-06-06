import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

export const GetRoute = createRoute({
  method: "get",
  path: "/{id}/{username}",
  description: "Get a user by id and username.",
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

export const RegisterRoute = createRoute({
  method: "post",
  path: "/register",
  description: "Register a new user.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z
            .object({
              id: z.string().optional(),
              username: z.string(),
              discord_webhook: z.string().optional(),
              ntfy_url: z.string().optional(),
              animes: z.array(z.string()).optional(),
              anilist: z.string().optional(),
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
              discord_webhook: z.string().optional(),
              ntfy_url: z.string().optional(),
              anilist_id: z.string().optional(),
              createdAt: z.string(),
              updatedAt: z.string(),
            }),
            failedAnimes: z.array(z.string()).optional().openapi({
              description:
                "Animes that failed to fetch, is it must likely because they don't exist.",
            }),
            queuedAnimes: z.array(z.string()).optional().openapi({
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

export const UpdateRoute = createRoute({
  method: "put",
  path: "/update",
  description: "Update a user.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z
            .object({
              id: z.string(),
              username: z.string(),
              discord_webhook: z.string().optional(),
              ntfy_url: z.string().optional(),
              anilist: z.string().optional(),
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

export const DeleteRoute = createRoute({
  method: "delete",
  path: "/delete",
  description: "Delete a user.",
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
