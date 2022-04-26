// Imports
import { Routes } from 'discord-api-types/v9';
import { Client, Intents } from 'discord.js';
import { REST } from '@discordjs/rest'
import { SlashCommandBuilder } from '@discordjs/builders';
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
const OAI_ENDPOINT_BABBAGE = 'https://api.openai.com/v1/engines/text-babbage-001/completions';
const OAI_ENDPOINT_ADA = 'https://api.openai.com/v1/engines/text-ada-001/completions';
const discord_client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ["CHANNEL"] });
discord_client.login(process.env.DISCORD_TOKEN);
const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

// Register commands
const model_command = new SlashCommandBuilder()
    .setName("model")
    .setDescription("Set the model to be used for text generation")
    .addStringOption(option =>
        option.setName("type")
            .setDescription("Type of model. Valid args `davinci`, `curie`, `babbage`, and `ada`.")
            .setRequired(true));

const token_command = new SlashCommandBuilder()
    .setName("token_limit")
    .setDescription("Set the maximum amount of tokens")
    .addIntegerOption(option =>
        option.setName("limit")
            .setDescription("Set the maximum amount of tokens to use for text generation.")
            .setRequired(true));

const temp_command = new SlashCommandBuilder()
    .setName("temperature")
    .setDescription("Set the temperature")
    .addNumberOption(option =>
        option.setName("temp")
            .setDescription("Set the temperature to be used in text generation. Values from 0 to 1.")
            .setRequired(true));

const commands = [
    {
        name: 'help',
        description: 'Get bot information and help',
    },
    {
        name: 'register',
        description: 'Show information about registering',
    },
    {
        name: 'current_settings',
        description: 'List your current configuration settings',
    },
    model_command,
    token_command,
    temp_command
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
    if (message.channel.type === "DM" && username != client_user_name) {
        // Partial checking for token
        // Write token to db
        if (db.data.people[user_id] != null) {
            db.data.people[user_id] = {
                username: username,
                token: message.content
            };
        } else {
            db.data.people[user_id] = {
                username: username,
                token: message.content,
                model: "davinci",
                token_limit: 255,
                temperature: 0.7
            };
        }
        await db.write();
        message.channel.send("You have registered the following API key: **" + message.content + "**\n✅ If this is not correct, send a new message with your corrected key. ✅");
    }
    else if (message.mentions.has(discord_client.user)) {
        // If user is in the DB, make the request
        if (user_id in db.data.people) {
            // Remove the leading mention
            let message_string = message.content.replace('<@' + discord_client.user.id + ">", "");
            message_string.trimStart();

            let data = {
                "prompt": message_string,
                "temperature": db.data.people[user_id].temperature,
                "max_tokens": db.data.people[user_id].token_limit
            }

            let config = {
                headers: {
                    "Authorization": 'Bearer ' + db.data.people[user_id].token,
                    "Content-Type": 'application/json'
                }
            }

            // Make a request to the OpenAI api
            let model = db.data.people[user_id].model;
            let url = "";
            switch (model) {
                case "davinci":
                    url = OAI_ENDPOINT_DAVINCI;
                    break;
                case "curie":
                    url = OAI_ENDPOINT_CURIE;
                    break;
                case "babbage":
                    url = OAI_ENDPOINT_BABBAGE;
                    break;
                case "ada":
                    url = OAI_ENDPOINT_ADA;
                    break;
                default:
                    break;
            }
            axios.post(url, data, config)
                .then(res => {
                    if (res.status == 200)
                        message.reply(res.data.choices[0].text);
                    else
                        message.reply("❌ Something went wrong while making your request. ❌");
                }).catch(error => {
                    if (error.response.status == 401)
                        message.reply("❌ Failed to authenticate successfully. Your API key may be malformed. Send a PM with your corrected API key. ❌");
                });
        }
        // Otherwise, send instructions for registering
        else {
            message.reply("❌ You have not registered an API key. Sending instructions in DM. ❌");
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

    let user_id = interaction.user.id;
    let user_data = db.data.people[user_id];
    let needs_write = false;

    if (interaction.commandName === 'help') {
        interaction.channel.send(
            "This bot provides a discord interface to interact with OpenAI's GPT-3.\n" +
            "Each user will have to register an API key. Instructions for how to do this will" +
            "be sent to a user upon mentioning the bot, or when they type /register."
        );
    }
    else if (interaction.commandName === 'register') {
    }
    else if (interaction.commandName === 'current_settings') {
        if (user_data != {}) {
            interaction.reply(
                " -- Current Settings -- \n" +
                "**Model**: " + d["model"] + "\n" +
                "**Token Limit**: " + d["token_limit"] + "\n" +
                "**Temperature**: " + d["temperature"]
            );
        }
    }
    else if (interaction.commandName === 'model') {
        let model = interaction.options.get("type").value;
        if (model === "davinci" || model === "curie" || model === "babbage" || model === "ada") {
            db.data.people[interaction.user.id].model = model;
            interaction.reply("✅ Model set ✅");
            needs_write = true;
        } else {
            interaction.reply("❌ Invalid model specified ❌");
        }
    }
    else if (interaction.commandName == 'token_limit') {
        let limit = interaction.options.get("limit").value;
        db.data.people[user_id].token_limit = limit;
        interaction.reply("✅ Token limit set ✅");
        needs_write = true;
    }
    else if (interaction.commandName == 'temperature') {
        let temperature = interaction.options.get("temp").value;;
        db.data.people[user_id].temperature = temperature;
        interaction.reply("✅ Temperature set ✅");
        needs_write = true;
    }
    if (needs_write)
        db.write();
});