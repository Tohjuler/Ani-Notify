import { createRoute, z } from "@hono/zod-openapi";

export const SettingsRoute = createRoute({
  method: "get",
  path: "/settings",
  description: "Get all settings",
  security: [
    {
      Bearer: [],
    },
  ],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              key: z.string(),
              value: z.string(),
              default: z.string(),

              createdAt: z.string(),
              updatedAt: z.string(),
            }),
          ),
        },
      },
      description: "Ok Response",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Unauthorized"),
          }),
        },
      },
      description: "Unauthorized",
    },
  },
  tags: ["Admin"],
});

export const GetSettingRoute = createRoute({
  method: "get",
  path: "/setting/{id}",
  description: "Get info about a setting.",
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.string().openapi({
        param: {
          name: "id",
          in: "path",
        },
        type: "string",
        example: "TITLE_TYPE",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            value: z.string(),
            default: z.string(),

            createdAt: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
      description: "Ok Response",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Unauthorized"),
          }),
        },
      },
      description: "Unauthorized",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Setting not found"),
          }),
        },
      },
      description: "Not Found",
    },
  },
  tags: ["Admin"],
});

export const PutSettingRoute = createRoute({
  method: "put",
  path: "/setting/{id}",
  description: "Update a setting.",
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.string().openapi({
        param: {
          name: "id",
          in: "path",
        },
        type: "string",
        example: "TITLE_TYPE",
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            value: z.string(),
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
    401: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Unauthorized"),
          }),
        },
      },
      description: "Unauthorized",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Setting not found"),
          }),
        },
      },
      description: "Not Found",
    },
  },
  tags: ["Admin"],
});

export const DeleteSettingRoute = createRoute({
  method: "delete",
  path: "/setting/{id}",
  description: "Reset a setting to its default.",
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      id: z.string().openapi({
        param: {
          name: "id",
          in: "path",
        },
        type: "string",
        example: "TITLE_TYPE",
      }),
    }),
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
    401: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Unauthorized"),
          }),
        },
      },
      description: "Unauthorized",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Setting not found"),
          }),
        },
      },
      description: "Not Found",
    },
  },
  tags: ["Admin"],
});

export const GetKeysRoute = createRoute({
  method: "get",
  path: "/keys",
  description: "Get all api keys",
  security: [
    {
      Bearer: [],
    },
  ],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              key: z.string(),
              admin_access: z.boolean(),

              createdAt: z.string(),
              updatedAt: z.string(),
            }),
          ),
        },
      },
      description: "Ok Response",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Unauthorized"),
          }),
        },
      },
      description: "Unauthorized",
    },
  },
  tags: ["Admin"],
});

export const PostKeysRoute = createRoute({
  method: "post",
  path: "/keys",
  description: "Create a new api key",
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            admin_access: z.boolean().default(false),
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
            key: z.string(),
            admin_access: z.boolean(),

            createdAt: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
      description: "Ok Response",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Unauthorized"),
          }),
        },
      },
      description: "Unauthorized",
    },
  },
  tags: ["Admin"],
});

export const DeleteKeysRoute = createRoute({
  method: "delete",
  path: "/keys/{key}",
  description: "Delete an api key",
  security: [
    {
      Bearer: [],
    },
  ],
  request: {
    params: z.object({
      key: z.string().openapi({
        param: {
          name: "key",
          in: "path",
        },
        type: "string",
        example: "123456",
      }),
    }),
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
    401: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Unauthorized"),
          }),
        },
      },
      description: "Unauthorized",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string().default("Key not found"),
          }),
        },
      },
      description: "Not Found",
    },
  },
  tags: ["Admin"],
});
