require("dotenv").config();
const schedule = require("node-schedule");
const { v4: uuidv4 } = require("uuid");

const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.TELEGRAM_KEY);

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({ apiKey: process.env.OPENAI_KEY });
const openai = new OpenAIApi(configuration);

const express = require("express");
const app = express();
app.use(express.static(__dirname + "/assets"));
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// init local sorage to persist user data and context
const storage = require("node-persist");
async function init() {
  // you must first call storage.init
  await storage.init();
  // create storage items here, only use to initiate, or the data will be overwriten
  // await storage.setItem("conversation", Integer);
  // await storage.setItem("scheduled_jobs", [{id, date, string, parameter}]);
  // await storage.setItem("messages", [
  //   { role: "system", content: system_prompt },
  // ]);
}

async function jobs_init() {
  const all_jobs = await storage.getItem("scheduled_jobs");
  for (let job of all_jobs) {
    job_init(job);
  }
  // console.log(schedule.scheduledJobs);
}

async function job_init(job) {
  const date = new Date(job.date);
  const job_id = schedule.scheduleJob(job.id, date, async function () {
    // console.log(job.message);
    const id = await storage.getItem("conversation");
    bot.telegram.sendMessage(id, job.message, { parse_mode: "MarkdownV2" });
  });
}

async function job_add(date, message, parameter = 0) {
  let all_jobs = await storage.getItem("scheduled_jobs");
  new_job = {
    id: uuidv4(),
    date: date,
    message: message,
    parameter: parameter,
  };
  await job_init(new_job);
  all_jobs.push(new_job);
  await storage.setItem("scheduled_jobs", all_jobs);
}

async function job_edit(id, date, message, parameter = 0) {
  let all_jobs = await storage.getItem("scheduled_jobs");
  let index = all_jobs.findIndex((e) => e.id === id);
  all_jobs[index] = {
    id: id,
    date: date,
    message: message,
    parameter: parameter,
  };
  await storage.setItem("scheduled_jobs", all_jobs);
}

async function job_remove(id) {
  let all_jobs = await storage.getItem("scheduled_jobs");
  let index = all_jobs.findIndex((e) => e.id === id);
  if (index > -1) {
    // only splice array when item is found
    all_jobs.splice(index, 1); // 2nd parameter means remove one item only
  }
  schedule.cancelJob(id);
  await storage.setItem("scheduled_jobs", all_jobs);
}

// define bot functions
bot.command("link", async (ctx) => {
  await storage.setItem("conversation", ctx.chat.id);
  const conversation = await storage.getItem("conversation");
  bot.telegram.sendMessage(ctx.chat.id, "Linked to " + conversation, {});
});

bot.command("stats", async (ctx) => {
  const data = await storage.getItem("conversation");
  bot.telegram.sendMessage(ctx.chat.id, "Active conversation: " + data, {});
  // show all stored elements keys
  // console.log(await storage.keys());
  // console.log(await storage.getItem("scheduled_jobs"));
  // console.log(
  //   schedule.scheduledJobs["55370872-de48-4255-8e12-3f31e3b4dc93"]
  //     .pendingInvocations
  // );
});

// let system_prompt =
//   "You are a teaching assistant involved in an AI workshop at ZHdK, an art school in Zürich. Keep your answers short and do not make lists or other boring text blocks. Your goal is to teach the participants about AI in various ways. Telling interesting stories or facts might be one of your tools.";

bot.hears(/\b(?:imagine)\b/, async (ctx) => {
  // Send the user's message to the ChatGPT API for images
  const response = await openai.createImage({
    prompt: ctx.message.text,
    n: 1,
    size: "512x512",
  });
  bot.telegram.sendPhoto(
    await storage.getItem("conversation"),
    response.data.data[0].url
  );
});

bot.hears(/\b(?:echo|Echo)\b/, async (ctx) => {
  let messages = await storage.getItem("messages");
  messages.push({
    role: "user",
    content: ctx.message.from.first_name + ": " + ctx.message.text,
  });
  // Send the user's message to the ChatGPT API
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    // model: "gpt-4",
    messages: messages,
  });
  // Send the response from ChatGPT back to the user
  let text = chatCompletion.data.choices[0].message.content;
  messages.push({ role: "assistant", content: text });
  await storage.setItem("messages", messages);
  ctx.reply(text);
});

bot.on("message", async (ctx) => {
  let messages = await storage.getItem("messages");
  messages.push({
    role: "user",
    content: ctx.message.from.first_name + ": " + ctx.message.text,
  });
  await storage.setItem("messages", messages);
});

// define express routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
app.get("/jobs", async (req, res) =>
  res.json(await storage.getItem("scheduled_jobs"))
);

// define socket.io commands
io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
  });
  socket.on("add date", (msg) => {
    job_add(new Date(msg[0]), msg[1]);
  });
  socket.on("remove date", (msg) => {
    job_remove(msg);
  });
});

// main function to run the code async
async function main() {
  await init();

  // start bot
  bot.launch();

  // start express server
  server.listen(3000, () => {
    console.log("listening on *:3000");
  });

  // TESTS
  // await job_add(Date.now(), "hello");
  // await job_remove("2c1dec98-27f3-47cd-9b65-6e34e49760cc");
  await jobs_init();
}

// start the script and handle errors
main().catch((err) => {
  console.error(err);
});
