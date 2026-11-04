# Blacklist-Butler

This is a Blacklist manager for in channel blacklists. Maybe your game or similar doesn't have a way to manage users you need to remember. If that is the case then Blacklist Butler will be your new friend that easily stores your names or similar in a text channel.

## How to add the bot to your server

Go to a link bellow and pick the server you want to add the bot to.

* [Least permissions (Recommended)](https://discord.com/api/oauth2/authorize?client_id=915952587273023508&permissions=11264&scope=bot%20applications.commands)
* [For possible future features](https://discord.com/api/oauth2/authorize?client_id=915952587273023508&permissions=1236987604054&scope=bot%20applications.commands)
* [All permissions (Administrator)](https://discord.com/api/oauth2/authorize?client_id=915952587273023508&permissions=8&scope=bot%20applications.commands)

## How to setup and run locally

1. Open a command prompt in the projects root folder.
2. New make sure you have Bun installed and run 'bun install'.
3. Now go to [Discord](https://discord.com/developers/applications) and make a new application with whatever name and so on that you want.
4. Save the token and make sure not to share it with anyone.
5. Next make a .env file in the project root folder and add 'DISCORD_TOKEN=' followed by your token from you just saved.
6. Pick a backend with 'STORE_TYPE=local', 'STORE_TYPE=firebase', 'STORE_TYPE=supabase', or 'STORE_TYPE=postgres'. If it is omitted, the bot falls back to local storage.
7. For Firebase, also set 'FIREBASE_STORAGE_BUCKET' and either 'FIREBASE_SERVICE_ACCOUNT_BASE64' or 'GOOGLE_APPLICATION_CREDENTIALS'.
8. For Supabase, set 'SUPABASE_URL' and 'SUPABASE_SERVICE_ROLE_KEY', then run the SQL in 'supabase/schema.sql' in the Supabase SQL editor.
9. For PostgreSQL, set 'ConnectionStrings__blacklist-butler' (Aspire/Npgsql style, for example 'Host=localhost;Port=5432;Database=blacklist_butler;Username=blacklist_butler;Password=password') or a Postgres URL with 'POSTGRES_URL'/'DATABASE_URL', then run the SQL in 'src/Postgres/schema.sql' against that database.
10. Now just run 'bun run start' and the bot will be up and running (only this step is needed in the future)
11. To add the bot to your server, go to your bot on [Discord](https://discord.com/developers/applications) again.
12. Go to OAuth2 -> URL Generator.
13. For the scope pick bot and application.commands.
14. For the permissions pick Read Messages/View Channels, Send Messages, Manage Messages.
15. Copy and save the link.
16. Enter the link in a web browser and pick the server you want to add the bot to.

## How to make a blacklist channel

1. Make a channel named `blacklist`.
2. (optional) set a prefix with command `/blacklist set-prefix`
   1. A prefix is a string that will be added to the start of the header of the message.
   2. Don't recommend doing it later, as support hasn't been added so the blacklist is updated.
3. Init the list with `/blacklist inti`.
   1. if the chat has an old blacklist, then use the option `has-old-list` set to `true`.
   2. If the list should be initialized with additions, then use the option `has-old` set to `true`. Messages in the channel should be in the format `add <name>` to be added on initialization.
4. Use the `/blacklist print` command (recommend not sending any options).
   1. `clean` set true, will remove an old list if exists.

## How to add and remove names

Simply use the /add or /remove commands and give the name that you want to add or remove from the list.

## Import an existing channel list

Run `/blacklist import first-id:<first-message-id> last-id:<last-message-id>` in the `blacklist` channel. Copy and paste the two IDs into the slash command options while browsing the channel, then send the command. There are no popups or ID setup buttons. Either ID order works.

The bot reads that inclusive range, detects the header prefix (for example, `**--A--**` gives `**--`), and previews the section and name counts. Confirm with Import, or choose Cancel. The prefix, names, and original message IDs are saved only after confirmation; the Discord messages stay unchanged. The messages must belong to this bot so later commands can edit them. The range can contain up to 1,000 messages and must contain only one section per letter.

In the `blacklist` channel, run `/blacklist init from-old-list:true` to import the formatted list and save its existing Discord message IDs. Leave `rewrite-list` off. Import reads channel history without deleting, editing, or reposting messages. Later add and remove commands use the saved IDs to edit the existing messages.

The saved prefix must match the existing section headers. If needed, use `/blacklist set-prefix` before importing. If history contains several copies of a letter's section, import uses the newest valid one. To also import `add Name` messages, enable `has-old`.

`rewrite-list:true` explicitly replaces the channel list messages. It is not required for an ordinary import.

## Other commands to know

### -Role permissions

To allow non-administrator roles access to the bot's admin functions, use the /add-admin-role and /remove-admin-role commands. Simply pick the role you wish to give or deny access to the admin commands.

### -User and Server information

Want to know what your discord id or the servers id, then use the /user or /server commands.

### -Ping Pong

Want to play a little ping pong?
Just use the command ping, and the bot will reply with pong.

## Supabase schema and migration

Run the SQL in 'supabase/schema.sql' before starting the bot with 'STORE_TYPE=supabase'.

To migrate existing Firebase data into Supabase, configure both Firebase and Supabase environment variables and run:

```bash
bun run migrate:firebase-to-supabase
```

The migration is idempotent and overwrites the destination rows for a guild so you can rerun it safely.

## PostgreSQL schema

Run the SQL in 'src/Postgres/schema.sql' before starting the bot with 'STORE_TYPE=postgres'.

To migrate existing Supabase data into PostgreSQL, configure 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', and a Postgres connection through 'ConnectionStrings__blacklist-butler', 'POSTGRES_URL', or 'DATABASE_URL', run the SQL in 'src/Postgres/schema.sql', then run:

'ConnectionStrings__blacklist-butler' may be the Aspire/Npgsql connection string that Aspire passes when the app uses 'withReference(postgres)'. URL-style variables must be the full PostgreSQL URL, including username and password.

```bash
bun run migrate:supabase-to-postgres
```

The migration upserts rows so it can be rerun safely. To clear the destination app tables first and make PostgreSQL mirror Supabase, run:

```bash
bun run migrate:supabase-to-postgres -- --replace
```

## Aspire AppHost

A TypeScript Aspire AppHost is available under 'aspire/' and models the bot container plus PostgreSQL for local runs and Docker Compose publishing.

1. Install the Aspire CLI and Docker prerequisites for your machine.
2. Open a command prompt in 'aspire/' and run 'npm install'.
3. Run 'aspire run' and provide the Discord token parameter when prompted.

## Development checks

Use Bun 1.4.4 or later. `bun run typecheck` uses Bun's built-in checker and reads `tsconfig.json`, including its strict library checks. The Aspire build still uses `tsc` to emit JavaScript.

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun test
```

The bot uses discord.js command builders and explicit handlers in `src/commands/index.ts`. At startup, it registers commands in each guild it belongs to. Command tests run without a Discord token or external storage services.

Oxlint checks the bot and its tests using the root `.oxlintrc.json`. Run `bun run lint` inside `aspire/` for the separate AppHost rules, including type-aware unhandled-promise checks using `tsconfig.apphost.json`. The bot does not need the TypeScript compiler package; Aspire retains it to emit JavaScript.

The bot uses Node 25 declarations because Sapphire, a discord.js dependency, imports a type removed in Node 26 declarations. The Aspire project keeps JSON-RPC 8 because its generated SDK imports `vscode-jsonrpc/node.js`.

Bun applies the checked-in `patches/` files to Supabase Auth and Gaxios declarations. These correct conflicts with TypeScript's WebAuthn types and Bun's `fetch.preconnect` property; they do not change runtime code. Recheck the patches when upgrading those packages. Both Dockerfiles copy the patches before installing dependencies.

The root manifest overrides Glob and Minimatch to patched versions outside some parent packages' declared ranges. The Aspire manifest also overrides Minimatch. Recheck these overrides when updating Firebase or development tools, and remove them once the parent packages require patched versions.
