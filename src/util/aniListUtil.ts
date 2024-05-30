import axios from "axios";
import db from "../lib/db";
import { captureException } from "@sentry/bun";
import { User } from "@prisma/client";
import { addAnimeToUser } from "./animeUtil";

export async function getUserId(username: string): Promise<string | null> {
    if (!isNaN(parseInt(username))) return username;

    return await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query: `
            query ($username: String) {
                User(name: $username) {
                    id
                }
            }`,
            variables: {
                username: username,
            },
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            return data.data.User.id + "";
        })
        .catch((e) => {
            console.error(e);
            return null;
        });
}

export async function getList(
    userId: string,
    status:
        | "PLANNED"
        | "CURRENT"
        | "PAUSED"
        | "COMPLETED"
        | "DROPPED"
        | "REPEATING"
): Promise<string[]> {
    if (!userId) return [];
    return await axios
        .post(
            "https://graphql.anilist.co",
            {
                query: `
                query ($userId: Int, $status: MediaListStatus) {
                    MediaListCollection(userId: $userId, type: ANIME, status: $status) {
                        lists {
                            entries {
                                mediaId
                            }
                        }
                    }
                }`,
                variables: {
                    userId: parseInt(userId),
                    status,
                },
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        )
        .then((res) =>
            res.data.data.MediaListCollection.lists[0].entries.map(
                (entry: { mediaId: number }) => entry.mediaId + ""
            )
        )
        .catch(() => []);
}

export async function updateUser(user: User, animes: string[]) {
    if (!user.aniListId) return;
    const plannedList = await getList(user.aniListId, "PLANNED");
    const currentList = await getList(user.aniListId, "CURRENT");

    for (const id of [...plannedList, ...currentList]) {
        if (animes.includes(id)) continue;

        addAnimeToUser(id, user).catch((e) => captureException(e));
    }
}

export async function performUserUpdate() {
    await db.user
        .findMany({
            where: {
                aniListId: {
                    not: null,
                },
            },
            include: {
                animes: true,
            },
        })
        .then(async (users) => {
            const checksPrMin = 40;
            const time = 60; // Seconds
            let i = 0;
            for (const user of users) {
                if (i === checksPrMin) {
                    await new Promise((res) => setTimeout(res, 1000 * time));
                    i = 0;
                }

                updateUser(
                    user,
                    user.animes.map((ani) => ani.id)
                );
                i++;
            }
        })
        .catch((e) => captureException(e));
}

export async function fetchAiringAnimes(page: number = 1): Promise<string[]> {
    const from = Math.floor(new Date().getTime() / 1000);
    // 3 days in seconds
    const to =
        from +
        (parseInt(process.env.AUTO_REGISTER_CHECK_DAYS as string) || 2) *
            24 *
            60 *
            60;

    try {
        const query = `
{
Page(page:${page}) {
   pageInfo {
    hasNextPage
  }
  airingSchedules(airingAt_greater: ${from}, airingAt_lesser: ${to}) {
    media {
      id
      status
    }
  }
}
}
`;
        const response = await axios.post("https://graphql.anilist.co/", {
            query: query,
        });

        // Not the best idea, it need some type checking.
        let animes: string[] = response.data.data.Page.airingSchedules
            .filter((a: any) => a.media.status === "RELEASING")
            .map((a: any) => a.media.id + ""); // Cheasy way to get it as string
        if (response.data.data.Page.pageInfo.hasNextPage)
            animes = animes.concat(await fetchAiringAnimes(page + 1));

        return animes;
    } catch (error) {
        captureException(error);
        console.log(error);
        return [];
    }
}
