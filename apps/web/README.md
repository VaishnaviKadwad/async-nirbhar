# NIRBHAR Web

Next.js 16 App Router frontend for the NIRBHAR campus safety decision-support workflow.

## Runtime

- Node.js `>=20.9.0` (validated with Node `24.21.0`)
- Development server: port `3000`
- Backend API: `http://127.0.0.1:8000`; the browser sends requests through the Next.js `/api/backend` rewrite so this also works when the frontend is opened through a forwarded Codespaces port.
- Set `NEXT_PUBLIC_USE_MOCKS=false`, `NEXT_PUBLIC_API_URL=/api/backend`, and `API_SERVER_URL=http://127.0.0.1:8000` to use the local backend.
- `NEXT_PUBLIC_USE_MOCKS=true` enables the local mock API. `NEXT_PUBLIC_DEMO_MODE=true` enables the demo simulation control; leave it disabled when using the real backend.

Run commands from `apps/web`:

```bash
npm install
npm run dev -- --port 3000
npm run lint
npm run build
npm run start -- --port 3000
```

Start the API separately from the repository root with `uvicorn apps.api.main:app`; start the web app on port `3000`. The frontend loads incident IDs from `GET /incidents` and fetches each slow explanation separately.

The production start command requires `npm run build` first. Configure environment variables at build/runtime as appropriate for the deployment; `NEXT_PUBLIC_*` values are included in the browser bundle.

For Vercel, set the project root directory to `apps/web`, set
`NEXT_PUBLIC_USE_MOCKS=false`, `NEXT_PUBLIC_DEMO_MODE=false`, and
`NEXT_PUBLIC_API_URL=/api/backend`, and set `API_SERVER_URL` to the deployed
Render API URL for every Vercel environment. The Next.js rewrite proxies browser
API requests to that URL, and server-side requests use it directly.

Deploy the API from the repository root using `render.yaml`. The Blueprint
requires a Render Standard web service and a persistent disk for SQLite evidence,
audit data, and the downloaded CPU sentence-transformer model. It runs one
worker; do not scale this SQLite-backed service horizontally. Configure the
Blueprint's `CORS_ORIGINS` prompt with the exact production Vercel origin, for
example `https://your-project.vercel.app` (no trailing slash). Keep
`LLM_ENABLED=false` unless a separately hosted, reachable Ollama service has
been configured. Make backups of the persistent disk before deployments or
maintenance.

## Routes

- `/` — three-room Command Center
- `/evidence` — evidence intake
- `/incidents/[id]` — incident review and officer decision
- `/audit` — chronological audit log

## Integration Notes

- Incident, evidence, and audit responses are normalized at the API boundary to the UI types.
- Evidence submissions, decisions, and audits are stored on the Render persistent disk. Decisions are recorded for officer review; no external dispatch or ticketing action is initiated.
- The evidence attachment control previews files locally; the current evidence request sends report fields only.
- Device heartbeat is not part of the current API contract. The dashboard's room list is configured, but room status, evidence, and the seven-day heatmap are derived from real API data.
- The heatmap excludes evidence marked synthetic and is descriptive, not predictive. Configure a real sensor ingestion source before relying on live sensor signals.

## Next.js References

- [Next.js Documentation](https://nextjs.org/docs)
- [Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying)
