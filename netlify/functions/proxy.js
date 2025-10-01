// netlify/functions/proxy.js
export async function handler(event) {
  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  const targetUrl = "https://script.google.com/macros/s/AKfycbywUzvKGJQ8ITV5j4ColKxNuuN2EEg_QwjE1-bFbeHfMrKRgnST-37HBx9PwPAtu2W0_Q/exec";

  const init = {
    method: event.httpMethod,
    headers: { "Content-Type": "application/json" },
  };
  if (["POST", "PUT", "PATCH"].includes(event.httpMethod)) {
    init.body = event.body;
  }

  const resp = await fetch(targetUrl, init);
  const text = await resp.text();

  return {
    statusCode: resp.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    },
    body: text,
  };
}

