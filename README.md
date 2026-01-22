# saas-approval-system

Backend (MVP) para marketplace B2B con approvals opcionales:
Proveedor publica → Comprador solicita cotización → Proveedor responde → Aceptación → Pedido.

## Features (MVP)
- Gestión de usuarios
- Roles (Admin / User)
- Flujos de aprobación configurables
- Aprobación manual o automática
- API REST

## Tech stack (planned)
- Backend: NestJS
- DB: PostgreSQL
- Auth: JWT
- Docker

## Run (backend only, Docker)
1. Copiá `env.example` a `.env` (manual) y ajustá valores si querés.
2. Levantá todo:

```bash
docker compose up --build
```

3. Healthcheck:

```bash
curl http://localhost:3000/health
```

## Auth (MVP)
- `POST /auth/register` body: `{ "email": "...", "password": "...", "role": "BUYER|PROVIDER" }`
- `POST /auth/login` body: `{ "email": "...", "password": "..." }`
- `GET /auth/me` header: `Authorization: Bearer <token>`

### Feature flag
- `AUTH_ALLOW_PROVIDER_SELECTION=true|false`
  - si es `false`, el registro **bloquea** `PROVIDER` (BUYER siempre permitido)
