import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  getCitySummaries,
  listLogs,
  saveWeather,
} from "./db.js";
import { fetchCurrentWeather, WeatherError } from "./weather.js";

const port = Number(process.env.PORT) || 3000;
const pagePath = resolve(fileURLToPath(new URL("../public/index.html", import.meta.url)));

// Send a JSON response with consistent headers.
function sendJson(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

// Convert a request handler error into a useful HTTP response.
function sendError(response, error) {
  if (error instanceof WeatherError) {
    const status = error.code === "CITY_NOT_FOUND" || error.code === "INVALID_CITY" ? 400 : 502;
    sendJson(response, status, { error: error.message });
    return;
  }
  console.error(error);
  sendJson(response, 500, { error: "The server could not complete the request." });
}

// Route dashboard and JSON API requests.
async function handleRequest(request, response) {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (request.method === "GET" && requestUrl.pathname === "/") {
    try {
      const page = await readFile(pagePath);
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(page);
    } catch (error) {
      sendError(response, error);
    }
    return;
  }
  if (request.method === "GET" && requestUrl.pathname === "/api/logs") {
    sendJson(response, 200, { logs: listLogs(50) });
    return;
  }
  if (request.method === "GET" && requestUrl.pathname === "/api/summary") {
    sendJson(response, 200, { summaries: getCitySummaries() });
    return;
  }
  if (request.method === "POST" && requestUrl.pathname === "/api/refresh") {
    const city = requestUrl.searchParams.get("city")?.trim();
    if (!city) {
      sendJson(response, 400, { error: "Provide a city in the city query parameter." });
      return;
    }
    try {
      const weather = await fetchCurrentWeather(city);
      const id = saveWeather(weather);
      sendJson(response, 201, { id, weather });
    } catch (error) {
      sendError(response, error);
    }
    return;
  }
  sendJson(response, 404, { error: "Not found." });
}

// Start the HTTP server and report its local URL.
createServer((request, response) => {
  handleRequest(request, response).catch((error) => sendError(response, error));
}).listen(port, "0.0.0.0", () => {
  console.log(`Weather dashboard listening at http://localhost:${port}`);
});
