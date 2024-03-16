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
DATABASE_URL="file:./dev.db"

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
```

### 💻Local Development
1. Clone the repo
2. Install dependencies `bun i install`
3. Create a .env, and fill it in.
4. Start the server `bun run dev`

### 🖥️Docker
Comming...

## 📝Contribution
Contributions are always welcome!
Contributions can be given in the form of:
- Code (PR)
- Documentation (PR)
- Ideas (Issues)
- Bug reports (Issues)