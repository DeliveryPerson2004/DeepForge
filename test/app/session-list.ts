import {logger} from "../../src/backend/logger.ts";

const response = await fetch("http://localhost:30000/session-list", {
    method: "GET",
});

const result = await response.json();
logger.info(result);
