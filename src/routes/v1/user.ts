import { OpenAPIHono } from "@hono/zod-openapi";
import { User } from "@prisma/client";
import * as Sentry from "@sentry/bun";
import db from "../../lib/db";
import { getUserId, updateUser } from "../../util/aniListUtil";
import { AnimesRes, addAnime, addAnimesIfNotFound } from "../../util/animeUtil";
import {
  DeleteRoute,
  GetRoute,
  RegisterRoute,
  UpdateRoute,
} from "./types/user_types";

const route = new OpenAPIHono();

// GET /user/{id}/{username}

route.openapi(GetRoute, async (c) => {
  const { id, username } = c.req.valid("param");

  const user = await db.user
    .findUnique({
      where: { id, username },
    })
    .then((res) => res)
    .catch(() => null);

  return user ? c.json(user, 200) : c.json({ error: "User not found" }, 404);
});

// POST /user/register

route.openapi(RegisterRoute, async (c) => {
  const { id, username, discord_webhook, ntfy_url, animes, anilist } =
    c.req.valid("json");

  let addAnimesRes: AnimesRes | null = null;
  if (animes) {
    addAnimesRes = await addAnimesIfNotFound(animes).catch((e) => {
      Sentry.captureException(e);
      return null;
    });

    if (addAnimesRes === null)
      return c.json(
        { error: "An error occurred, while processing animes" },
        500,
      );
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
                      !addAnimesRes?.failedAnime.includes(a) &&
                      !addAnimesRes?.queuedAnime.includes(a),
                  )
                  .map((id: string) => ({ id })),
              },
            }
          : {}),
      },
    })
    .then((res) => {
      if (addAnimesRes)
        addAnimesRes.queuedAnime.forEach((id) =>
          addAnime(id, res).catch(() => {}),
        );

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

route.openapi(UpdateRoute, async (c) => {
  const { id, username, discord_webhook, ntfy_url, anilist } =
    c.req.valid("json");

  if (process.env.ALLOW_EDIT !== "true")
    return c.json({ error: "Editing is disabled" }, 403);

  const aniListId = anilist ? await getUserId(anilist) : null;

  const res = await db.user
    .update({
      where: { id, username },
      data: {
        discord_webhook,
        ntfy_url,
        ...(aniListId ? { aniListId } : {}),
      },
    })
    .then(() => null)
    .catch((e) => {
      Sentry.captureException(e);
      return c.json({ error: "An error occurred" }, 500);
    });

  return res ? res : c.json({ success: true }, 200);
});

// DELETE /user/delete

route.openapi(DeleteRoute, async (c) => {
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

  return res ? res : c.json({ success: true }, 200);
});

export default route;
