// Imports
//require('dotenv').config();
//const { Client, Intents } = require('discord.js');
//const axios = require('axios');
import dotenv from 'dotenv';
import { Client, Intents } from 'discord.js';
import axios from 'axios';
import { Configuration, OpenAIApi } from 'openai';

dotenv.config();

// OpenAI config
const oai_configuration = new Configuration({
    apiKey: process.env.OPENAI_TOKEN
});

const openai = new OpenAIApi(oai_configuration);
await openai.listEngines();

// Discord config
const discord_client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// Auth
discord_client.login(process.env.DISCORD_TOKEN);

// Listener
discord_client.on('messageCreate', message => {
    if(message.mentions.has(discord_client.user))
    {
        // Remove the leading mention
        let message_string = message.content.replace('<@' + discord_client.user.id + ">", "");
        message_string.trimStart();

        let data = {
            "prompt": message_string,
            "temperature": 0.7,
            "max_tokens": 256
        }

        let config = {
            headers: {
                "Authorization": 'Bearer ' + process.env.OPENAI_TOKEN,
                "Content-Type": 'application/json'
            }
        }

        // Make a request to the OpenAI api
        axios.post('https://api.openai.com/v1/engines/text-davinci-002/completions', data, config)
            .then(res => {
                message.channel.send(res.data.choices[0].text);
            }).catch(error => {
                message.channel.send("Error while processing input. " + error);
            });
    }
})