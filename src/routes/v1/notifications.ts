import { OpenAPIHono } from "@hono/zod-openapi";
import * as Sentry from "@sentry/bun";
import db from "../../lib/db";
import { getNewEps } from "../../util/consumet";
import { getSetting } from "../../util/settingsHandler";
import { AnimeRoute, Episode, GetRoute } from "./types/notifications_types";

const route = new OpenAPIHono();

// GET /notifications/{userId}

route.openapi(GetRoute, async (c) => {
  const { userId } = c.req.valid("param");
  const { page } = c.req.valid("query");
  const pageNum = parseInt(page ?? "1") || 1;
  const prPage = 15;

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) return c.json({ error: "User not found" }, 404);

  // Get eps from db there is created in the last 5 (loaded from env) days
  const eps: Episode[] = await db.episode
    .findMany({
      where: {
        anime: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        releaseAt: {
          gte: new Date(
            new Date().getTime() -
              parseInt((await getSetting("NEW_EP_TIME")) || "5") *
                24 *
                60 *
                60 *
                1000,
          ), // Default 5 days
        },
      },
      include: {
        anime: true,
      },
      orderBy: {
        releaseAt: "desc",
      },
      skip: (pageNum - 1) * prPage,
      take: prPage,
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
              status: ep.anime.status,
              totalEps: ep.anime.totalEps,
              createdAt: ep.anime.createdAt.toISOString(),
              updatedAt: ep.anime.updatedAt.toISOString(),
            }
          : null,
      })),
    )
    .catch((e) => {
      Sentry.captureException(e);
      return [];
    });

  // Check for new episodes, if the cron job is not running
  if (
    !(await getSetting("CRON")) &&
    (await getSetting("INTELLIGENT_CHECKS")) === "false"
  )
    await db.anime
      .findMany({
        where: {
          status: "RELEASING",
          users: {
            some: {
              id: userId,
            },
          },
        },
        include: {
          episodes: true,
        },
      })
      .then(async (animes) => {
        for (const anime of animes) {
          const newEps = await getNewEps(anime);

          eps.push(
            ...newEps.map((ep) => ({
              title: ep.title,
              number: ep.number,
              providers: ep.providers,
              dub: ep.dub,
              releasedAt: new Date().toISOString(),
              anime: {
                id: anime.id,
                title: anime.title,
                status: anime.status,
                totalEps: anime.totalEps,
                createdAt: anime.createdAt.toISOString(),
                updatedAt: anime.updatedAt.toISOString(),
              },
            })),
          );
        }
      })
      .catch((e) => Sentry.captureException(e));

  const totalEps = await db.episode.count({
    where: {
      anime: {
        users: {
          some: {
            id: userId,
          },
        },
      },
      createdAt: {
        gte: new Date(
          new Date().getTime() -
            parseInt((await getSetting("NEW_EP_TIME")) || "5") *
              24 *
              60 *
              60 *
              1000,
        ), // Default 5 days
      },
    },
  });
  return c.json(
    {
      notifications: eps,
      pageInfo: {
        page: pageNum,
        total: totalEps,
        nextPage: totalEps > pageNum * prPage,
      },
    },
    200,
  );
});

// GET /notifications/anime/{animeId}

route.openapi(AnimeRoute, async (c) => {
  const { animeId } = c.req.valid("param");
  const { page } = c.req.valid("query");
  const pageNum = parseInt(page ?? "1") || 1;
  const prPage = 15;

  const anime = await db.anime.findUnique({
    where: {
      id: animeId,
    },
  });

  if (!anime) return c.json({ error: "Anime not found" }, 404);

  const eps: Episode[] = await db.episode
    .findMany({
      where: {
        animeId: animeId,
      },
      orderBy: {
        releaseAt: "desc",
      },
      skip: (pageNum - 1) * prPage,
      take: prPage,
    })
    .then((res) =>
      res.map((ep) => ({
        title: ep.title,
        number: ep.number,
        providers: ep.providers,
        dub: ep.dub,
        releasedAt: ep.releaseAt.toISOString(),
        anime: null,
      })),
    )
    .catch((e) => {
      Sentry.captureException(e);
      return [];
    });

  return c.json(
    {
      notifications: eps,
      pageInfo: {
        page: pageNum,
        total: anime.totalEps,
        nextPage: anime.totalEps > pageNum * prPage,
      },
    },
    200,
  );
});

export default route;
