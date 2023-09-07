// Define "require"
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

require("dotenv").config();
const schedule = require("node-schedule");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.TELEGRAM_KEY);

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({ apiKey: process.env.OPENAI_KEY });
const openai = new OpenAIApi(configuration);

const express = require("express");
const fileUpload = require("express-fileupload");
const app = express();
// Use the express-fileupload middleware
app.use(fileUpload());
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
  if ((await storage.getItem("conversation")) == undefined) {
    await storage.setItem("conversation", 0);
  }
  if ((await storage.getItem("scheduled_jobs")) == undefined) {
    await storage.setItem("scheduled_jobs", []);
  }
  if ((await storage.getItem("messages")) == undefined) {
    await storage.setItem("messages", []);
  }
  if ((await storage.getItem("context")) == undefined) {
    await storage.setItem("context", [
      {
        role: "system",
        content: "Define bot context here",
      },
    ]);
  }
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
    if (job.type == "IMAGE") {
      bot.telegram.sendPhoto(await storage.getItem("conversation"), {
        source: __dirname + "/assets/upload/images/" + job.message,
      });
    }
    if (job.type == "VIDEO") {
      const readStream = fs.createReadStream(
        __dirname + "/assets/upload/videos/" + job.message
      );
      await bot.telegram.sendVideo(await storage.getItem("conversation"), {
        source: readStream,
      });
    }
    if (job.type == "TEXT") {
      // console.log(job.message);
      const id = await storage.getItem("conversation");
      bot.telegram.sendMessage(
        id,
        // job.message.replace(/[_*\~`>#\+\-=|{}.!]/g, "\\$&"),
        job.message,
        { parse_mode: "html" }
      );
    }
    if (job.type == "PROMPT") {
      // console.log(job.message);
      const id = await storage.getItem("conversation");
      let messages = await storage.getItem("messages");
      messages.push({
        role: "user",
        content: job.message,
      });
      let completion = await ai_completion(messages);
      messages.push({ role: "assistant", content: completion });
      await storage.setItem("messages", messages.slice(-numberOfMessages));
      bot.telegram.sendMessage(id, completion);
    }
    io.emit("refresh");
  });
}

async function job_add(date, message, type) {
  let all_jobs = await storage.getItem("scheduled_jobs");
  let new_job = {
    id: uuidv4(),
    date: date,
    message: message,
    type: type,
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

bot.command("help", async (ctx) => {
  const text =
    "Chatoni ist ein AI-gesteuerten ChatBot, welcher speziell für «AI Encounter» entwickelt wurde, um auf persönliche und einladende Weise Wissen zu vermitteln. Im hintergrund werden ChatGTP und ähnliche Technologien benutzt. Um mit Chatoni in ein Gespräch einzusteigen, genügt es, Chatoni direkt anzusprechen. Ähnlich wie bei vielen KI-Systemen sind nicht alle Potenziale von Beginn an offensichtlich. Deshalb ermutigen wir dazu, verschiedene Ansätze auszuprobieren und aktiv mit Chatoni in Interaktion zu treten, um die vielfältigen Möglichkeiten zu entdecken, die es zu bieten hat. \n\nEntwickelt und umgesetzt vom Designstudio alles-negativ.";
  bot.telegram.sendMessage(
    ctx.chat.id,
    text.replace(/[_*\~`>#\+\-=|{}.!]/g, "\\$&"),
    { parse_mode: "MarkdownV2" }
  );
});

bot.command("empty", async (ctx) => {
  await storage.setItem("messages", []);
  // bot.telegram.sendMessage(ctx.chat.id, "Linked to " + conversation, {});
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

// let system_prompt = [
//   {
//     role: "system",
//     content:
//       "You are a teaching assistant involved in an AI workshop at ZHdK, an art school in Zürich. Keep your answers short and do not make lists or other boring text blocks. Your goal is to teach the participants about AI in various ways. Telling interesting stories or facts might be one of your tools. If it is the first time some one is writing a message within this chat, say hello or welcome the person with it's name, but only if newly eentered the conversation. Do not say the name of the user to often ore repetedly, it is enough to use it in the begining and maybe from time to time during the conversation. It is not good to repeat names to often, therefore do not end a sentence with the name of the user if it is not neccesary. Never start a sentence with 'Assistant: ' or similar, it is not nessesary.",
//   },
// ];
let numberOfMessages = 100;

bot.hears(/\b(?:imagine|Traum)\b/, async (ctx) => {
  bot.telegram.sendChatAction(await storage.getItem("conversation"), "typing");
  // Send the user's message to the ChatGPT API for images
  const response = await openai.createImage({
    prompt: ctx.message.text,
    n: 1,
    size: "512x512",
  });
  // console.log(response.data.data[0].url);
  bot.telegram.sendPhoto(
    // await storage.getItem("conversation"),
    ctx.chat.id,
    response.data.data[0].url
  );
});

bot.hears(/\b(?:Chatoni|chatoni)\b/, async (ctx) => {
  bot.telegram.sendChatAction(await storage.getItem("conversation"), "typing");
  let messages = await storage.getItem("messages");
  messages.push({
    role: "user",
    content: ctx.message.from.first_name + ": " + ctx.message.text,
  });
  let completion = await ai_completion(messages);
  messages.push({ role: "assistant", content: completion });
  await storage.setItem("messages", messages.slice(-numberOfMessages));
  ctx.reply(completion);
});

async function ai_completion(messages = []) {
  // Send the user's message to the ChatGPT API
  let context = await storage.getItem("context");
  const chatCompletion = await openai.createChatCompletion({
    // model: "gpt-3.5-turbo",
    model: "gpt-3.5-turbo-16k",
    // model: "gpt-4",
    messages: context.concat(messages),
  });
  // Send the response from ChatGPT back to the user
  let text = chatCompletion.data.choices[0].message.content;
  return text;
}

bot.on("message", async (ctx) => {
  let messages = await storage.getItem("messages");
  const files = ctx.update.message.photo;
  if (files) {
    let caption = await captionizer(
      await ctx.telegram.getFileLink(files[3].file_id)
    );
    messages.push({
      role: "user",
      content: "image_description: " + caption,
    });
    if (ctx.update.message.caption) {
      messages.push({
        role: "user",
        content:
          ctx.message.from.first_name + ": " + ctx.update.message.caption,
      });
    }
  } else {
    messages.push({
      role: "user",
      content: ctx.message.from.first_name + ": " + ctx.message.text,
    });
  }
  await storage.setItem("messages", messages.slice(-numberOfMessages));
});

//image caption api
async function captionizer(image) {
  TransformersApi = Function('return import("@huggingface/inference")')();
  const { HfInference } = await TransformersApi;

  const inference = new HfInference(process.env.HF_ACCESS_TOKEN);
  let caption = await inference.imageToText({
    // data: await image.blob(),
    data: await (await fetch(image)).blob(),
    model: "Salesforce/blip-image-captioning-base",
  });
  return caption.generated_text;
}

// define express routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
app.get("/jobs", async (req, res) =>
  res.json(await storage.getItem("scheduled_jobs"))
);
app.get("/context", async (req, res) => {
  let context = await storage.getItem("context");
  // console.log(context);
  res.json(context[0].content);
});
app.get("/files", (req, res) => {
  let result = {
    images: [],
    videos: [],
  };
  let images = fs
    .readdirSync(__dirname + "/assets/upload/images")
    .forEach((element) => {
      if (element[0] != ".") {
        result.images.push(element);
      }
    });
  let videos = fs
    .readdirSync(__dirname + "/assets/upload/videos")
    .forEach((element) => {
      if (element[0] != ".") {
        result.videos.push(element);
      }
    });
  res.json(result);
});
app.post("/upload", (req, res) => {
  // Get the file that was set to our field named "image"
  if (req.body.type == "IMAGE") {
    const { file } = req.files;

    // If no image submitted, exit
    if (!file) return res.sendStatus(400);

    // If does not have image mime type prevent from uploading
    // if (/^image/.test(file.mimetype)) return res.sendStatus(400);

    // Move the uploaded image to our upload folder
    file.mv(__dirname + "/assets/upload/images/" + file.name);

    res.sendStatus(200);
  }
  if (req.body.type == "VIDEO") {
    const { file } = req.files;

    // If no image submitted, exit
    if (!file) return res.sendStatus(400);

    // If does not have image mime type prevent from uploading
    // if (/^image/.test(image.mimetype)) return res.sendStatus(400);

    // Move the uploaded image to our upload folder
    file.mv(__dirname + "/assets/upload/videos/" + file.name);

    res.sendStatus(200);
  }
  io.emit("refresh");
});

// define socket.io commands
io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
    io.emit("refresh"); // there is some issue with who is included in the broadcast, I d not know yet
  });
  socket.on("add date", (msg) => {
    job_add(new Date(msg[0]), msg[1], msg[2]);
    io.emit("refresh");
  });
  socket.on("remove date", (msg) => {
    job_remove(msg);
    io.emit("refresh");
  });
  socket.on("update context", async (msg) => {
    let context = await storage.getItem("context");
    context[0].content = msg;
    await storage.setItem("context", context);
    io.emit("refresh");
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
