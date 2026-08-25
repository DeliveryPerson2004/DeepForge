import {prisma} from "./database/prisma-client.ts";
import {Session} from "./Session.ts";
import {logger} from "./logger.ts";



export class UserClient {
    private readonly modelProvider: string;

    constructor(modelProvider: string) {
        this.modelProvider = modelProvider.toUpperCase();
    }

    private async checkModelConnect(){
        const modelProvider = this.modelProvider;
        if(modelProvider === "DEEPSEEK"){
            const API_KEY = process.env.DEEPSEEK_API_KEY;
            if(API_KEY === undefined){
                logger.error("env const DEEPSEEK_API_KEY is null");
                return false;
            }

            const response = await fetch(
                "https://api.deepseek.com/models",
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${API_KEY}`
                    },
                }
            );

            const responseJSONed = await response.json();

            for(const dataItem of responseJSONed.data){
                const modelProvider: string = dataItem.owned_by.toUpperCase();
                if(modelProvider === "DEEPSEEK"){
                    return true;
                }
            }

            return false;
        }else{
            logger.error(`${this.modelProvider} client is wrong`);
            return false;
        }
    }

    public async checkEnvironment(){
        let isSucceed: boolean;
        isSucceed = await this.checkModelConnect();

        return isSucceed;
    }

    public async getSessionList(){
        return await prisma.session.findMany();
    }

    public async createNewSession(workspacePath: string){
        return await Session.createNewSession(workspacePath);
    }

    public async resumeSession(workspacePath: string, sessionId: number){
        return await Session.resumeSession(workspacePath, sessionId);
    }
}