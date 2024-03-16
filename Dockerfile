FROM imbios/bun-node:latest
WORKDIR /usr/src/app

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY src src
COPY tsconfig.json .
COPY prisma prisma

ENV NODE_ENV=production

EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "start" ]