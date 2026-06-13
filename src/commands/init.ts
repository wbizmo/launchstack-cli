import { Command } from "commander";



export const initCommand = new Command("init")

  .description("Initialize LaunchStack project")

  .action(() => {

    console.log("LaunchStack project initialized"); 

  });