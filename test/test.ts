import {UserClient} from "../src/UserClient.ts";

const userClient = new UserClient();

await userClient.checkEnvironment();