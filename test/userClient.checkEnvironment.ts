import {UserClient} from "../src/UserClient.ts";
import {logger} from "../src/logger.ts";



logger.info("test userClient check environment start");
const userClient = new UserClient("deepseek");

await userClient.checkEnvironment();