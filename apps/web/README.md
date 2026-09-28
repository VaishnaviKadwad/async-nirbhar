# NIRBHAR Web

Next.js 16 App Router frontend for the NIRBHAR campus safety decision-support workflow.

## Runtime

- Node.js `>=20.9.0` (validated with Node `24.21.0`)
- Development server: port `3000`
- Backend base URL: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`)
- `NEXT_PUBLIC_USE_MOCKS=true` enables the local mock API; set it to `false` for the backend.
- `NEXT_PUBLIC_DEMO_MODE=true` enables the demo simulation control. Seeded room incidents are served by mock mode.

Run commands from `apps/web`:

```bash
npm install
npm run dev -- --port 3000
npm run lint
npm run build
npm run start -- --port 3000
```

The production start command requires `npm run build` first. Configure environment variables at build/runtime as appropriate for the deployment; `NEXT_PUBLIC_*` values are included in the browser bundle.

## Routes

- `/` — three-room Command Center
- `/evidence` — evidence intake
- `/incidents/[id]` — incident review and officer decision
- `/audit` — chronological audit log

## Integration Notes

- Incident, evidence, audit, and ticket responses are normalized at the API boundary to the UI types.
- The evidence attachment control previews files locally; the current evidence request sends report fields only.
- The current Member B2 backend branch does not yet expose `POST /evidence`. Real-mode evidence submission will show the backend error until that endpoint is merged.
- Device heartbeat and historical incident endpoints are not part of the current API contract. The dashboard labels rooms as tracked, and its clearly labeled heatmap uses synthetic sample data only.

## Next.js References

- [Next.js Documentation](https://nextjs.org/docs)
- [Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying)
