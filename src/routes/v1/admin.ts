import { OpenAPIHono } from "@hono/zod-openapi";
import {
    DeleteSettingRoute,
    GetSettingRoute,
    PutSettingRoute,
    SettingsRoute,
} from "./types/admin_types";
import db from "../../lib/db";
import { getDefault } from "../../util/settingsHandler";
import { bearerAuth } from "hono/bearer-auth";

const route = new OpenAPIHono();

route.use(bearerAuth({
    verifyToken: async (token) => {
        return (await db.apiKey.findFirst({ where: { key: token, admin_access: true } })) !== null;
    },
}))

route.openapi(SettingsRoute, async (c) => {
    const settings = (await db.setting.findMany()).map((s) => ({
        key: s.key,
        value: s.value,
        default: getDefault(s.key),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
    }));

    return c.json(settings, 200);
});

route.openapi(GetSettingRoute, async (c) => {
    const { id } = c.req.valid("param");
    const setting = await db.setting.findFirst({ where: { key: id } });
    if (!setting) return c.json({ error: "Setting not found" }, 404);

    return c.json(
        {
            key: setting.key,
            value: setting.value,
            default: getDefault(setting.key),

            createdAt: setting.createdAt.toISOString(),
            updatedAt: setting.updatedAt.toISOString(),
        },
        200
    );
});

route.openapi(PutSettingRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { value } = c.req.valid("json");
    const setting = await db.setting.findFirst({ where: { key: id } });
    if (!setting) return c.json({ error: "Setting not found" }, 404);

    await db.setting.update({
        where: { key: id },
        data: {
            value,
        },
    });

    return c.json({ success: true }, 200);
});

route.openapi(DeleteSettingRoute, async (c) => {
    const { id } = c.req.valid("param");
    const setting = await db.setting.findFirst({ where: { key: id } });
    if (!setting) return c.json({ error: "Setting not found" }, 404);

    await db.setting.update({
        where: { key: id },
        data: {
            value: getDefault(id),
        },
    });

    return c.json({ success: true }, 200);
});

export default route;
