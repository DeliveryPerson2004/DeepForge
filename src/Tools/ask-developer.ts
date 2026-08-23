import {logger} from "../logger.ts";

export interface askDeveloperInput{
    question: string,
}

export async function askDeveloper(agentName: string, question: string){
    logger.warn(`${agentName} agent ask developer a question: ${question}`);
}