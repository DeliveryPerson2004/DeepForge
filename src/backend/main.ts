import express, { type Express, type Request, type Response } from 'express';
import {AppServer} from "./AppServer.ts";



const app: Express = express();
const appServer = new AppServer();
const port = 30000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!\n');
});

app.listen(port, () => {
    console.log(`DeepForge server listening on port ${port}`);
});