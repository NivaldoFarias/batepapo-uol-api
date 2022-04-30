import { ObjectId } from "mongodb";
import chalk from "chalk";
import { messageSchema } from "./../models/messages.js";
import { ERROR, database, DB_INFO } from "./../app.js";

export async function putMessages(req, res) {
  const messageId = req.params.messageId;
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

    const messageToUpdate = await database
      .collection("messages")
      .findOne({ _id: new ObjectId(messageId) });
    if (!messageToUpdate) {
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

    if (messageToUpdate.from !== user && messageToUpdate.to !== user) {
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
        .updateOne({ _id: new ObjectId(messageId) }, { $set: message });
      console.log(
        chalk.blue(
          `${DB_INFO} message ${chalk.bold(messageId)} from user ${chalk.bold(
            user
          )} updated`
        )
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
}
