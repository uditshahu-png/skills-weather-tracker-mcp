const geocodingUrl = "https://geocoding-api.open-meteo.com/v1/search";
const forecastUrl = "https://api.open-meteo.com/v1/forecast";

export class WeatherError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "WeatherError";
    this.code = code;
  }
}

// Fetch JSON from Open-Meteo and convert network or HTTP failures to friendly errors.
async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch {
    throw new WeatherError("Could not reach Open-Meteo. Check your network and try again.", "NETWORK");
  }
  if (!response.ok) {
    throw new WeatherError(`Open-Meteo returned HTTP ${response.status}. Please try again.`, "API");
  }
  try {
    return await response.json();
  } catch {
    throw new WeatherError("Open-Meteo returned an invalid response. Please try again.", "API");
  }
}

// Translate a WMO weather code into a concise display condition.
export function describeWeatherCode(code) {
  if (code === 0) return "clear";
  if (code === 1) return "mostly clear";
  if (code === 2) return "partly cloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorm";
  return "unknown";
}

// Geocode a city and return its current weather in the database's field format.
export async function fetchCurrentWeather(city) {
  const requestedCity = city.trim();
  if (!requestedCity) {
    throw new WeatherError("Enter a city name.", "INVALID_CITY");
  }

  const geocoding = new URL(geocodingUrl);
  geocoding.searchParams.set("name", requestedCity);
  geocoding.searchParams.set("count", "1");
  const locationResponse = await fetchJson(geocoding);
  const location = locationResponse?.results?.[0];
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    throw new WeatherError(`Couldn't find "${requestedCity}". Check the spelling and try another city.`, "CITY_NOT_FOUND");
  }

  const forecast = new URL(forecastUrl);
  forecast.searchParams.set("latitude", String(location.latitude));
  forecast.searchParams.set("longitude", String(location.longitude));
  forecast.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code");
  const weatherResponse = await fetchJson(forecast);
  const current = weatherResponse?.current;
  const values = [
    current?.temperature_2m,
    current?.relative_humidity_2m,
    current?.wind_speed_10m,
    current?.weather_code,
  ];
  if (!values.every(Number.isFinite)) {
    throw new WeatherError("Open-Meteo did not return all required current-weather fields.", "API");
  }

  return {
    city: location.name,
    country: location.country ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    temperatureC: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windKmh: current.wind_speed_10m,
    condition: describeWeatherCode(current.weather_code),
    weatherCode: current.weather_code,
  };
}
