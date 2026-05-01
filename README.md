# DebtControl

Sistema de control de deudas y gastos mensuales con asistencia de AI, upload de documentos y analytics.

## Stack Tecnológico

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS v4
- **Backend**: Node.js 20 + Express + TypeScript + better-sqlite3
- **AI**: MiniMax-M2.7 (MiniMax Vision API)
- **Deployment**: DigitalOcean VPS, nginx, PM2

## Repositorios

```
debtcontrol-backend/    # API REST
debtcontrol-frontend/   # React app
debtcontrol-docs/       # Documentación
```

## Quick Start

### Backend

```bash
cd debtcontrol-backend
npm install
cp .env.example .env
# Editar .env con ANTHROPIC_API_KEY
npm run dev
```

### Frontend

```bash
cd debtcontrol-frontend
npm install
cp .env.example .env
npm run dev
```

El frontend está disponible en `http://localhost:5173` y el backend en `http://localhost:3001`.

## Scripts Disponibles

### Backend (`debtcontrol-backend/`)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm start` | Producción (requiere build) |
| `npm test` | Tests con Vitest |
| `npm run lint` | TypeScript check |

### Frontend (`debtcontrol-frontend/`)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios |
| `npm run test:e2e` | Tests E2E con Playwright |

## Documentación

- [DEPLOY.md](DEPLOY.md) — Guía de deployment en DigitalOcean
- [CONTRIBUTING.md](CONTRIBUTING.md) — Guía de contribución
- [openapi.yaml](openapi.yaml) — Especificación OpenAPI
- [PLAN.md](PLAN.md) — Arquitectura y decisiones técnicas
- [SKILLS.md](SKILLS.md) — Guía de implementación

## Features

- **Dashboard**: Resumen de deudas, próximo pago, transacciones recientes
- **Gestión de Deudas**: CRUD completo de plantillas e instancias
- **Transacciones**: Registro manual con filtros y búsqueda
- **Analytics**: Gráficos de gasto, distribución por categoría, proyección debt-free
- **AI Assistant**: Chat con contexto financiero, análisis mensual automático
- **Document Upload**: Subir PDFs/imágenes de estados de cuenta
- **AI Analysis**: Extraer transacciones de documentos con MiniMax Vision
- **PWA**: Funciona offline con service worker

## License

ISC