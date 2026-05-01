# DebtControl Backend

API REST para el control de deudas personales con asistencia de AI.

## Requisitos

- **Node.js** 20 LTS o superior
- **npm** 10+ (viene con Node.js 20)
- **Variables de entorno** ver [.env.example](./.env.example)

## Setup Local

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd debtcontrol-backend

# 2. Instalar dependencias
npm install

# 3. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env y configurar ANTHROPIC_API_KEY

# 4. Iniciar en desarrollo
npm run dev
```

El servidor arrancará en `http://localhost:3001` con hot-reload.

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor en modo desarrollo (con ts-node-dev) |
| `npm run build` | Compilar TypeScript a JavaScript en `dist/` |
| `npm start` | Iniciar servidor en producción (requiere build previo) |
| `npm test` | Ejecutar tests con Vitest |

## Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `ANTHROPIC_API_KEY` | Token de API de MiniMax (Coding Plan) | Sí |
| `ANTHROPIC_BASE_URL` | URL base del API de MiniMax | Sí (default: `https://api.minimax.io/anthropic`) |
| `PORT` | Puerto del servidor | No (default: `3001`) |
| `DB_PATH` | Ruta a la base de datos SQLite | No (default: `./data/debtcontrol.db`) |
| `CORS_ORIGIN` | Dominio del frontend para CORS | Sí |

## API Endpoints

### Health
- `GET /api/health` — Estado del servidor

### Dashboard
- `GET /api/dashboard` — Resumen con métricas principales

### Deudas (Templates)
- `GET /api/debt-templates` — Listar plantillas de deudas
- `POST /api/debt-templates` — Crear plantilla
- `GET /api/debt-templates/:id` — Ver plantilla
- `PUT /api/debt-templates/:id` — Actualizar plantilla
- `DELETE /api/debt-templates/:id` — Eliminar (soft delete)
- `POST /api/debt-templates/generate` — Generar instancias del periodo actual

### Instancias de Deuda
- `GET /api/debt-instances` — Listar instancias (filtros: period, status, include_completed)
- `PATCH /api/debt-instances/:id` — Actualizar instancia
- `POST /api/debt-instances/:id/pay` — Registrar pago
- `DELETE /api/debt-instances/:id` — Eliminar instancia

### Transacciones
- `GET /api/transactions` — Listar transacciones (filtros: bank_id, month, search, limit, offset)
- `POST /api/transactions` — Crear transacción
- `GET /api/transactions/:id` — Ver transacción
- `DELETE /api/transactions/:id` — Eliminar transacción

### Cuentas Bancarias
- `GET /api/bank-accounts` — Listar cuentas
- `POST /api/bank-accounts` — Crear cuenta
- `PUT /api/bank-accounts/:id` — Actualizar cuenta
- `DELETE /api/bank-accounts/:id` — Eliminar cuenta

### Categorías
- `GET /api/categories` — Listar categorías
- `POST /api/categories` — Crear categoría
- `PUT /api/categories/:id` — Actualizar categoría
- `DELETE /api/categories/:id` — Eliminar categoría

### Uploads (Documentos)
- `POST /api/uploads` — Subir documento (multipart)
- `GET /api/uploads` — Listar uploads
- `GET /api/uploads/:id` — Ver detalle de upload
- `DELETE /api/uploads/:id` — Eliminar upload
- `POST /api/uploads/:id/analyze` — Trigger análisis con AI
- `GET /api/uploads/:id/transactions` — Transacciones extraídas del documento

### Upload Transactions
- `GET /api/upload-transactions?upload_id=` — Listar transacciones de upload
- `PATCH /api/upload-transactions/:id` — Actualizar (asignar a deuda o confirmar/rechazar)
- `POST /api/upload-transactions/:id/assign` — Confirmar match con deuda
- `POST /api/upload-transactions/bulk-assign` — Confirmar varias a la vez

### Analytics
- `GET /api/analytics` — Datos para gráficos (gasto mensual, distribución por categoría, proyección)

### AI
- `POST /api/ai/chat` — Chat assistant con contexto financiero
- `POST /api/ai/analyze` — Generar informe mensual narrativo
- `POST /api/ai/match` — Sugerir match entre transacción y deuda

### Settings
- `GET /api/settings` — Obtener todas las configuraciones
- `PUT /api/settings` — Actualizar configuración

## Testing

El proyecto usa **Vitest** + **Supertest** para tests.

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm test -- --watch

# Coverage
npm test -- --coverage
```

## Estructura del Proyecto

```
src/
├── index.ts              # Entry point
├── types.ts              # TypeScript interfaces
├── schemas.ts            # Zod validation schemas
├── db/
│   ├── index.ts          # Conexión SQLite
│   ├── init.ts           # Schema initialization
│   └── seed.ts           # Datos iniciales
├── routes/               # Express routers
├── services/             # Lógica de negocio
├── middleware/           # Express middleware
└── cron/                 # Tareas programadas
```

## Deployment

Ver [DEPLOY.md](../debtcontrol-docs/DEPLOY.md) para instrucciones de deployment en DigitalOcean VPS.