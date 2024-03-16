import { getNewEps } from "./consumet";
import sendNotifications from "./notifications";
import db from "../lib/db";
import * as cron from "node-cron";

export default function startCron() {
    if (
        process.env.CRON &&
        (!process.env.INTELLIGENT_CHECKS ||
            process.env.INTELLIGENT_CHECKS === "false")
    )
        cron.schedule(process.env.CRON, async () => {
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
                    for (const anime of animes) {
                        const newEps = await getNewEps(anime);

                        // Send notifications
                        if (newEps.length > 0) {
                            for (const ep of newEps)
                                sendNotifications(anime, ep);
                        }
                    }
                });
        });
    else {
        const minDays = parseInt(process.env.INTELLIGENT_MIN_DAYS ?? "5");
        const maxDays = parseInt(process.env.INTELLIGENT_MAX_DAYS ?? "10");

        cron.schedule(process.env.INTELLIGENT_CRON ?? "*/60 * * * *", async () => {
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
                    for (const anime of animes) {
                        const lastEpReleaseDate = new Date(
                            anime.episodes.sort(
                                (a, b) =>
                                    b.releaseAt.getTime() -
                                    a.releaseAt.getTime()
                            )[0].releaseAt
                        );

                        // Check if the last episode was released more than minDays ago and less than maxDays ago
                        const today = new Date();
                        const diffTime = Math.abs(
                            today.getTime() - lastEpReleaseDate.getTime()
                        );
                        const diffDays = Math.ceil(
                            diffTime / (1000 * 60 * 60 * 24)
                        );
                        if (diffDays < minDays || diffDays > maxDays) continue;

                        const newEps = await getNewEps(anime);

                        // Send notifications
                        if (newEps.length > 0) {
                            for (const ep of newEps)
                                sendNotifications(anime, ep);
                        }
                    }
                });
        });
    }
}
