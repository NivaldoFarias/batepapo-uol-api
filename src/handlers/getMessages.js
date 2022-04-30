import chalk from "chalk";
import { ERROR, database } from "./../app.js";

export async function getMessages(req, res) {
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
    res.send(output.reverse());
  } catch (err) {
    console.log(chalk.red(`${ERROR} ${err}`));
    res.status(500).send(err);
  }
}
