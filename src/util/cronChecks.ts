import db from "../lib/db";
import * as cronIns from "node-cron";
import * as Sentry from "@sentry/bun";
import { performAnimeCheck } from "./animeUtil";
import { performUserUpdate } from "./aniListUtil";

const timezone = process.env.TIMEZONE ?? "Europe/Copenhagen";

export default function startCron() {
  const cron =
    process.env.DISABLE_SENTRY_DSN === "true" ||
    process.env.NODE_ENV !== "production"
      ? cronIns
      : Sentry.cron.instrumentNodeCron(cronIns);

  if (
    process.env.CRON &&
    (!process.env.INTELLIGENT_CHECKS ||
      process.env.INTELLIGENT_CHECKS === "false")
  )
    cron.schedule(
      process.env.CRON,
      async () => {
        Sentry.withMonitor("Default-Check", async () => {
          await performAnimeCheck();
        });
      },
      { name: "Default-Check", timezone },
    );
  else {
    const minDays = parseInt(process.env.INTELLIGENT_MIN_DAYS ?? "5");
    const maxDays = parseInt(process.env.INTELLIGENT_MAX_DAYS ?? "10");

    cron.schedule(
      process.env.INTELLIGENT_CRON ?? "*/60 * * * *",
      async () => {
        Sentry.withMonitor("Intelligent-Check", async () => {
          performAnimeCheck(minDays, maxDays);
        });
      },
      { name: "Intelligent-Check", timezone },
    );

    // Daily check - 00:00
    cron.schedule(
      "0 0 * * *",
      async () => {
        Sentry.withMonitor("Intelligent-Daily-Check", async () => {
          await performAnimeCheck();
        });
      },
      { name: "Intelligent-Daily-Check", timezone },
    );
  }

  // Daily Clearup - 00:00
  cron.schedule(
    "0 0 * * *",
    async () => {
      Sentry.withMonitor("Daily-Clearup", async () => {
        const res = await db.anime
          .deleteMany({
            where: {
              status: "FINISHED",
            },
          })
          .catch((e) => {
            Sentry.captureException(e);
          });

        console.log(`Deleted ${res?.count} finished anime`);
      });
    },
    { name: "Daily-Clearup", timezone },
  );

  // Anilist Update - 00:00
  cron.schedule(
    process.env.ANILIST_UPDATE_CRON ?? "0 0 * * *",
    async () => {
      Sentry.withMonitor("Anilist-Update", async () => {
        await performUserUpdate();
      });
    },
    { name: "Anilist-Update", timezone },
  );
}
