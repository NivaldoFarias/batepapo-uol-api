import express, { json } from "express";
import { MongoClient, ServerApiVersion } from "mongodb";
import cors from "cors";
import chalk from "chalk";
import Joi from "joi";

import dotenv from "dotenv";
dotenv.config();

let database = null;
const app = express().use(json()).use(cors());
const uri = process.env.MONGODB_URI;
const SERVER_INFO = chalk.bold.yellow("[Server]");
const API_INFO = chalk.bold.blue("[API]");
const DB_INFO = chalk.bold.green("[Database]");
const ERROR = chalk.bold.red("[ERROR]");
const regex = /^(message|private_message)$/;
const participantSchema = Joi.object({
  name: Joi.string().min(1).max(25).required(),
});
const messageSchema = Joi.object({
  to: Joi.string().min(1).max(25).required(),
  text: Joi.string().min(1).required(),
  type: Joi.string().regex(regex).required(),
});
const PARTICIPANTS_PATH = "/participants";
const MESSAGES_PATH = "/messages";
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
      `${API_INFO} Connected to database ${chalk.underline.blue(
        database.databaseName
      )}`
    )
  );
});

app.get(PARTICIPANTS_PATH, async (req, res) => {
  try {
    const participants = await database
      .collection("participants")
      .find()
      .toArray();
    res.send(participants);
  } catch (err) {
    console.log(chalk.red(`${ERROR} ${err}`));
    res.status(500).send(err);
  }
});

app.post(PARTICIPANTS_PATH, async (req, res) => {
  const participant = req.body;

  try {
    const validate = participantSchema.validate(participant, {
      abortEarly: true,
    });
    if (validate.error) {
      console.log(chalk.red(`${ERROR} ${validate.error.details[0].message}`));
      res.status(422).send(validate.error.details[0]);
      return;
    }

    const participantExists = await database
      .collection("participants")
      .findOne({ name: participant.name });
    if (participantExists) {
      console.log(
        chalk.red(
          `${ERROR} Participant ${chalk.underline(
            participant.name
          )} already exists`
        )
      );
      res.status(409).send("Este participante já existe");
      return;
    }

    try {
      await database.collection("participants").insertOne({
        name: participant.name,
        lastStatus: Date.now(),
      });
      await database.collection("messages").insertOne({
        from: participant.name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: new Date().toLocaleTimeString(),
      });
      console.log(chalk.green(`${DB_INFO} ${participant.name} inserted`));
      res.sendStatus(201);
    } catch (err) {
      console.log(chalk.red(`${ERROR} ${err}`));
      res.status(500).send(err);
    }
  } catch (err) {
    console.log(chalk.bold.red(err));
    res.status(500).send(err);
  }
});

app.get(MESSAGES_PATH, async (req, res) => {
  const user = req.header("user");
  if (user === undefined) {
    console.log(chalk.red(`${ERROR} No user header`));
    res.status(400).send({ error: "No user header" });
    return;
  }
  try {
    const messages = await database.collection("messages").find().toArray();
    const limit = parseInt(req.query.limit) || messages.length;
    const output = messages
      .reverse()
      .slice(0, limit)
      .filter((message) => {
        return (
          message.to === user || message.to === "Todos" || message.from === user
        );
      });
    res.send(output);
  } catch (err) {
    console.log(chalk.red(`${ERROR} ${err}`));
    res.status(500).send(err);
  }
});

app.post(MESSAGES_PATH, async (req, res) => {
  const message = req.body;
  try {
    const validate = messageSchema.validate(message, {
      abortEarly: true,
    });
    if (validate.error) {
      console.log(chalk.red(`${ERROR} ${validate.error.details[0].message}`));
      res.status(422).send(validate.error.details[0]);
      return;
    }

    const destinatary = await database
      .collection("participants")
      .findOne({ name: message.to });
    if (!destinatary) {
      console.log(
        chalk.red(
          `${ERROR} Participant ${chalk.underline(message.to)} does not exist`
        )
      );
      res.status(404).send({ error: "Este participante não existe" });
      return;
    }

    const user = req.header("user");
    if (user === undefined) {
      console.log(chalk.red(`${ERROR} No user header`));
      res.status(400).send({ error: "No user header" });
      return;
    }

    const remetent = await database
      .collection("participants")
      .findOne({ name: user });
    if (!remetent) {
      console.log(
        chalk.red(
          `${ERROR} Participant ${chalk.underline(user)} does not exist`
        )
      );
      res.sendStatus(422);
      return;
    }

    try {
      await database.collection("messages").insertOne({
        from: user,
        to: message.to,
        text: message.text,
        type: message.type,
        time: new Date().toLocaleTimeString(),
      });
      console.log(chalk.green(`${DB_INFO} message from ${user} sent`));
      res.sendStatus(201);
    } catch (err) {
      console.log(chalk.red(`${ERROR} ${err}`));
      res.status(500).send(err);
    }
  } catch (err) {
    console.log(chalk.red(`${ERROR} ${err}`));
    res.status(500).send(err);
  }
});

app.post(STATUS_PATH, async (req, res) => {
  const user = req.header("user");
  if (user === undefined) {
    console.log(chalk.red(`${ERROR} No user header`));
    res.status(400).send({ error: "No user header" });
    return;
  }

  try {
    const participant = await database
      .collection("participants")
      .findOne({ name: user });
    if (!participant) {
      console.log(
        chalk.red(
          `${ERROR} Participant ${chalk.underline(user)} does not exist`
        )
      );
      res.sendStatus(422);
      return;
    }

    try {
      await database
        .collection("participants")
        .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
      console.log(chalk.green(`${DB_INFO} ${user} status updated`));
      res.sendStatus(201);
    } catch (err) {
      console.log(chalk.red(`${ERROR} ${err}`));
      res.status(500).send(err);
    }
  } catch (err) {
    console.log(chalk.red(`${ERROR} ${err}`));
    res.status(500).send(err);
  }
});

app.listen(PORT, () => {
  console.log(chalk.bold.yellow(`${SERVER_INFO} running on port ${PORT}`));
});
