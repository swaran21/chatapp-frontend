# ChatApp frontend

This is the React/Vite client for the ChatApp backend. The frontend lives in its own repository and communicates with the Spring Boot service over authenticated HTTP and STOMP-over-SockJS.

## Local development

Requirements:

- Node.js 20 LTS or newer
- The backend running on `http://localhost:8080`
- A local `.env` file copied from `.env.example`

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Set `VITE_API_URL` to the backend origin when the backend runs elsewhere. Do not commit `.env`; it is intentionally ignored.

## Backend contract

The Axios client sends cookies with every request and mirrors the backend CSRF cookie (`XSRF-TOKEN`) into the `X-CSRF-TOKEN` header for state-changing requests. The browser must therefore be allowed to accept cookies from the configured backend origin.

Authentication endpoints used by the client:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/session`
- `POST /api/auth/logout`

Chat endpoints used by the client:

- `GET /api/chats`
- `POST /api/chat/create`
- `GET /api/chat/{chatId}?limit=50`
- `DELETE /api/chat/delete?chatId={chatId}`
- `POST /api/files/upload`

The backend caps history requests at 50 messages. The client uses that bound to keep initial rendering predictable.

## Realtime events

The client connects to `${VITE_API_URL}/ws-chat` and subscribes to:

- `/topic/chat/{chatId}` for message, edit, delete, and reaction broadcasts
- `/topic/chat/{chatId}/receipts` for read receipts
- `/topic/chat/{chatId}/typing` for transient typing indicators

It publishes to `/app/chat/{chatId}/{action}` where `action` is `send`, `edit`, `delete`, `react`, `read`, or `typing`. The server derives the authenticated sender from the session; client-supplied sender fields are not trusted.

## Production deployment

For Render or another static host:

1. Build command: `npm ci && npm run build`
2. Publish directory: `dist`
3. Set `VITE_API_URL` to the deployed backend HTTPS origin before the build.
4. Configure SPA fallback/rewrite of `/*` to `/index.html`.
5. Deploy the backend separately and configure its allowed frontend origin to the exact frontend HTTPS origin.

The backend and frontend must use HTTPS in production. This is required for secure cookies and for SockJS/WebSocket browser security rules.

## Quality checks

```powershell
npm run lint
npm run build
```

The frontend currently uses lint/build checks as its automated quality gate. Backend contract and security behavior are covered by the Spring Boot test suite in the backend repository.
