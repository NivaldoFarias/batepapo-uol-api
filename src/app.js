import express, { json } from "express";
import { MongoClient, ServerApiVersion } from "mongodb";
import cors from "cors";
import chalk from "chalk";
import Joi from "joi";

import dotenv from "dotenv";
dotenv.config();

let database = null;
const app = express().use(json()).use(cors());
const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;
const regex = /^(message|private_message)$/;
const participantSchema = Joi.object({
  name: Joi.string().alphanum().min(1).max(25).required(),
});
const messageSchema = Joi.object({
  to: Joi.string().alphanum().min(1).max(25).required(),
  text: Joi.string().min(1).required(),
  type: Joi.string().regex(regex).required(),
});
const PARTICIPANTS_PATH = "/participants";
const MESSAGES_PATH = "/messages";
const mongoClient = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
mongoClient.connect(() => {
  database = mongoClient.db("chat_uol");
  console.log(
    chalk.bold.green(
      `Connected to database "${database.databaseName}" at ${mongoClient.s.url}`
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
    console.log(chalk.bold.red(err));
    res.status(500).send(err);
  }
});

app.post(PARTICIPANTS_PATH, async (req, res) => {
  const { name: participant } = req.body;
  try {
    const validate = Joi.validate(participant, participantSchema);
    validate.error
      ? res.status(422).send(validate.error.details[0].message)
      : null;

    const participantExists = await database
      .collection("participants")
      .findOne({ name: participant });
    participantExists
      ? res.status(409).send("Este participante já existe")
      : null;

    await database.collection("participants").insertOne({
      name: participant,
      lastStatus: Date.now(),
    });
    await database.collection("messages").insertOne({
      from: participant,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: new Date().toLocaleTimeString(),
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(chalk.bold.red(err));
    res.status(500).send(err);
  }
});

app.listen(PORT, () => {
  console.log(chalk.bold.yellow(`Server running on port ${PORT}`));
});
