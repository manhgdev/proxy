// index.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const timestamp = Date.now();
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send("Missing url parameter");
  }

  const debug = req.query.debug === "1";
  const download = req.query.download === "1"; // ✅ kiểm tra download=1

  // Header giả lập
  const customHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    Referer: new URL(targetUrl).origin,
    Origin: new URL(targetUrl).origin,
  };

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: "GET",
      headers: customHeaders,
      redirect: "follow",
    });

    if (debug) {
      const html = await upstreamResponse.text();
      return res.send(html);
    }

    const contentType =
      upstreamResponse.headers.get("content-type") ||
      "application/octet-stream";

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

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    res.setHeader("Content-Type", contentType);

    // ✅ Nếu có download=1 thì ép tải xuống
    if (download) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
    }

    // Stream nội dung trực tiếp
    upstreamResponse.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(502).send(`Error fetching the url: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
