import express, { Express, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import {
    categorySearch,
    search,
    validCategory,
    getTorrentDetails,
    Torrent,
} from "./TorrentDownloader";

dotenv.config();
const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

app.get("/details/", async (req: Request, res: Response) => {
    const torrent: Torrent = req.body.torrent;
    const details = await getTorrentDetails(torrent);
    res.json(details);
});

app.get("/search/:query", async (req: Request, res: Response) => {
    const query: string = req.params.query;
    const torrents = await search(query);
    res.json(torrents);
});

app.get("/category/:query/:category", async (req: Request, res: Response) => {
    const query: string = req.params.query;
    const category = validCategory(req.params.category);
    const torrents = await categorySearch(query, category);
    res.json(torrents);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));
