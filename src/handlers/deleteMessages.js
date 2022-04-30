import { ObjectId } from "mongodb";
import chalk from "chalk";
import { database, ERROR, DB_INFO } from "./../app.js";

export async function deleteMessages(req, res) {
  const messageId = req.params.messageId;
  try {
    const message = await database
      .collection("messages")
      .findOne({ _id: new ObjectId(messageId) });
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
        .deleteOne({ _id: new ObjectId(messageId) });
      console.log(
        chalk.blue(
          `${DB_INFO} message ${chalk.bold(messageId)} from user ${chalk.bold(
            user
          )} deleted`
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
