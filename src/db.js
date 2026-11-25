import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const databasePath = process.env.WEATHER_DB_PATH ?? resolve(projectRoot, "weather.db");
const schemaPath = resolve(projectRoot, "db/schema.sql");
const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.exec(readFileSync(schemaPath, "utf8"));

// Save one normalized weather observation and return its row ID.
export function saveWeather(weather) {
  const result = database.prepare(`
    INSERT INTO weather_logs (
      city, country, latitude, longitude, temperature_c, humidity,
      wind_kmh, condition, weather_code
    ) VALUES (
      @city, @country, @latitude, @longitude, @temperatureC, @humidity,
      @windKmh, @condition, @weatherCode
    )
  `).run(weather);
  return Number(result.lastInsertRowid);
}

// Return the newest observations, bounded to a safe maximum.
export function listLogs(limit = 10) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 10, 1), 500);
  return database.prepare(`
    SELECT id, city, country, latitude, longitude, temperature_c AS temperatureC,
      humidity, wind_kmh AS windKmh, condition, weather_code AS weatherCode, created_at AS createdAt
    FROM weather_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(boundedLimit);
}

// Return temperature statistics for one city, or null when it has no logs.
export function getCityStats(city) {
  return database.prepare(`
    SELECT city, MIN(temperature_c) AS minTemperature,
      MAX(temperature_c) AS maxTemperature,
      AVG(temperature_c) AS averageTemperature,
      COUNT(*) AS logCount
    FROM weather_logs
    WHERE city = ? COLLATE NOCASE
    GROUP BY city
  `).get(city) ?? null;
}

// Return the latest temperature and aggregate statistics for every city.
export function getCitySummaries() {
  return database.prepare(`
    SELECT grouped.city,
      (
        SELECT latest.temperature_c
        FROM weather_logs AS latest
        WHERE latest.city = grouped.city COLLATE NOCASE
        ORDER BY latest.created_at DESC, latest.id DESC
        LIMIT 1
      ) AS latestTemperature,
      AVG(grouped.temperature_c) AS averageTemperature,
      COUNT(*) AS logCount
    FROM weather_logs AS grouped
    GROUP BY grouped.city COLLATE NOCASE
    ORDER BY grouped.city COLLATE NOCASE
  `).all();
}

// Return per-city counts and averages for the verification report.
export function getAllCityStats() {
  return database.prepare(`
    SELECT city, COUNT(*) AS logCount, AVG(temperature_c) AS averageTemperature
    FROM weather_logs
    GROUP BY city COLLATE NOCASE
    ORDER BY city COLLATE NOCASE
  `).all();
}

// Return database anomalies relevant to the exercise's verification.
export function getDataAnomalies() {
  const nullRows = database.prepare(`
    SELECT COUNT(*) AS count
    FROM weather_logs
    WHERE city IS NULL OR country IS NULL OR latitude IS NULL OR longitude IS NULL
      OR temperature_c IS NULL OR humidity IS NULL OR wind_kmh IS NULL
      OR condition IS NULL OR weather_code IS NULL OR created_at IS NULL
  `).get().count;
  const duplicateTimestamps = database.prepare(`
    SELECT COUNT(*) AS count
    FROM (
      SELECT city, created_at
      FROM weather_logs
      GROUP BY city COLLATE NOCASE, created_at
      HAVING COUNT(*) > 1
    )
  `).get().count;
  return { nullRows, duplicateTimestamps };
}
