import { User } from "@prisma/client";
import db from "../lib/db";
import { addEps, fetchAnimeInfo } from "./consumet";
import { EventHint } from "@sentry/node";

export async function addAnime(id: string, user?: User): Promise<Error | null> {
    const anime = await fetchAnimeInfo(id);
    if (!anime) return null;

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
        .catch((e) => e);

    if (animeCreateRes) return animeCreateRes;
    await addEps(id);

    return animeCreateRes;
}

export async function addAnimeIfNotFound(ids: string[], captureException: (exception: unknown, hint?: EventHint | undefined) => string): Promise<string[]> {
    const failedAnime: string[] = [];
    for (const id of ids)
        await db.anime
            .findUnique({
                where: { id },
            })
            .then(async (anime) => {
                if (!anime) {
                    const res = await addAnime(id);
                    if (res) {
                        captureException(res, {
                            data: {
                                id,
                            },
                        });
                        failedAnime.push(id);
                    }
                }
            })
            .catch((e) => {
                captureException(e, {
                    data: {
                        id,
                    },
                });
                failedAnime.push(id);
            });

    return failedAnime;
}
