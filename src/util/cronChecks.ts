import { getNewEps } from "./consumet";
import sendNotifications from "./notifications";
import db from "../lib/db";
import * as cronIns from "node-cron";
import * as Sentry from "@sentry/bun";

const timezone = process.env.TIMEZONE ?? "Europe/Copenhagen";

export default function startCron() {
    const cron = process.env.DISABLE_SENTRY_DSN === "true"
        || process.env.NODE_ENV !== "production"
        ? cronIns
        : Sentry.cron.instrumentNodeCron(cronIns);

    if (
        process.env.CRON &&
        (!process.env.INTELLIGENT_CHECKS ||
            process.env.INTELLIGENT_CHECKS === "false")
    )
        cron.schedule(process.env.CRON, async () => {
            Sentry.withMonitor("Default-Check", async () => {
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
        }, { name: "Default-Check", timezone });
    else {
        const minDays = parseInt(process.env.INTELLIGENT_MIN_DAYS ?? "5");
        const maxDays = parseInt(process.env.INTELLIGENT_MAX_DAYS ?? "10");

        cron.schedule(
            process.env.INTELLIGENT_CRON ?? "*/60 * * * *",
            async () => {
                Sentry.withMonitor("Intelligent-Check", async () => {
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
                                if (diffDays < minDays || diffDays > maxDays)
                                    continue;

                                const newEps = await getNewEps(anime);

                                // Send notifications
                                if (newEps.length > 0) {
                                    for (const ep of newEps)
                                        sendNotifications(anime, ep);
                                }
                            }
                        });
                });
            },
            { name: "Intelligent-Check", timezone }
        );

        // Daily check - 00:00
        cron.schedule("0 0 * * *", async () => {
            Sentry.withMonitor("Intelligent-Daily-Check", async () => {
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
        }, { name: "Intelligent-Daily-Check", timezone });
    }

    // Daily Clearup - 00:00
    cron.schedule("0 0 * * *", async () => {
        Sentry.withMonitor("Daily-Clearup", async () => {
            const res = await db.anime.deleteMany({
                where: {
                    status: "FINISHED",
                },
            });

            console.log(`Deleted ${res.count} finished anime`);
        })
    }, { name: "Daily-Clearup", timezone })
}
