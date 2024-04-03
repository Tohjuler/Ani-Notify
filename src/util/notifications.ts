import { Anime } from "@prisma/client";
import { EpisodeInfo } from "./types";
import axios from "axios";
import db from "../lib/db";

export default async function sendNotifications(
  anime: Anime,
  episode: EpisodeInfo,
) {
  const users = await db.user.findMany({
    where: {
      animes: {
        some: {
          id: episode.animeId,
        },
      },
    },
  });
  if (users.length === 0) return;

  for (const user of users) {
    if (user.discord_webhook)
      sendDiscordNotification(anime, episode, user.discord_webhook);
    if (user.ntfy_url) sendNtfyNotification(anime, episode, user.ntfy_url);
  }
}

function sendDiscordNotification(
  anime: Anime,
  ep: EpisodeInfo,
  webhook: string,
) {
  const message = `Title: ${ep.title ?? "N/A"}
    ${ep.description ? `Description: ${ep.description}` : ""}
    Language: ${ep.dub ? "Dub" : "Sub"}
    You can watch it on ${ep.providers
      .split(",")
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join(", ")}
    `;

  axios.post(webhook, {
    embeds: [
      {
        color: 11730954,
        author: {
          name: "Ani-Notify",
          icon_url:
            "http://cloud.tohjuler.dk/s/tEKyqLNxmX7Adrr/download/Zetsu.jpg",
        },
        title: `Episode ${ep.number} ${ep.dub ? "(Dub) " : ""}of ${anime.title} is out!`,
        description: message,
        ...(ep.image
          ? {
              image: {
                url: ep.image,
              },
            }
          : {}),
        footer: {
          text: "Delivered by (Ani-Notify)[https://github.com/Tohjuler/Ani-Notify]",
        },
      },
    ],
  });
}

function sendNtfyNotification(anime: Anime, ep: EpisodeInfo, url: string) {
  const message = `Episode ${ep.number} ${ep.dub ? "(Dub) " : ""}of ${anime.title} is out!
    
    Title: ${ep.title ?? "N/A"}
    ${ep.description ? `Description: ${ep.description}` : ""}
    Language: ${ep.dub ? "Dub" : "Sub"}
    You can watch it on ${ep.providers
      .split(",")
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join(", ")}
    `;

  axios.post(url, message, {
    headers: {
      "Content-Type": "text/plain",
      ...(ep.image ? { Attach: ep.image } : {}),
    },
  });
}
