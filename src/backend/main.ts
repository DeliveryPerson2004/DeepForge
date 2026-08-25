import express, { type Express, type Request, type Response } from 'express';
import {AppServer} from "./AppServer.ts";

const app: Express = express();
const userClient = new AppServer();
const port = 30000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!\n');
});

app.get('/session-list', async (req: Request, res: Response) => {
    const sessionList = await userClient.getSessionList();

    res.send(sessionList);
});

app.get('/environment-is-ready', async (req: Request, res: Response) => {
    const isReady = await userClient.checkEnvironment();

    res.send(isReady);
});

app.post('/model-provider', async (req: Request, res: Response) => {
    const modelProvider: string = req.body.modelProvider;

    const isSuccess = userClient.setModelProvider(modelProvider);

    res.send(isSuccess);
});

app.listen(port, () => {
    console.log(`DeepForge server listening on port ${port}`);
});