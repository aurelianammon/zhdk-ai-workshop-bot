require('dotenv').config()

const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TELEGRAM_KEY);

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({apiKey: process.env.OPENAI_KEY});
const openai = new OpenAIApi(configuration);

// init local sorage to persist user data and context
const storage = require('node-persist');
async function init() {
    //you must first call storage.init
    await storage.init();
    // await storage.setItem('conversation_list', [])
    // console.log(await storage.getItem('conversation_list')); // yourname
}
init();

// define the bot functions
bot.command('enroll', async (ctx) => {
    const data = await storage.getItem('conversation_list')
    if (!data.includes(ctx.chat.id)) {
        data.push(ctx.chat.id)
        await storage.setItem('conversation_list', data)
        bot.telegram.sendMessage(ctx.chat.id, 'Welcome to this conversation. Send /disenroll to halt this conversation. Your ID is ' + ctx.chat.id, {})
    }
    bot.telegram.sendMessage(ctx.chat.id, 'Hello there! Send me a message or just wait to see what happens.', {})
})
bot.command('disenroll', async (ctx) => {
    console.log(ctx.from)
    const data = await storage.getItem('conversation_list')
    if (data.includes(ctx.chat.id)) {
        await storage.setItem('conversation_list', data.filter(chat => chat !== ctx.chat.id))
        bot.telegram.sendMessage(ctx.chat.id, 'This conversation has been stopped. Send /enroll to restart this conversation.', {})
    }
})
bot.command('stats', async (ctx) => {
    const data = await storage.getItem('conversation_list')
    bot.telegram.sendMessage(ctx.chat.id, "Active participants: " + data, {
    })
})
let system_prompt = "You are a teaching assistant involved in an AI workshop the ZHdK, an art school in Zürich. Keep your answers short and do not make lists or other boring text blocks. Your goal is to teach the participants about AI in various ways. Telling interesting stories or facts might be one of your tools."
bot.on('message', async (ctx) => {
    // Send the user's message to the ChatGPT API
    const chatCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            {role: "system", content: system_prompt}, 
            {role: "user", content: ctx.message.text}
        ],
    });
    // Send the response from ChatGPT back to the user
    ctx.reply(chatCompletion.data.choices[0].message.content);
});
bot.launch();