import {prisma} from "./database/prisma-client.ts";
import {Session} from "./Session.ts";


export class UserClient {
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