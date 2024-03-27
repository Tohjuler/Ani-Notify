import { expect, test, describe } from "bun:test";
import app from "../src/index";
import { User } from "@prisma/client";

const baseApi = "http://localhost/api/v1" as const;
var tmpUser: User;

describe("User", () => {
    test("User register", async () => {
        const res = await app.request(
            new Request(baseApi + "/user/register", {
                method: "POST",
                body: JSON.stringify({
                    username: "test-user",
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            })
        );
        if (res.status !== 200) console.log(JSON.stringify(await res.json(), null, 2));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.user).toHaveProperty("id");
        tmpUser = data.user;
    });

    test("User get", async () => {
        const res = await app.request(
            new Request(
                baseApi + "/user/" + tmpUser.id + "/" + tmpUser.username
            )
        );
        expect(res.status).toBe(200);
    });

    test("User update", async () => {
        const res = await app.request(
            new Request(baseApi + "/user/update", {
                method: "PUT",
                body: JSON.stringify({
                    username: tmpUser.username,
                    id: tmpUser.id,
                    discord_webhook: "TEST-DATA",
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            })
        );
        expect(res.status).toBe(200);
    });
});

// Delete user - Has to be last test

test("User delete", async () => {
    const res = await app.request(
        new Request(baseApi + "/user/delete", {
            method: "DELETE",
            body: JSON.stringify({
                username: tmpUser.username,
                id: tmpUser.id,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        })
    );
    expect(res.status).toBe(200);
});
