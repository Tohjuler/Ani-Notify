FROM oven/bun:latest
WORKDIR /usr/src/app

COPY . .
RUN bun i

ENV NODE_ENV=production

EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "start" ]
