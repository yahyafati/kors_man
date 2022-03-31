import axios from "axios";
import { HTMLElement, parse } from "node-html-parser";

const axiosInstance = axios.create({
    timeout: 14,
});

export interface Torrent {
    title: string;
    seed: string;
    leech: string;
    date: string;
    size: string;
    uploader: string;
    url: string;
}

let PossibleCategories:
    | "TV"
    | "Movies"
    | "Games"
    | "Music"
    | "Apps"
    | "Documentaries"
    | "Anime"
    | "Other"
    | "XXX";

export const Categories: Array<typeof PossibleCategories> = [
    "TV",
    "Movies",
    "Games",
    "Music",
    "Apps",
    "Documentaries",
    "Anime",
    "Other",
    "XXX",
];

export function validCategory(possible: string): typeof PossibleCategories {
    const filtered: Array<typeof PossibleCategories> = Categories.filter(
        (cat) => cat.toLowerCase() === possible.toLowerCase().trim()
    );
    return filtered.length > 0 ? filtered[0] : "Other";
}

function safeTextExtract(element: Element | HTMLElement): string {
    if (element === null || element.textContent === null) return "";
    return element.textContent.trim();
}

function removeDoubleSpaces(title: string): string {
    return title.replace(/\s\s+/g, " ");
}

function getTextContent(element: Element): string {
    const span = element.querySelector("span");
    if (span !== null) {
        span.remove();
    }
    return removeDoubleSpaces(element.innerHTML.trim());
}

function getUrl(element: Element): string {
    if (!element) return "";
    const linkElements = new Array<HTMLAnchorElement>();
    element.querySelectorAll("a").forEach((item) => {
        const href = item.getAttribute("href");
        if (!href) return;
        if (href.includes("torrent")) linkElements.push(item);
    });
    if (linkElements.length == 0) return "";
    return getHref(linkElements[0]);
}

function getHref(element: HTMLElement | HTMLAnchorElement): string {
    if (!element) return "";
    const href = element.getAttribute("href");
    if (!href) return "";
    return href.trim();
}

interface ITorrentDetail {
    meta: {
        [key: string]: string;
    };
    download: {
        [key: string]: string;
        magnet: string;
    };
}

function extractDetails(page: string): ITorrentDetail | null {
    const ROOT_SELECTOR =
        ".box-info.torrent-detail-page.vpn-info-wrap .no-top-radius";
    const BOX_SELECTOR = ".clearfix:not(.torrent-detail)";

    const root = parse(page);
    const rootElement = root.querySelector(ROOT_SELECTOR);
    if (!rootElement) {
        console.error("No Root Element Element Found");
        return null;
    }
    const containerElement = rootElement.querySelector(BOX_SELECTOR);
    if (!containerElement) {
        console.error("No Container Element Found");
        return null;
    }
    const metadata: ITorrentDetail = { download: { magnet: "" }, meta: {} };

    const buttonsList = containerElement.querySelector("ul:not(.list)");
    if (!buttonsList) {
        console.error("No ButtonsList Element Found");
        return null;
    }
    buttonsList.querySelectorAll("li").forEach((li) => {
        li.querySelectorAll("a").forEach((a) => {
            const href = getHref(a);
            if (href.startsWith("magnet:")) {
                metadata.download["magnet"] = href;
            } else if (href !== "#") {
                metadata.download[safeTextExtract(a)] = href;
            }
        });
    });

    const lists = containerElement.querySelectorAll("ul.list");
    lists.forEach((ul) => {
        ul.querySelectorAll("li").forEach((li) => {
            const keyElement = li.querySelector("strong");
            const valueElement = li.querySelector("span");
            if (!keyElement || !valueElement) return;
            const key = safeTextExtract(keyElement);
            const value = safeTextExtract(valueElement);
            metadata.meta[key] = value;
        });
    });
    return metadata;
}

export async function getTorrentDetails(torrent: {
    url: string;
}): Promise<ITorrentDetail | {}> {
    if (!torrent) return {};
    let torrentURL: string = torrent.url;
    if (torrentURL.startsWith("/")) torrentURL = torrentURL.substring(1);
    const res = await axiosInstance.get(`https://1337x.to/${torrentURL}`, {
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    });
    return extractDetails(res.data) || {};
}

async function extractSearchResults(page: string): Promise<Array<Torrent>> {
    const root = parse(page);
    const tbody = root.querySelector("tbody");
    if (!tbody) {
        return [];
    }
    const rows: Array<HTMLTableRowElement> = tbody.querySelectorAll(
        "tr"
    ) as unknown as Array<HTMLTableRowElement>;
    const mapped: Array<Torrent> = rows.map((row) => {
        // There are !s here.
        return {
            title: removeDoubleSpaces(
                safeTextExtract(row.querySelector(".name")!)
            ),
            seed: safeTextExtract(row.querySelector(".seeds")!),
            leech: safeTextExtract(row.querySelector(".leeches")!),
            date: safeTextExtract(row.querySelector(".coll-date")!),
            size: getTextContent(row.querySelector(".size")!),
            uploader: safeTextExtract(row.querySelector(".coll-5.user")!),
            url: getUrl(row.querySelector(".name")!),
        };
    });
    return mapped;
}

function formatQuery(query: string): string {
    return query.replace(/[\W_]+/g, "+");
}

export async function search(
    query: string,
    page: number = 1
): Promise<Array<Torrent>> {
    query = formatQuery(query);
    const res = await axiosInstance.get(
        `https://1337x.to/search/${query}/${page}/`,
        {
            timeout: 15,
        }
    );
    return extractSearchResults(res.data);
}

export async function categorySearch(
    query: string,
    category: typeof PossibleCategories,
    page: number = 1
): Promise<Array<Torrent>> {
    query = formatQuery(query);
    const res = await axiosInstance.get(
        `https://1337x.to/category-search/${query}/${category}/${page}/`
    );
    return extractSearchResults(res.data);
}
