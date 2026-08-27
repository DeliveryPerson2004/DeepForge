import {prisma} from "./prisma-client.ts";
import {Session} from "./Session.ts";
import {logger} from "./logger.ts";



export class AppServer {
    private modelProvider: string | null = null;

    public setModelProvider(modelProvider: string){
        this.modelProvider = modelProvider;

        return true;
    }

    private async checkModelConnect(){
        if(this.modelProvider === null){
            logger.error("model provider is null");
            return false;
        }

        const modelProvider = this.modelProvider.toUpperCase();
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
                    logger.info("model provider is DeepSeek");
                    return true;
                }
            }

            logger.error("model provider is wrong");
            return false;
        }else{
            logger.error(`${modelProvider} client is wrong`);
            return false;
        }
    }

    public async checkEnvironment(){
        let isSucceed: boolean = false;
        if(await this.checkModelConnect()){
            isSucceed = true;
        }

        return isSucceed;
    }

    public async getSessionList(){
        return await prisma.session.findMany();
    }

    public async createNewSession(workspacePath: string){
        return await Session.createSession(workspacePath);
    }

    public async resumeSession(sessionId: number){
        const session = await Session.resumeSession(sessionId);
        if(session != null){
            return session;
        }
    }
}