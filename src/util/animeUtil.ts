import { Anime, Episode, User } from "@prisma/client";
import * as Sentry from "@sentry/bun";
import db from "../lib/db";
import { fetchAiringAnimes } from "./aniListUtil";
import { addEps, fetchAnimeInfo, getNewEps } from "./consumet";
import sendNotifications from "./notifications";
import { isWithin } from "./util";

export async function addAnime(id: string, user?: User) {
    const anime = await fetchAnimeInfo(id);
    if (!anime) throw new Error("Anime not found");
    if (anime.status === "FINISHED") throw new Error("Anime is finished");
    if (!anime.totalEps) anime.totalEps = 0;

    const animeCreateRes = await db.anime
        .create({
            data: {
                ...anime,
                ...(user
                    ? {
                          users: {
                              connect: {
                                  id: user?.id,
                              },
                          },
                      }
                    : {}),
            },
        })
        .then(() => null)
        .catch((e) => {
            Sentry.captureException(e, {
                data: {
                    id,
                },
            });
            return e;
        });

    if (animeCreateRes) throw animeCreateRes;
    await addEps(id);
}

export interface AnimesRes {
    failedAnime: string[];
    queuedAnime: string[];
}

export async function addAnimesIfNotFound(ids: string[]): Promise<AnimesRes> {
    const animeRes: AnimesRes = {
        failedAnime: [],
        queuedAnime: [],
    };
    for (const id of ids)
        await db.anime
            .findUnique({
                where: { id },
            })
            .then(async (anime) => {
                if (!anime) animeRes.queuedAnime.push(id);
            })
            .catch((e) => {
                Sentry.captureException(e, {
                    data: {
                        id,
                    },
                });
                animeRes.failedAnime.push(id);
            });

    return animeRes;
}

export async function addAnimeToUser(id: string, user: User) {
    const anime = await db.anime.findUnique({
        where: { id },
    });

    if (!anime) {
        const res = await addAnime(id, user)
            .then(() => null)
            .catch((e) => e);
        if (res) throw res;
    }

    await db.user
        .update({
            where: { id: user.id },
            data: {
                animes: {
                    connect: {
                        id,
                    },
                },
            },
        })
        .catch((e) => Sentry.captureException(e));
}

export function checkAnime(anime: { episodes: Episode[] } & Anime) {
    getNewEps(anime).then((newEps) => {
        if (newEps.length > 0)
            for (const ep of newEps) sendNotifications(anime, ep);
    });
}

export async function performAnimeCheck(minDays?: number, maxDays?: number) {
    await db.anime
        .findMany({
            where: {
                status: "RELEASING",
            },
            include: {
                episodes: true,
            },
        })
        .then(async (animes) => {
            const checksPrMin = 3;
            const time = 30; // Seconds
            let i = 0;
            for (const anime of animes) {
                try {
                    if (minDays && maxDays && anime.episodes.length > 0) {
                        const lastEpReleaseDate = new Date(
                            anime.episodes.sort(
                                (a, b) =>
                                    b.releaseAt?.getTime() -
                                    a.releaseAt?.getTime()
                            )[0].releaseAt
                        );

                        if (!isWithin(minDays, maxDays, lastEpReleaseDate))
                            continue;
                    }

                    if (i === checksPrMin) {
                        await new Promise((res) =>
                            setTimeout(res, 1000 * time)
                        );
                        i = 0;
                    }

                    checkAnime(anime);
                    i++;
                } catch (err) {
                    console.error(err);
                    Sentry.captureException(err);
                }
            }
        })
        .catch((e) => Sentry.captureException(e));
}

export async function performNewAnimeCheck() {
    const newAnimes = await fetchAiringAnimes();

    addAnimesIfNotFound(newAnimes).then(async (res) => {
        console.log(`Adding ${res.queuedAnime.length} new animes.`);

        const failed: { id: string; reason: string }[] = [];
        res.failedAnime.forEach((id) =>
            failed.push({ id, reason: "Fetch error" })
        );

        for (const id of res.queuedAnime)
            await addAnime(id).catch((err: Error) =>
                failed.push({ id, reason: err.message })
            );

        const failedCount: { [key: string]: number } = {};
        failed.forEach(
            (f) => (failedCount[f.reason] = (failedCount[f.reason] ?? 0) + 1)
        );

        console.log(`Failed to add ${failed.length} animes.`);
        for (const [reason, count] of Object.entries(failedCount))
            console.log(`- Reason: ${reason} Count: ${count}`);

        console.log("Done adding new animes.");
        if (process.env.DEBUG === "true") console.log("Failed dump:", failed);
    });
}
