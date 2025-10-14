// Robust Apps Script proxy for Vercel (Node/Serverless or Edge-compatible)
export const config = {
  api: {
    bodyParser: false, // don't consume the stream; we forward it ourselves
  },
};

export default async function handler(req, res) {
  try {
    const target = process.env.APPS_SCRIPT_URL;
    if (!target) {
      res.status(500).json({ ok: false, error: "Missing APPS_SCRIPT_URL" });
      return;
    }

    // Preserve query string
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const url = target + qs;

    // Build init with method + headers
    const init = { method: req.method, headers: {} };

    // Forward content-type if present; default to JSON for non-GET when we send a body
    const incomingCT = req.headers["content-type"];
    if (incomingCT) init.headers["content-type"] = incomingCT;

    // ---- Body handling (covers both parsed and raw cases) ----
    if (req.method !== "GET" && req.method !== "HEAD") {
      let bodyBuffer = null;

      // If framework already parsed req.body:
      if (typeof req.body === "string") {
        bodyBuffer = Buffer.from(req.body);
      } else if (req.body && typeof req.body === "object") {
        // e.g. Next/Vercel parsed JSON to object
        bodyBuffer = Buffer.from(JSON.stringify(req.body));
        init.headers["content-type"] = "application/json";
      } else {
        // Fall back to reading the raw stream
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        if (chunks.length) bodyBuffer = Buffer.concat(chunks);
      }

      if (bodyBuffer && bodyBuffer.length) init.body = bodyBuffer;
      // Ensure CT for JSON if we’re sending a body and none was set
      if (!init.headers["content-type"] && bodyBuffer) {
        init.headers["content-type"] = "application/json";
      }
    }

    // Forward to Apps Script
    const resp = await fetch(url, init);

    // Mirror status & content-type
    const ct = resp.headers.get("content-type") || "text/plain";
    res.status(resp.status);
    res.setHeader("content-type", ct);

    // Pipe body
    const buf = Buffer.from(await resp.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}
