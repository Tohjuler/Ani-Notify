<h1 align="center">Ani-Notify</h1>
<p align="center">
  <img src="https://skillicons.dev/icons?i=ts" />
  <img height="50px" src="https://avatars.githubusercontent.com/u/98495527?s=200&v=4" />
  <br/>
</p>
<p align="center">A notification system for Anime</p>
<br/><br/>

## Table of Contents
* [⚡General Info](#general-information)
* [🧬Tech Tack](#tech-stack)
* [🔥Endpoints](#endpoints)
* [🔨Setup](#setup)
* [📝Contribution](#contribution)

## ⚡General Information
The project is pretty simple, it tracks anime and send notifications 
to either a discord webhook or a ntfy url.
<br/>
It can also be integrated into a app to handle notifications.

## 🧬Tech Stack
- [Bun](https://bun.sh) - Js Runtime
- [Hono](https://hono.dev) - Api framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Consumet.org](https://github.com/consumet/api.consumet.org) - Content API

## 🔥Endpoints
Check the [SwaggerUI](https://ani-notify.tohjuler.dk/ui)

## 🔨Setup

### ⚙️Environment Variables

```
# Used for Prisma. Read about it here https://www.prisma.io/docs/orm/reference/connection-urls
DATABASE_URL="file:./db.db"

# Host your own from here https://github.com/consumet/api.consumet.org
CONSUMET_URL=""

# Remove the CRON variable to disable the cron job
# This is the job for check for new episodes.
CRON="*/60 * * * *" 

# The amount of days where a ep is considered new, and will be shows in notifications
NEW_EP_TIME="5" 

# To edit or delete a user you will need the id (uuid) and the username.
# There are no sensitive data in the user table.
ALLOW_EDIT="true"
ALLOW_DELETE="true"

# SENTRY_DSN="<sentry_dsn>" # By default is to use Tohjuler's DSN, and is recommended to keep it like that.
# DISABLE_SENTRY_DSN="true" # Outcomment this line to disable Sentry
```

### 📊Metrics
You can hook prometheus up to `/metrics` for metrics.

### 💻Local Development
1. Clone the repo
2. Install dependencies `bun i install`
3. Create a .env, and fill it in.
4. Start the server `bun run dev`

### 🖥️Docker
Get the .env.example file from the repo, edit it and then rename it to .env

This example expects you use the default database setup from .env.example
<br>
Run the image:
```bash
docker run -d -it \
--name Aniplay \
-p 3000:3000 \
-v .env/.env:/usr/src/app/.env \
-v db.db:/usr/src/app/prisma/db.db \
ghcr.io/tohjuler/ani-notify:latest
```

For at full stack deploy (app and consumet api)
See [docker-compose.yml](https://github.com/Tohjuler/Ani-Notify/blob/master/docker-compose.yml)

Access the api at ``http://localhost:3000``
<br>
and the Swagger UI at ``http://localhost:3000/ui``

## 📝Contribution
Contributions are always welcome!
Contributions can be given in the form of:
- Code (PR)
- Documentation (PR)
- Ideas (Issues)
- Bug reports (Issues)