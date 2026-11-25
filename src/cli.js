import {
  getCityStats,
  listLogs,
  saveWeather,
} from "./db.js";
import { fetchCurrentWeather } from "./weather.js";

// Print the supported commands and their basic usage.
function showHelp() {
  console.log(`Weather Tracker

Usage:
  node src/cli.js add "<city>"
  node src/cli.js list [--limit N]
  node src/cli.js stats "<city>"`);
}

// Format a numeric value for compact CLI output.
function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

// Print log records as a readable fixed-width table.
function printLogs(logs) {
  if (logs.length === 0) {
    console.log("No weather logs yet. Add one with: npm run add -- \"London\"");
    return;
  }
  const columns = [
    ["City", (row) => row.city],
    ["Country", (row) => row.country ?? "—"],
    ["Temp °C", (row) => formatNumber(row.temperatureC)],
    ["Humidity", (row) => `${row.humidity}%`],
    ["Wind km/h", (row) => formatNumber(row.windKmh)],
    ["Condition", (row) => row.condition],
    ["Created", (row) => row.createdAt],
  ];
  const widths = columns.map(([title, value]) =>
    Math.max(title.length, ...logs.map((row) => String(value(row)).length)));
  const line = columns.map(([title], index) => title.padEnd(widths[index])).join(" | ");
  console.log(line);
  console.log(widths.map((width) => "-".repeat(width)).join("-+-"));
  for (const row of logs) {
    console.log(columns.map(([, value], index) => String(value(row)).padEnd(widths[index])).join(" | "));
  }
}

// Execute a CLI command and print user-facing errors without a stack trace.
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help") {
    showHelp();
    return;
  }
  if (command === "add") {
    const city = args.join(" ").trim();
    if (!city) throw new Error('Provide a city name, for example: node src/cli.js add "London"');
    const weather = await fetchCurrentWeather(city);
    const id = saveWeather(weather);
    console.log(`Saved ${weather.city}, ${weather.country}: ${weather.temperatureC.toFixed(1)} °C, ${weather.condition} (log #${id}).`);
    return;
  }
  if (command === "list") {
    const limitIndex = args.indexOf("--limit");
    const limit = limitIndex < 0 ? 10 : Number(args[limitIndex + 1]);
    if (!Number.isInteger(limit) || limit < 1) throw new Error("The --limit value must be a positive whole number.");
    printLogs(listLogs(limit));
    return;
  }
  if (command === "stats") {
    const city = args.join(" ").trim();
    if (!city) throw new Error('Provide a city name, for example: node src/cli.js stats "London"');
    const stats = getCityStats(city);
    if (!stats) {
      console.log(`No weather logs found for "${city}".`);
      return;
    }
    console.log(`${stats.city}: ${stats.logCount} log(s), min ${formatNumber(stats.minTemperature)} °C, max ${formatNumber(stats.maxTemperature)} °C, average ${formatNumber(stats.averageTemperature)} °C.`);
    return;
  }
  throw new Error(`Unknown command "${command}". Run "node src/cli.js help" for usage.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
  process.exitCode = 1;
});
