import { User } from "@prisma/client";
import db from "../lib/db";
import { addEps, fetchAnimeInfo } from "./consumet";
import { EventHint } from "@sentry/bun";
import * as Sentry from "@sentry/bun";

export async function addAnime(id: string, user?: User) {
    const anime = await fetchAnimeInfo(id);
    if (!anime) return;
    if (anime.status === "FINISHED") return;
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

    if (animeCreateRes) return;
    await addEps(id);
}

export interface AnimesRes {
    failedAnime: string[];
    queuedAnime: string[];
}

export async function addAnimeIfNotFound(ids: string[], captureException: (exception: unknown, hint?: EventHint | undefined) => string): Promise<AnimesRes> {
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
                if (!anime)
                    animeRes.queuedAnime.push(id);
            })
            .catch((e) => {
                captureException(e, {
                    data: {
                        id,
                    },
                });
                animeRes.failedAnime.push(id);
            });

    return animeRes;
}
