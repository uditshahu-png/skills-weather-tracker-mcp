# Weather database verification

Verified on 2026-11-25 against the app's local `weather.db` using its
parameterized SQLite queries. The SQLite MCP tools were not available in this
session, so this is an app-side database check rather than an MCP-tool check.

| City | Rows | Average temperature |
|---|---:|---:|
| London | 1 | 6.3 °C |
| Pune | 1 | 28.5 °C |
| Tokyo | 1 | 8.3 °C |

Findings:

- The Pune, London, and Tokyo CLI observations are present.
- No rows had null values in the weather fields checked.
- No duplicate `(city, created_at)` groups were found.
- The dashboard page and JSON read endpoints responded successfully.
- A Mumbai refresh was attempted through `POST /api/refresh`, but Open-Meteo
  could not be reached at that time; the request returned a clear 502 response,
  so no UI-created Mumbai observation is present yet. Retry it from the
  dashboard while the API is reachable.
