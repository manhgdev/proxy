// index.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: Set CORS cho tất cả request
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// Route chính
app.get("/", async (req, res) => {
  const timestamp = Date.now();

  // ✅ 1. Kiểm tra tham số url
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Missing url parameter");
  }

  // ✅ 2. Lấy các tham số khác
  const debug = req.query.debug === "1";      // Debug mode: trả raw HTML/text
  const download = req.query.download === "1"; // Nếu download=1 thì ép tải về

  // ✅ 3. Header giả lập để tránh bị server chặn
  const customHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    Referer: new URL(targetUrl).origin,
    Origin: new URL(targetUrl).origin,
  };

  try {
    // ✅ 4. Fetch từ URL gốc
    const upstreamResponse = await fetch(targetUrl, {
      method: "GET",
      headers: customHeaders,
      redirect: "follow",
    });

    // ✅ 5. Nếu bật debug=1 thì trả text ra luôn (đỡ phải tải file)
    if (debug) {
      const html = await upstreamResponse.text();
      return res.send(html);
    }

    // ✅ 6. Lấy Content-Type
    const contentType =
      upstreamResponse.headers.get("content-type") ||
      "application/octet-stream";

    // ✅ 7. Tạo tên file tải xuống
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

    // ✅ 8. Set Content-Type
    res.setHeader("Content-Type", contentType);

    // ✅ 9. Nếu có download=1 thì thêm Content-Disposition để ép tải xuống
    if (download) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
    }

    // ✅ 10. Trả dữ liệu về client (stream trực tiếp)
    upstreamResponse.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(502).send(`Error fetching the url: ${err.message}`);
  }
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
