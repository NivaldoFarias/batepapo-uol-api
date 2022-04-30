import { stripHtml } from "string-strip-html";
import chalk from "chalk";
import { messageSchema } from "./../models/messages.js";
import { ERROR, database, DB_INFO } from "./../app.js";

export async function postMessages(req, res) {
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

    if (message.type === "private_message") {
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
        text: stripHtml(message.text).result,
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
}
