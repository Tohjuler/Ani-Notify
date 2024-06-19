import * as Sentry from "@sentry/bun";
import * as cronIns from "node-cron";
import db from "../lib/db";
import { performUserUpdate } from "./aniListUtil";
import { performAnimeCheck, performNewAnimeCheck } from "./animeUtil";
import { getSetting } from "./settingsHandler";

const timezone = process.env.TIMEZONE ?? "Europe/Copenhagen";

export default async function startCron() {
  const cron =
    process.env.DISABLE_SENTRY_DSN === "true" ||
    process.env.NODE_ENV !== "production"
      ? cronIns
      : Sentry.cron.instrumentNodeCron(cronIns);

  if (
    (await getSetting("CRON")) &&
    (await getSetting("INTELLIGENT_CHECKS")) === "false"
  )
    cron.schedule(
      await getSetting("CRON"),
      async () => {
        Sentry.withMonitor("Default-Check", async () => {
          await performAnimeCheck();
        });
      },
      { name: "Default-Check", timezone },
    );
  else {
    const minDays = parseInt((await getSetting("INTELLIGENT_MIN_DAYS")) ?? "5");
    const maxDays = parseInt(
      (await getSetting("INTELLIGENT_MAX_DAYS")) ?? "10",
    );

    cron.schedule(
      (await getSetting("INTELLIGENT_CRON")) ?? "*/60 * * * *",
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
    (await getSetting("ANILIST_UPDATE_CRON")) ?? "0 0 * * *",
    async () => {
      Sentry.withMonitor("Anilist-Update", async () => {
        await performUserUpdate();
      });
    },
    { name: "Anilist-Update", timezone },
  );

  // Auto register
  if ((await getSetting("AUTO_REGISTER")) === "true")
    cron.schedule(
      (await getSetting("AUTO_REGISTER_CRON")) ?? "0 0 * * *",
      async () => {
        Sentry.withMonitor("Auto-Register", async () => {
          await performNewAnimeCheck();
        });
      },
      { name: "Auto-Register", timezone },
    );
}

export function restartCron() {
  cronIns.getTasks().forEach((task) => task.stop());
  cronIns.getTasks().clear();
  startCron();
}
