// index.js
import express from "express";
import { Readable } from "stream";
import { pipeline } from "stream";
import { promisify } from "util";

const app = express();
const PORT = process.env.PORT || 10000;
const pump = promisify(pipeline);

// ===== Middleware CORS =====
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
});

// ===== Main Route =====
app.get("/", async (req, res) => {
    const timestamp = Date.now();
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing url parameter");

    const debug = req.query.debug === "1";
    const download = req.query.download === "1";

    // headers giả browser
    const customHeaders = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        Referer: new URL(targetUrl).origin,
        Origin: new URL(targetUrl).origin,
    };

    try {
        const upstreamResponse = await fetch(targetUrl, {
            headers: customHeaders,
            redirect: "follow",
        });

        const contentType =
            upstreamResponse.headers.get("content-type") ||
            "application/octet-stream";

        if (debug) {
            if (
                contentType.startsWith("text/") ||
                contentType.includes("json") ||
                contentType.includes("xml")
            ) {
                const text = await upstreamResponse.text();
                return res.send(text);
            }
        }

        // tên file xuất ra
        let extension =
            req.query.extension ||
            contentType.split("/")[1]?.split(";")[0] ||
            "bin";

        const quality = req.query.quality;
        const name = req.query.name;
        const newName = name
            ? `${name}_${timestamp}`
            : quality
                ? `${quality}_${timestamp}`
                : `zmapi_${timestamp}`;
        const filename = `${newName}.${extension}`;

        res.setHeader("Content-Type", contentType);
        if (download) {
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${filename}"`
            );
        }

        // ✅ Stream an toàn bằng pipeline
        await pump(
            Readable.fromWeb(upstreamResponse.body),
            res
        );
    } catch (err) {
        console.error("Proxy error:", err);
        if (!res.headersSent) {
            res.status(502).send(`Error fetching the url: ${err.message}`);
        } else {
            res.end();
        }
    }
});

// ===== Start server =====
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});