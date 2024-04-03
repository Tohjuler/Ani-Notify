import { expect, test, describe } from "bun:test";
import app from "../src/index";
import { isWithin } from "../src/util/util";
import { getUserId } from "../src/util/aniListUtil";

describe("Main", () => {
    test("/ > 200", async () => {
        const res = await app.request(new Request("http://localhost/"));
        expect(res.status).toBe(200);
    });
    test("/ui > 200", async () => {
        const res = await app.request(new Request("http://localhost/ui"));
        expect(res.status).toBe(200);
    });
    test("/doc > 200", async () => {
        const res = await app.request(new Request("http://localhost/doc"));
        expect(res.status).toBe(200);
    });
    test("/metrics > 200", async () => {
        const res = await app.request(new Request("http://localhost/metrics"));
        expect(res.status).toBe(200);
    });
});

describe("Util", () => {
    test("util.isWithin 1", () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        expect(isWithin(1, 2, date)).toBe(true);
    });
    test("util.isWithin 2", () => {
        const date = new Date();
        date.setDate(date.getDate() - 3);
        expect(isWithin(1, 2, date)).toBe(false);
    });
    test(
        "AniList - Get User id",
        async () => {
            const id = await getUserId("Tohjuler");
            expect(id).toBe("6654172");
        }
    );
});
