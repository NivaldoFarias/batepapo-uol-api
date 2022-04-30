import chalk from "chalk";
import { UPDATE_INTERVAL, database, DB_INFO, ERROR } from "./../app.js";

export async function removeInactiveUsers() {
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
