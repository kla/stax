import { Command } from "commander"

const program = new Command()
program.name("n3xus")

program.command("setup").description("Setup a new project")
  .action(() => console.log("setup"))

program.parse(process.argv)
