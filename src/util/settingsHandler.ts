import db from "../lib/db";

const defaultSettings: {
  [key: string]: { default: string; description: string };
} = {
  ALLOW_EDIT: {
    default: "true",
    description: "Allow users to edit their infomation.",
  },
  ALLOW_DELETE: {
    default: "true",
    description: "Allow users to delete their account.",
  },
  TITLE_TYPE: {
    default: "english",
    description: 'The title type, can be "english", "romaji" and "native".',
  },
  AUTO_REGISTER: {
    default: "false",
    description: "Allow users to register without admin approval.",
  },
  AUTO_REGISTER_CRON: {
    default: "0 0 * * *",
    description: "Cron job for auto registration.",
  },
  AUTO_REGISTER_CHECK_DAYS: {
    default: "2",
    description: "The amount of days it will check into the future.",
  },
  INTELLIGENT_CHECKS: {
    default: "true",
    description: `This is a feature to reduce the amount of requests to the consumet API. 
        If enabled, it will only check a anime if there has bin more then INTELLIGENT_MIN_DAYS days from last ep and less then INTELLIGENT_MAX_DAYS days.`,
  },
  INTELLIGENT_MIN_DAYS: {
    default: "5",
    description: "Minimum amount of days to check for a anime.",
  },
  INTELLIGENT_MAX_DAYS: {
    default: "10",
    description: "Maximum amount of days to check for a anime.",
  },
  INTELLIGENT_CRON: {
    default: "*/60 * * * *",
    description: "Cron job for intelligent checks.",
  },
  CRON: {
    default: "*/60 * * * *",
    description:
      "This is the job for check for new episodes. This will be used if INTELLIGENT_CHECKS is disabled.",
  },
  ANILIST_UPDATE_CRON: {
    default: "0 0 * * *",
    description: "Cron job for updating anilist data.",
  },
};

export function getDescription(key: string): string {
  return defaultSettings[key].description;
}

export function getDefault(key: string): string {
  return defaultSettings[key].default;
}

export async function getSetting(key: string): Promise<string> {
  const setting = await db.setting.findFirst({ where: { key } });
  return setting?.value || defaultSettings[key].default;
}

export async function setupDefauls() {
  for (const key in defaultSettings) {
    if (await db.setting.findFirst({ where: { key } })) continue;

    await db.setting.create({
      data: {
        key,
        value: defaultSettings[key].default,
      },
    });
  }
}
