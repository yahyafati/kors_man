import express, { Express, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import {
    categorySearch,
    search,
    validCategory,
    getTorrentDetails,
} from "./TorrentDownloader";
import morgan from "morgan";

dotenv.config();
const app: Express = express();

app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms")
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

app.get("/details/", async (req: Request, res: Response) => {
    const url: string | undefined = req.query.url
        ? String(req.query.url)
        : undefined;
    if (!url) {
        res.status(500).json("No!");
        return;
    }
    const details = await getTorrentDetails({ url });
    res.json(details);
});

app.get("/search/:query/:page", async (req: Request, res: Response) => {
    const query: string = req.params.query;
    const page: number = Number(req.params.page) || 1;
    const torrents = await search(query, page);
    res.json(torrents);
});

app.get(
    "/category/:category/:query/:page",
    async (req: Request, res: Response) => {
        const query: string = req.params.query;
        const page: number = Number(req.params.page) || 1;
        const category = validCategory(req.params.category);
        const torrents = await categorySearch(query, category, page);
        res.json(torrents);
    }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));
