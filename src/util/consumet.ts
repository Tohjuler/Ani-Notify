import type { Anime, Episode } from "@prisma/client";
import axios from "axios";
import { AnimeInfo, AnimeStatus, ConsumetEpisode, EpisodeInfo } from "./types";
import db from "../lib/db";
import * as Sentry from "@sentry/bun";

const supportedProviders = ["gogoanime"] as const;

function epsUrl(id: string, dub: boolean, provider: string): string {
    return `${process.env.CONSUMET_URL}/meta/anilist/episodes/${id}?dub=${dub}&provider=${provider}`;
}

async function addEp(
    anime: Anime,
    ep: ConsumetEpisode,
    dub: boolean,
    provider: string
): Promise<EpisodeInfo> {
    const dbEp = await db.episode.findFirst({
        where: {
            animeId: anime.id,
            number: ep.number,
            dub: dub,
        },
    });
    if (dbEp !== null) {
        // Update provider
        await db.episode
            .update({
                where: {
                    id: dbEp.id,
                },
                data: {
                    providers: dbEp.providers.split(",").includes(provider)
                        ? dbEp.providers
                        : dbEp.providers + "," + provider,
                },
            })
            .catch((e) => Sentry.captureException(e));
    } else {
        // Add new episode
        await db.episode
            .create({
                data: {
                    animeId: anime.id,
                    number: ep.number,
                    dub: dub,
                    providers: provider,
                    title: ep.title,
                    releaseAt: ep.createdAt ?? new Date(),
                },
            })
            .catch((e) => Sentry.captureException(e));
    }

    return {
        ...ep,
        dub,
        providers: provider,
        animeId: anime.id,
    };
}
export async function getNewEps(
    anime: { episodes: Episode[] } & Anime
): Promise<EpisodeInfo[]> {
    const subEps = anime.episodes.filter((ep) => !ep.dub);
    const dubEps = anime.episodes.filter((ep) => ep.dub);

    const newEps: EpisodeInfo[] = [];

    for (const provider of supportedProviders) {
        const epsSub: ConsumetEpisode[] = await axios
            .get<ConsumetEpisode[]>(epsUrl(anime.id, false, provider))
            .then((res) => res.data)
            .catch(() => {
                console.log(`Failed to fetch sub episodes for ${anime.id}`);
                return [];
            });
        const epsDub: ConsumetEpisode[] = await axios
            .get<ConsumetEpisode[]>(epsUrl(anime.id, true, provider))
            .then((res) => res.data)
            .catch(() => {
                console.log(`Failed to fetch dub episodes for ${anime.id}`);
                return [];
            });

        // Add new sub episodes
        for (const ep of epsSub.filter(
            (ep) => !subEps.find((e) => e.number === ep.number)
        )) {
            newEps.push(await addEp(anime, ep, false, provider));
        }
        // Add new dub episodes
        for (const ep of epsDub.filter(
            (ep) => !dubEps.find((e) => e.number === ep.number)
        )) {
            newEps.push(await addEp(anime, ep, true, provider));
        }
    }

    // Find duplicates and combine them by adding the providers
    const combinedEps: EpisodeInfo[] = [];
    for (const ep of newEps) {
        const existingEp = combinedEps.find(
            (e) => e.number === ep.number && e.dub === ep.dub
        );
        if (existingEp) existingEp.providers += `,${ep.providers}`;
        else combinedEps.push(ep);
    }

    // Check if the totalAmount of is reached
    if (isFinished(anime, newEps, false) && isFinished(anime, newEps, true))
        // Dub and Sub is finished
        updateStatus(anime);

    return combinedEps;
}

function isFinished(
    anime: { episodes: Episode[] } & Anime,
    newEps: EpisodeInfo[],
    dub: boolean
): boolean {
    return (
        anime.episodes.filter((ep) => ep.dub === dub).length +
            newEps.filter((ep) => ep.dub === dub).length >=
        anime.totalEps
    );
}

export async function addEps(animeId: string) {
    const addEps = async (
        ep: ConsumetEpisode,
        dub: boolean,
        provider: string
    ) => {
        const dbEp = await db.episode.findFirst({
            where: {
                animeId,
                number: ep.number,
                dub: dub,
            },
        });
        if (dbEp !== null) {
            // Update provider
            await db.episode
                .update({
                    where: {
                        id: dbEp.id,
                    },
                    data: {
                        providers: dbEp.providers.split(",").includes(provider)
                            ? dbEp.providers
                            : dbEp.providers + "," + provider,
                    },
                })
                .catch((e) => Sentry.captureException(e));
        } else {
            // Add new episode
            await db.episode
                .create({
                    data: {
                        animeId: animeId,
                        number: ep.number,
                        dub: dub,
                        providers: provider,
                        title: ep.title,
                        releaseAt: ep.createdAt ?? new Date(),
                    },
                })
                .catch((e) => Sentry.captureException(e));
        }
    };

    for (const provider of supportedProviders) {
        // TODO: Add 404 and error handling.
        const epsSub: ConsumetEpisode[] = await axios
            .get(epsUrl(animeId, false, provider))
            .then((res) => res.data)
            .catch(() => []);
        const epsDub: ConsumetEpisode[] = await axios
            .get(epsUrl(animeId, true, provider))
            .then((res) => res.data)
            .catch(() => []);

        // Add sub episodes
        epsSub.forEach((ep) => {
            addEps(ep, false, provider);
        });
        // Add dub episodes
        epsDub.forEach((ep) => {
            addEps(ep, true, provider);
        });
    }
}

export async function fetchAnimeInfo(
    id: string
): Promise<AnimeInfo | undefined> {
    return await axios
        .get(`${process.env.CONSUMET_URL}/meta/anilist/info/${id}`)
        .then((res) => {
            let status: AnimeStatus = "NOT_YET_RELEASED";
            switch (res.data.status) {
                case "Completed":
                    status = "FINISHED";
                    break;
                case "Ongoing":
                    status = "RELEASING";
                    break;
                case "Not yet aired":
                    status = "NOT_YET_RELEASED";
                    break;
            }

            return {
                id: res.data.id,
                title: res.data.title[process.env.TITLE_TYPE || "english"],
                status,
                totalEps: res.data.totalEpisodes ?? 0,
            } as AnimeInfo;
        })
        .catch(() => undefined);
}

async function updateStatus(anime: Anime) {
    const newInfo = await fetchAnimeInfo(anime.id);
    if (!newInfo) {
        console.log(`Failed to fetch anime info for ${anime.id}`);
        return;
    }

    if (newInfo.status !== anime.status) {
        await db.anime
            .update({
                where: {
                    id: anime.id,
                },
                data: {
                    status: newInfo.status,
                },
            })
            .catch((e) => Sentry.captureException(e));
        console.log(
            `Updated status for ${anime.id} | ${anime.status} > ${newInfo.status}`
        );
    }
    if (newInfo.totalEps !== anime.totalEps) {
        await db.anime
            .update({
                where: {
                    id: anime.id,
                },
                data: {
                    totalEps: newInfo.totalEps,
                },
            })
            .catch((e) => Sentry.captureException(e));
        console.log(
            `Updated total episodes for ${anime.id} | ${anime.totalEps} > ${newInfo.totalEps}`
        );
    }
}
