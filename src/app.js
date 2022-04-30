import express, { json } from "express";
import { MongoClient, ServerApiVersion } from "mongodb";
import cors from "cors";
import chalk from "chalk";
import dotenv from "dotenv";

import { getMessages } from "./handlers/getMessages.js";
import { getParticipants } from "./handlers/getParticipants.js";
import { postParticipants } from "./handlers/postParticipants.js";
import { postMessages } from "./handlers/postMessages.js";
import { postStatus } from "./handlers/postStatus.js";
import { deleteMessages } from "./handlers/deleteMessages.js";
import { putMessages } from "./handlers/putMessages.js";
import { removeInactiveUsers } from "./utils/removeInactiveUsers.js";

export let database = null;
export const DB_INFO = chalk.bold.blue("[Database]");
export const ERROR = chalk.bold.red("[ERROR]");
export const UPDATE_INTERVAL = 15000;

dotenv.config();

const app = express().use(json()).use(cors());
const uri = process.env.MONGODB_URI;
const SERVER_INFO = chalk.bold.yellow("[Server]");
const PARTICIPANTS_PATH = "/participants";
const MESSAGES_PATH = "/messages";
const DEL_MESSAGES_PATH = "/messages/:messageId";
const PUT_MESSAGES_PATH = "/messages/:messageId";
const STATUS_PATH = "/status";
const PORT = process.env.PORT || 5000;
const mongoClient = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
mongoClient.connect(() => {
  database = mongoClient.db("chat_uol");
  console.log(
    chalk.blue(
      `${DB_INFO} Connected to database ${chalk.bold.blue(
        database.databaseName
      )}`
    )
  );
});

setInterval(removeInactiveUsers, UPDATE_INTERVAL);

app.get(PARTICIPANTS_PATH, getParticipants);

app.get(MESSAGES_PATH, getMessages);

app.post(PARTICIPANTS_PATH, postParticipants);

app.post(MESSAGES_PATH, postMessages);

app.post(STATUS_PATH, postStatus);

app.delete(DEL_MESSAGES_PATH, deleteMessages);

app.put(PUT_MESSAGES_PATH, putMessages);

app.listen(PORT, () => {
  console.log(chalk.bold.yellow(`${SERVER_INFO} running on port ${PORT}`));
});
