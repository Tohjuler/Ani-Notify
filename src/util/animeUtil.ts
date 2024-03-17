import { User } from "@prisma/client";
import db from "../lib/db";
import { addEps, fetchAnimeInfo } from "./consumet";

export async function addAnime(id: string, user?: User): Promise<boolean> {
    const anime = await fetchAnimeInfo(id);
    if (!anime) return false;

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
        .then(() => true)
        .catch(() => false);

    if (!animeCreateRes) {
        console.error(`Failed to add anime ${id}`, anime);
        return false;
    }
    await addEps(id);

    return animeCreateRes;
}

export async function addAnimeIfNotFound(ids: string[]) {
    for (const id of ids)
        await db.anime
            .findUnique({
                where: { id },
            })
            .then(async (anime) => {
                if (!anime) addAnime(id);
            })
            .catch(() => {});
}
