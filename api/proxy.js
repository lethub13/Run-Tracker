// api/proxy.js
export default async function handler(req, res) {
  const target = process.env.APPS_SCRIPT_URL;
  if (!target) {
    return res.status(500).json({ ok: false, error: "Missing APPS_SCRIPT_URL env var" });
  }

  // Basic CORS (safe even if same-origin)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const method = req.method || "GET";
    const headers = {};
    let body;

    if (method === "POST") {
      // Vercel parses JSON for us when Content-Type: application/json
      if (req.body && Object.keys(req.body).length) {
        body = JSON.stringify(req.body);
        headers["Content-Type"] = "application/json";
      } else {
        // Fallback: manually read stream
        body = await new Promise((resolve) => {
          let data = "";
          req.on("data", (c) => (data += c));
          req.on("end", () => resolve(data || "{}"));
        });
        headers["Content-Type"] = "application/json";
      }
    }

    const upstream = await fetch(target, { method, headers, body });
    const text = await upstream.text();

    // Try JSON
    try {
      const json = JSON.parse(text);
      return res.status(upstream.ok ? 200 : 502).json(json);
    } catch {
      // Non-JSON response from Apps Script
      return res.status(upstream.ok ? 200 : 502).json({
        ok: upstream.ok,
        status: upstream.status,
        note: "Apps Script did not return JSON",
        body: text
      });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Proxy failed", details: String(err) });
  }
}
