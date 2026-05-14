# Supabase to PostgreSQL Migration Plan

This project now runs against the Aspire-managed PostgreSQL container in production. The schema is applied by the `apply-migrations` container before the bot starts, and the bot receives its PostgreSQL connection string from the generated Aspire Docker Compose file.

## Normal Deploy

The normal deployment should:

1. Run `aspire publish` from the `aspire` folder to regenerate `aspire-output/docker-compose.yaml`.
2. Build the bot image on the target Docker host using the image tags passed to Compose.
3. Run `docker compose up -d --remove-orphans` against the generated Aspire compose file.

The deploy pipeline should provide these environment variables:

- `BOT_IMAGE`
- `APPLY_MIGRATIONS_IMAGE`
- `DISCORD_TOKEN`
- `POSTGRES_PASSWORD`

The Aspire compose file derives the internal PostgreSQL connection settings from `POSTGRES_PASSWORD`, including `ConnectionStrings__blacklist-butler`. PostgreSQL does not need to expose a host port for the bot or migration scripts to connect inside the Compose network.

## One-Time Data Migration

The Supabase data migration is intentionally not part of normal deploys. Running it every deploy, especially with `--replace`, can overwrite newer PostgreSQL data with older Supabase data.

After the Aspire stack is up and the bot image exists, run the migration manually inside the bot container image with Supabase credentials injected only for that command.

The command that was verified successfully was:

```bash
docker exec \
  -e SUPABASE_URL="..." \
  -e SUPABASE_SERVICE_ROLE_KEY="..." \
  aspire-docker-compose-4bb7d83c-bot-1 \
  bun run migrate:supabase-to-postgres -- --replace
```

Expected successful output looks like:

```text
Replacing destination PostgreSQL rows before migration
Supabase to PostgreSQL migration finished
blacklist_guilds: 3
blacklist_sections: 78
blacklist_entries: 529
blacklist_message_refs: 80
blacklist_config_entries: 6
blacklist_named_documents: 0
```

## Compose Exec Notes

`docker compose exec bot ...` is also valid, but Compose must use the same project name as the running stack. If Compose is run later from the folder containing `docker-compose.yaml`, it may choose a different default project name and report:

```text
service "bot" is not running
```

In that case, either use the exact container name with `docker exec`, or pass the project name that created the containers:

```bash
docker compose \
  -p aspire-docker-compose-4bb7d83c \
  -f aspire/aspire-output/docker-compose.yaml \
  exec \
  -e SUPABASE_URL="..." \
  -e SUPABASE_SERVICE_ROLE_KEY="..." \
  bot bun run migrate:supabase-to-postgres -- --replace
```

## After Migration

After the migration has been verified:

1. Keep the production bot on `STORE_TYPE=postgres`.
2. Keep the Supabase secrets out of the normal runtime environment.
3. Keep `POSTGRES_PASSWORD` stable so the existing Docker volume remains usable across deploys.
4. Do not remove the PostgreSQL Docker volume unless the production data has been backed up or the database is intentionally being reset.
