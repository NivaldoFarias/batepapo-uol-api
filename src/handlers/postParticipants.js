import { stripHtml } from "string-strip-html";
import chalk from "chalk";
import { participantSchema } from "./../models/participants.js";
import { ERROR, database, DB_INFO } from "./../app.js";

export async function postParticipants(req, res) {
  const name = stripHtml(req.body.name).result.trim();
  try {
    const validate = participantSchema.validate(
      { name: name },
      {
        abortEarly: true,
      }
    );
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
      res.status(201).send({ name: name });
    } catch (err) {
      console.log(chalk.red(`${ERROR} ${err}`));
      res.status(500).send(err);
    }
  } catch (err) {
    console.log(chalk.bold.red(err));
    res.status(500).send(err);
  }
}
