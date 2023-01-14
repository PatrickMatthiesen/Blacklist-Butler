# Blacklist-Butler

This is a Blacklist manager for in channel blacklists. Maybe your game or similar doesn't have a way to manage users you need to remember. If that is the case then Blacklist Butler will be your new friend that easily stores your names or similar in a text channel.

## How to add the bot to your server

Go to a link bellow and pick the server you want to add the bot to.

* [Least permissions](https://discord.com/api/oauth2/authorize?client_id=915952587273023508&permissions=11264&scope=bot%20applications.commands)
* [For possible future features](https://discord.com/api/oauth2/authorize?client_id=915952587273023508&permissions=1236987604054&scope=bot%20applications.commands)
* [All permissions (Administrator)](https://discord.com/api/oauth2/authorize?client_id=915952587273023508&permissions=8&scope=bot%20applications.commands)

## How to setup and run locally

1. Open a command prompt in the projects root folder.
2. New make sure you have Node.js and run 'npm install'.
3. Now go to [Discord](https://discord.com/developers/applications) and make a new application with whatever name and so on that you want.
4. Save the token and make sure not to share it with anyone.
5. Next make a .env file in the project root folder and add 'DISCORD_TOKEN=' followed by your token from you just saved.
6. Now just run 'npm run serve' and the bot will be up and running (only this step is needed in the future)
7. To add the bot to your server.
   1. Go to your bot on [Discord](https://discord.com/developers/applications) again.
   2. Go to OAuth2 -> URL Generator.
   3. For the scope pick bot and application.commands.
   4. for the permissions pick Read Messages/View Channels, Send Messages, Manage Messages.
   5. Copy and save the link.
   6. Enter the link in a web browser and pick the server you want to add the bot to.

## How to make a blacklist channel

1. Make a channel named `blacklist`.
2. (optional) set a prefix with command `/blacklist set-prefix`
   1. Don't recommend doing it later, as support hasn't been added so the blacklist is updated.
3. Init the list with `/blacklist inti`.
   1. if the chat has an old blacklist, then use the option `has-old-list` set to `true`.
   2. If the list should be initialized with additions, then use the option `has-old` set to `true`. Messages in the channel should be in the format `add <name>` to be added on initialization.
4. Use the `/blacklist print` command (recommend not sending any options).
   1. `clean` set true, will remove an old list if exists.

## How to add and remove names

Simply use the /add or /remove commands and give the name that you want to add or remove from the list.

## Other commands to know

### -Role permissions

To allow non-administrator roles access to the bot's admin functions, use the /add-admin-role and /remove-admin-role commands. Simply pick the role you wish to give or deny access to the admin commands.

### -User and Server information

Want to know what your discord id or the servers id, then use the /user or /server commands.

### -Ping Pong

Want to play a little ping pong?
Just use the command ping, and the bot will reply with pong.
