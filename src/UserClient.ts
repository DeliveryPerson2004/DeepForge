import {prisma} from "./database/prisma-client.ts";

export class UserClient {
    public async getSessionList(){
        return await prisma.session.findMany();
    }
}