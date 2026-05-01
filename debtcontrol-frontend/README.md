# DebtControl Frontend

Frontend de la aplicación de control de deudas con AI, built with React 18 + Vite + TypeScript + Tailwind CSS v4.

## Requisitos

- **Node.js** 20 LTS o superior
- **npm** 10+ (viene con Node.js 20)
- **Variables de entorno** ver [.env.example](./.env.example)

## Setup Local

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd debtcontrol-frontend

# 2. Instalar dependencias
npm install

# 3. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env si necesitas cambiar VITE_API_URL

# 4. Iniciar en desarrollo
npm run dev
```

El servidor de desarrollo arrancará en `http://localhost:5173` con hot-reload.

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Compilar TypeScript y build de producción |
| `npm run preview` | Preview del build de producción |
| `npm run lint` | Ejecutar ESLint |
| `npm test` | Ejecutar tests con Vitest |
| `npm test -- --coverage` | Tests con coverage report |
| `npm run test:e2e` | Ejecutar tests E2E con Playwright |

## Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `VITE_API_URL` | URL del backend API | `http://localhost:3001` |

## Estructura del Proyecto

```
src/
├── api/              # Cliente Axios y funciones tipadas
├── components/       # Componentes React
│   ├── ui/          # Componentes UI base
│   └── shared/       # Componentes compartidos de negocio
├── hooks/            # Custom React hooks
├── pages/            # Páginas/Routes
├── store/            # Zustand store
├── test/             # Tests unitarios e integración
├── types/            # TypeScript types
└── utils/            # Funciones helper
```

## Testing

El proyecto usa **Vitest** + **React Testing Library** + **Playwright** para tests.

```bash
# Unit tests
npm test

# Tests con coverage
npm test -- --coverage

# E2E tests
npm run test:e2e

# E2E tests con UI
npm run test:e2e:ui
```

## PWA

El proyecto incluye soporte PWA con service worker para offline functionality.

```bash
# Build con PWA
npm run build
```

## Deployment

Ver [DEPLOY.md](../debtcontrol-docs/DEPLOY.md) para instrucciones de deployment.

## API Endpoints (Backend)

El frontend se conecta al backend en `/api`:

- `GET /api/dashboard` — Resumen principal
- `GET /api/debt-templates` — Plantillas de deudas
- `GET /api/debt-instances` — Instancias de deudas
- `GET /api/transactions` — Transacciones
- `GET /api/analytics` — Datos para gráficos
- `POST /api/ai/chat` — Chat con AI
- `POST /api/uploads` — Upload de documentos

Ver [DEPLOY.md](../debtcontrol-docs/DEPLOY.md) para documentación completa de la API.