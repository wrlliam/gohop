import chalk from "chalk";
const PREFIX = `${chalk.gray("[")}${chalk.greenBright("gohop")}${chalk.gray("]")}`;

export const error = (message: string) => {
  console.log(`${PREFIX} ${chalk.red("[error]")} ${message}`);
};

export const info = (message: string) => {
  console.log(`${PREFIX} ${chalk.blue("[error]")} ${message}`);
};