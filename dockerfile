## --- Base dependencies layer ---
## Use official Bun image (uses Debian slim) https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

## --- Runtime image ---
FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production\
    PORT=3000

# Copy only production node_modules and source code needed at runtime
COPY --from=deps /app/node_modules node_modules
COPY src src
COPY package.json bun.lock ./

# (Optional) if you transpile in future, copy dist instead of src.
# Credentials / data (firebase key, guild data) are mounted at runtime via docker-compose.

USER bun
EXPOSE 3000
ENTRYPOINT ["bun","src/index.ts"]
