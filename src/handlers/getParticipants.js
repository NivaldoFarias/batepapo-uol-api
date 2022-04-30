import chalk from "chalk";
import { database, ERROR } from "./../app.js";

export async function getParticipants(_req, res) {
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
}
