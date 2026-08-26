import {logger} from "../../src/backend/logger.ts";

const helloResponse = await fetch("http://localhost:30000/", {
    method: "GET",
});
const hello = await helloResponse.text();
logger.info(hello);

const modelProviderResponse = await fetch("http://localhost:30000/model-provider", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelProvider: "deepseek" }),
});
const modelProviderResult = await modelProviderResponse.json();
logger.info(modelProviderResult);

const environmentResponse = await fetch("http://localhost:30000/environment-is-ready", {
    method: "GET",
});
const environmentResult = await environmentResponse.json();
logger.info(environmentResult);

const sessionListResponse = await fetch("http://localhost:30000/session-list", {
    method: "GET",
});
const sessionList = await sessionListResponse.json();
logger.info(sessionList);
