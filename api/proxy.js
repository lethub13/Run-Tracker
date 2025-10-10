export default async function handler(req, res) {
  const target = process.env.APPS_SCRIPT_URL;
  if (!target) return res.status(500).json({ ok:false, error:"Missing APPS_SCRIPT_URL" });

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const method = req.method || "GET";
    const headers = {};
    let body;

    if (method === "POST") {
      if (req.body && Object.keys(req.body).length) body = JSON.stringify(req.body);
      else {
        body = await new Promise(r => {
          let d=""; req.on("data", c => d+=c); req.on("end", ()=>r(d||"{}"));
        });
      }
      headers["Content-Type"] = "application/json";
    }

    const up = await fetch(target, { method, headers, body, cache:"no-store" });
    const text = await up.text();
    try { return res.status(up.ok?200:502).json(JSON.parse(text)); }
    catch { return res.status(up.ok?200:502).json({ ok:up.ok, status:up.status, body:text }); }
  } catch (e) {
    return res.status(500).json({ ok:false, error:"Proxy failed", details:String(e) });
  }
}
