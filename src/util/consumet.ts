import type { Anime, Episode, PrismaClient } from '@prisma/client'
import axios from 'axios';
import { AnimeInfo, AnimeStatus, ConsumetEpisode, EpisodeInfo } from './types';
import db from '../lib/db';

const supportedProviders = [
    "gogoanime",
    "zoro",
] as const;

function epsUrl(id: string, dub: boolean, provider: string): string {
    return `${process.env.CONSUMET_URL}/meta/anilist/episodes/${id}?dub=${dub}&provider=${provider}`
}

export async function getNewEps(anime: { episodes: Episode[] } & Anime): Promise<EpisodeInfo[]> {
    const subEps = anime.episodes.filter((ep) => !ep.dub);
    const dubEps = anime.episodes.filter((ep) => ep.dub);

    const newEps: EpisodeInfo[] = [];

    const addEps = async (ep: ConsumetEpisode, dub: boolean, provider: string) => {
        const dbEp = await db.episode.findFirst({
            where: {
                animeId: anime.id,
                number: ep.number,
                dub: dub
            }
        });
        if (dbEp !== null) {
            // Update provider
            await db.episode.update({
                where: {
                    id: dbEp.id
                },
                data: {
                    providers: dbEp.providers.split(",").includes(provider) ? dbEp.providers : dbEp.providers + "," + provider
                }
            });
        } else {
            // Add new episode
            await db.episode.create({
                data: {
                    animeId: anime.id,
                    number: ep.number,
                    dub: dub,
                    providers: provider,
                    title: ep.title,
                }
            });
        }

        if (newEps.find((e) => e.number === ep.number && e.dub === dub)) {
            // Update provider
            const index = newEps.findIndex((e) => e.number === ep.number && e.dub === dub);
            newEps[index].providers = newEps[index].providers.split(",").includes(provider) ? newEps[index].providers : newEps[index].providers + "," + provider;
            return;
        }
        newEps.push({
            ...ep,
            dub: dub,
            animeId: anime.id,
            providers: provider
        });
    }

    for (const provider of supportedProviders) {
        const epsSub = await axios.get<ConsumetEpisode[]>(epsUrl(anime.id, false, provider));
        const epsDub = await axios.get<ConsumetEpisode[]>(epsUrl(anime.id, true, provider));

        // Add new sub episodes
        epsSub.data.filter(ep => !subEps.find((e) => e.number === ep.number)).forEach((ep) => {
            addEps(ep, false, provider);
        })
        // Add new dub episodes
        epsDub.data.filter(ep => !dubEps.find((e) => e.number === ep.number)).forEach((ep) => {
            addEps(ep, true, provider);
        })
    }

    return newEps;
}

export async function addEps(animeId: string) {
    const addEps = async (ep: ConsumetEpisode, dub: boolean, provider: string) => {
        const dbEp = await db.episode.findFirst({
            where: {
                animeId,
                number: ep.number,
                dub: dub
            }
        });
        if (dbEp !== null) {
            // Update provider
            await db.episode.update({
                where: {
                    id: dbEp.id
                },
                data: {
                    providers: dbEp.providers.split(",").includes(provider) ? dbEp.providers : dbEp.providers + "," + provider
                }
            });
        } else {
            // Add new episode
            await db.episode.create({
                data: {
                    animeId,
                    number: ep.number,
                    dub: dub,
                    providers: provider,
                    title: ep.title,
                }
            });
        }
    }

    for (const provider of supportedProviders) {
        const epsSub = await axios.get<ConsumetEpisode[]>(epsUrl(animeId, false, provider));
        const epsDub = await axios.get<ConsumetEpisode[]>(epsUrl(animeId, true, provider));

        // Add sub episodes
        epsSub.data.forEach((ep) => {
            addEps(ep, false, provider);
        })
        // Add dub episodes
        epsDub.data.forEach((ep) => {
            addEps(ep, true, provider);
        })
    }
}

export async function fetchAnimeInfo(id: string): Promise<AnimeInfo | undefined> {
    return await axios.get(`${process.env.CONSUMET_URL}/meta/anilist/info/${id}`).then((res) => {
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
            title: res.data.romaji,
            status
        }
    }).catch(() => undefined);
}