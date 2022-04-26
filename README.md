# Jargon
This is chat bot for discord powered by OpenAI's GPT-3.

## Features
- Interact with GPT-3 through discord messages.
- API key seperation. Each user can register their own key (GPT-3 is expensive).
- Model switching. Each user can specify which model they want the bot to use.

## Setup
- Create a new discord bot on the developer console [here](https://discord.com/developers/applications).
- Create a file called `.env` in the same folder as index.js
- Enter `DISCORD_TOKEN=*` and `DISCORD_CLIENT_ID=*` in the env file, replacing the astricks with the values from that page.
- Run the bot with `node index.js`