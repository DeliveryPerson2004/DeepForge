import path from "node:path";

const dirPath = import.meta.dirname;

const instructionsFilePath = path.join(dirPath, "instructions.md");

console.log(instructionsFilePath);