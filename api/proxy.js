// api/proxy.js
// Proxies GET/POST to your Google Apps Script (or any HTTPS endpoint)
// Set APPS_SCRIPT_URL in Vercel → Project → Settings → Environment Variables

export default async function handler(req, res) {
  const target = process.env.APPS_SCRIPT_URL;
  if (!target) {
    res.status(500).json({ error: "Missing APPS_SCRIPT_URL env var" });
    return;
  }

  // CORS (usually not needed because same-origin; keep for safety)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const method = req.method || "GET";

    // Handle body for POST (ensure we have JSON)
    let body = null;
    if (method === "POST") {
      if (req.body && Object.keys(req.body).length) {
        body = JSON.stringify(req.body);
      } else {
        // Manually read body if not parsed
        body = await new Promise((resolve) => {
          let data = "";
          req.on("data", (chunk) => (data += chunk));
          req.on("end", () => resolve(data || "{}"));
        });
      }
    }

    // Forward request
    const upstream = await fetch(target, {
      method,
      headers:
        method === "POST"
          ? { "Content-Type": "application/json" }
          : undefined,
      body,
    });

    const text = await upstream.text();

    // Try to return JSON if possible; otherwise return text
    try {
      const json = JSON.parse(text);
      return res.status(upstream.status).json(json);
    } catch {
      res.status(upstream.status).send(text);
    }
  } catch (err) {
    res.status(500).json({ error: "Proxy failed", details: String(err) });
  }
}
