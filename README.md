# Manual

## Preparation

Clone the repository and paste your API-keys in the ".env-sampel" file, and rename it to ".env". You are going to need the following keys. For more information on how to use environmental variables see [here](https://www.dotenv.org/docs/security/env.html).

### Telegram key and bot configuration

A big thanks to [zapisnicar](https://gist.github.com/zapisnicar) for the description.

1) Create Telegram bot:

   Search for user @BotFather in the Telegram app. Type /help in BotFather chat and wait for the reply. Type in the chat:

   `/newbot`

   or select /newbot command from the Help text. Answer a few setup questions:

   - Name of your bot? Write anything you like, that info will be shown in the contact details. For example:

   `Dead Parrot`

   - Username for your bot? Must have _bot at the end, use only Latin characters,
   numbers or underscore signs, for example:
   
   `deadparrot_bot`

   BotFather will give you an HTTP API token, remember it and keep **SECRET**!
   Example:

   `1234567890:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

   You should also consider turning the "group privacy" off. This can be done through @BotFather within Telegram. This allows the bot to have access to all messages from the group. See [here](https://teleme.io/articles/group_privacy_mode_of_telegram_bots?hl=en).

2) Create a new Telegram group in the web or mobile application and add the new bot to your group. 
   
   https://web.telegram.org/

### OpenAI Key

Check out the [explanation](https://www.howtogeek.com/885918/how-to-get-an-openai-api-key/) on howtogeek.

### HF Access Token

Check out the [explanation](https://huggingface.co/docs/hub/security-tokens#) on huggingface.

## Installation

Install the required npm modules within the project folder.

```
npm install
```
```
npm i nodemon
```

Run the script with the following command.

```
npm run start
```

The bot should now be running and also provide a local backend for configuration on Port 3000. Open this [link](http://localhost:3000/) in any browser you prefer and set your desired context.

To make the bot fully work you must set a main group for scheduling actions. Therefore open Telegram, create a group, add your bot, and post `/link`. The group is now linked to the bot, which is allowing the bot to send messages to the group without prior interaction. You can change the main group at any time.
