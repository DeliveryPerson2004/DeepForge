import {UserClient} from "../src/backend/UserClient.ts";
import {logger} from "../src/backend/logger.ts";



logger.info("test userClient check environment start");
const userClient = new UserClient("deepseek");

await userClient.checkEnvironment();