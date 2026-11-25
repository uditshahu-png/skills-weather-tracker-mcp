# Open-Meteo API notes

Both endpoints are public and require no API key. The app requests JSON.

## Geocoding

Request: `GET https://geocoding-api.open-meteo.com/v1/search?name=Pune&count=1`

The app reads the first entry in `results`: `name`, `country`, `latitude`, and
`longitude`. A successful live response for Pune returned:

```json
{
  "results": [
    {
      "name": "Pune",
      "latitude": 18.51957,
      "longitude": 73.85535,
      "country": "India"
    }
  ]
}
```

No results means the city is unknown (or not found by the geocoder).

## Current weather

Request:
`GET https://api.open-meteo.com/v1/forecast?latitude=18.51957&longitude=73.85535&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`

The app reads `current.temperature_2m`, `current.relative_humidity_2m`,
`current.wind_speed_10m`, and `current.weather_code`. Open-Meteo reports wind
speed in km/h for this request. A live response contained:

```json
{
  "current": {
    "time": "2026-11-25T13:00",
    "temperature_2m": 28.5,
    "relative_humidity_2m": 39,
    "wind_speed_10m": 9.2,
    "weather_code": 0
  }
}
```

Weather codes follow the WMO interpretation table; the app maps them to short
readable conditions before saving each observation.
