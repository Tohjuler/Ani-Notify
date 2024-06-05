import { OpenAPIHono } from "@hono/zod-openapi";
import * as Sentry from "@sentry/bun";
import db from "../../lib/db";
import { addAnimeToUser } from "../../util/animeUtil";
import {
  CurrentlyTrackingRoute,
  ResentEpisode,
  ResentEpisodesRoute,
  SubscribeRoute,
  UnsubscribeRoute,
} from "./types/anime_types";

const route = new OpenAPIHono();

// POST /anime/subscribe

route.openapi(SubscribeRoute, async (c) => {
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

// POST /anime/unsubscribe

route.openapi(UnsubscribeRoute, async (c) => {
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

// GET /anime/currently-tracking

route.openapi(CurrentlyTrackingRoute, async (c) => {
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

// GET /anime/resent-episodes

route.openapi(ResentEpisodesRoute, async (c) => {
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
