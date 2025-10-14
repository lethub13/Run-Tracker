// File: api/proxy.js
export default async function handler(req, res) {
  try {
    const target = process.env.APPS_SCRIPT_URL;
    if (!target) {
      res.status(500).json({ ok: false, error: "Missing APPS_SCRIPT_URL env" });
      return;
    }

    // Build full target URL with query
    const qs = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
    const url = target + qs;

    // Prepare fetch init
    const init = { method: req.method, headers: {} };

    // Forward headers we care about (keep it simple)
    const incoming = req.headers || {};
    if (incoming["content-type"]) init.headers["content-type"] = incoming["content-type"];

    if (req.method !== "GET" && req.method !== "HEAD") {
      // Body: read raw buffer then pass through
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const bodyBuf = Buffer.concat(buffers);
      init.body = bodyBuf.length ? bodyBuf : undefined;
    }

    const resp = await fetch(url, init);

    // Mirror status and content-type back to the browser
    const contentType = resp.headers.get("content-type") || "text/plain";
    res.status(resp.status);
    res.setHeader("content-type", contentType);

    // Pipe body
    const buf = Buffer.from(await resp.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}
