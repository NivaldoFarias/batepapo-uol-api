import express, { json } from "express";
import { MongoClient, ServerApiVersion } from "mongodb";
import { stripHtml } from "string-strip-html";
import cors from "cors";
import chalk from "chalk";
import Joi from "joi";
import dotenv from "dotenv";
dotenv.config();

let database = null;
const app = express().use(json()).use(cors());
const uri = process.env.MONGODB_URI;
const UPDATE_INTERVAL = 15000;
const SERVER_INFO = chalk.bold.yellow("[Server]");
const DB_INFO = chalk.bold.blue("[Database]");
const ERROR = chalk.bold.red("[ERROR]");
const regex = /^(message|private_message)$/;
const PARTICIPANTS_PATH = "/participants";
const MESSAGES_PATH = "/messages";
const STATUS_PATH = "/status";
const PORT = process.env.PORT || 5000;
const participantSchema = Joi.object({
  name: Joi.string().min(1).max(25).required(),
});
const messageSchema = Joi.object({
  to: Joi.string().min(1).max(25).required(),
  text: Joi.string().min(1).required(),
  type: Joi.string().regex(regex).required(),
});
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

//const interval = setInterval(removeInactiveUsers, UPDATE_INTERVAL);

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

app.post(PARTICIPANTS_PATH, async (req, res) => {
  const {
    participant: { name },
  } = req.body;
  name = stripHtml(name).trim();

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
      .findOne({ name: name });
    if (participantExists) {
      console.log(
        chalk.red(`${ERROR} Participant ${chalk.bold(name)} already exists`)
      );
      res.status(409).send("Este participante já existe");
      return;
    }

    try {
      await database.collection("participants").insertOne({
        name: name,
        lastStatus: Date.now(),
      });
      await database.collection("messages").insertOne({
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: new Date().toLocaleTimeString(),
      });
      console.log(
        chalk.blue(
          `${DB_INFO} user ${chalk.bold(name)} created and message sent`
        )
      );
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
          `${ERROR} Participant ${chalk.bold(message.to)} does not exist`
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
        chalk.red(`${ERROR} Participant ${chalk.bold(user)} does not exist`)
      );
      res.sendStatus(422);
      return;
    }

    try {
      await database.collection("messages").insertOne({
        from: user,
        to: message.to,
        text: stripHtml(message.text),
        type: message.type,
        time: new Date().toLocaleTimeString(),
      });
      console.log(
        chalk.blue(`${DB_INFO} message by user ${chalk.bold(user)} sent`)
      );
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
        chalk.red(`${ERROR} Participant ${chalk.bold(user)} does not exist`)
      );
      res.sendStatus(404);
      return;
    }

    try {
      await database
        .collection("participants")
        .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
      console.log(
        chalk.blue(`${DB_INFO} user ${chalk.bold(user)} status updated`)
      );
      res.sendStatus(200);
    } catch (err) {
      console.log(chalk.red(`${ERROR} ${err}`));
      res.status(500).send(err);
    }
  } catch (err) {
    console.log(chalk.red(`${ERROR} ${err}`));
    res.status(500).send(err);
  }
});

app.delete("/messages/:messageId", async (req, res) => {
  const messageId = req.params.messageId;
  try {
    const message = await database
      .collection("messages")
      .findOne({ _id: new ObjectID(messageId) });
    if (!message) {
      console.log(
        chalk.red(`${ERROR} Message ${chalk.bold(messageId)} does not exist`)
      );
      res.sendStatus(404);
      return;
    }

    const user = req.header("user");
    if (user === undefined) {
      console.log(chalk.red(`${ERROR} No user header`));
      res.status(400).send({ error: "No user header" });
      return;
    }

    if (message.from !== user && message.to !== user) {
      console.log(
        chalk.red(
          `${ERROR} Message ${chalk.bold(
            messageId
          )} does not belong to user ${chalk.bold(user)}`
        )
      );
      res.sendStatus(401);
      return;
    }

    try {
      await database
        .collection("messages")
        .deleteOne({ _id: new ObjectID(messageId) });
      console.log(
        chalk.blue(`${DB_INFO} message ${chalk.bold(messageId)} deleted`)
      );
      res.sendStatus(200);
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

async function removeInactiveUsers() {
  const now = Date.now();
  const inactiveTime = now - UPDATE_INTERVAL;
  try {
    const usersToRemove = await database
      .collection("participants")
      .find({ lastStatus: { $lt: inactiveTime } })
      .toArray();
    if (usersToRemove.length === 0) return;

    const result = await database
      .collection("participants")
      .deleteMany({ lastStatus: { $lt: inactiveTime } });
    console.log(
      chalk.blue(
        `${DB_INFO} ${chalk.bold(result.deletedCount)} user${
          result.deletedCount > 1 ? "s" : ""
        } removed`
      )
    );

    for (const user of usersToRemove) {
      try {
        await database.collection("messages").insertOne({
          from: user.name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: new Date().toLocaleTimeString(),
        });
        console.log(
          chalk.blue(
            `${DB_INFO} inactive user ${chalk.bold(user.name)} message sent`
          )
        );
      } catch (err) {
        console.log(chalk.red(`${ERROR} ${err}`));
      }
    }
  } catch (err) {
    console.log(chalk.red(`${ERROR} ${err}`));
    res.status(500).send(err);
  }
}
