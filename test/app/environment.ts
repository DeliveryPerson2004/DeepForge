import {logger} from "../../src/backend/logger.ts";



const response = await fetch("http://localhost:30000/environment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelProvider: "deepseek" }),
});

const result = await response.json();
logger.info(result);
