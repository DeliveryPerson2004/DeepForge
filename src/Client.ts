import {prisma} from "./database/prisma-client.ts";

export class Client{
    public async getSessionList(){
        return await prisma.session.findMany();
    }
}