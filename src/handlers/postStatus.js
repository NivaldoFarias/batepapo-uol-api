import chalk from "chalk";
import { ERROR, database, DB_INFO } from "./../app.js";

export async function postStatus(req, res) {
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
}
