// Imports
import { Routes } from 'discord-api-types/v9';
import { Client, Intents } from 'discord.js';
import { REST } from '@discordjs/rest'
import { join, dirname } from 'path'
import { Low, JSONFile } from 'lowdb'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv';
import axios from 'axios';

// Init .env
dotenv.config();

// Constants
const OAI_ENDPOINT_DAVINCI = 'https://api.openai.com/v1/engines/text-davinci-002/completions';
const OAI_ENDPOINT_CURIE = 'https://api.openai.com/v1/engines/text-curie-001/completions';
const discord_client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ["CHANNEL"] });
discord_client.login(process.env.DISCORD_TOKEN);
const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

// Register commands
const commands = [
    {
        name: 'help',
        description: 'Gets bot information and help.',
    },
];
await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });


// DB
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const db = new Low(adapter)

// Wait for file and write default contents if none exist
await db.read();
db.data ||= { people: {} };
await db.write();

// Listener for messages
discord_client.on('messageCreate', async message => {
    let username = message.author.username;
    let client_user_name = discord_client.user.username;
    let user_id = message.author.id;
    if(message.channel.type === "DM" && username != client_user_name)
    {
        // Partial checking for token
        // Write token to db
        db.data.people[user_id] = {
            username: username,
            token: message.content
        };
        await db.write();
        message.channel.send("You have registered the following API key: **" + message.content + "**\n✅ If this is not correct, send a new message with your corrected key. ✅");
    }
    else if (message.mentions.has(discord_client.user)) {
        // If user is in the DB, make the request
        if(user_id in db.data.people) {
            // Remove the leading mention
            let message_string = message.content.replace('<@' + discord_client.user.id + ">", "");
            message_string.trimStart();

            let data = {
                "prompt": message_string,
                "temperature": 0.7,
                "max_tokens": 250
            }

            let config = {
                headers: {
                    "Authorization": 'Bearer ' + db.data.people[user_id].token,
                    "Content-Type": 'application/json'
                }
            }

            // Make a request to the OpenAI api
            axios.post(OAI_ENDPOINT_DAVINCI, data, config)
                .then(res => {
                    if(res.status == 200)
                        message.channel.send(res.data.choices[0].text);
                    else
                        message.channel.send("❌ Something went wrong while making your request. ❌");
                }).catch(error => {
                    if(error.response.status == 401)
                        message.channel.send("❌ Failed to authenticate successfully. Your API key may be malformed. Send a PM with your corrected API key. ❌");
                });
        }
        // Otherwise, send instructions for registering
        else {
            message.channel.send("❌ You have not registered an API key. Sending instructions in DM. ❌");
            message.author.send(
                "**Registration Steps**\n" +
                "- Register an account at <https://auth0.openai.com/u/signup/>\n" +
                "- Create an API key here <https://beta.openai.com/account/api-keys>\n" +
                "- Send a DM to me including only your API key"
            );
        }
    }
})

// Listener for commands
discord_client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return; // Break if not a command
    if (interaction.commandName === 'help') {
        interaction.channel.send("This is the help message bro.");
    }
});