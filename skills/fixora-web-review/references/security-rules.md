# Security Rules — Fixora Video

Reglas de seguridad aplicables a toda revisión del proyecto. Fuente de verdad para el skill `fixora-web-review`.

---

## Regla 1 — Autenticación en API Routes

Todo API route que maneje datos de usuario DEBE verificar sesión al inicio.

**Patrón obligatorio:**
```typescript
const session = await auth();
if (!session?.user?.id) return ApiErrors.unauthorized();
```

**Excepciones permitidas (requieren verificación alternativa):**
- `/api/auth/*` — rutas públicas de autenticación (register, forgot-password, reset-password)
- `/api/webhooks/*` — deben usar `isValidWebhookRequest()` o verificación de firma Stripe
- `/api/auth/[...nextauth]` — manejado internamente por NextAuth

**Señal de alerta:**
Cualquier route con lógica de negocio que NO tenga `await auth()` ni verificación de firma.

---

## Regla 2 — Validación de Inputs con Zod

Todo dato que entre al backend DEBE pasar por un schema Zod antes de procesarse.

**Patrón obligatorio:**
```typescript
const parsed = schema.safeParse(body);
if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);
```

**Reglas dentro del schema:**
- Strings: siempre `.trim()` + `.min()` + `.max()`
- Enums: NUNCA `z.string()` para valores de lista — usar `z.enum(ALLOWLIST)`
- Opcionales: `.optional()` — nunca `.nullable()` si no es necesario
- Números: `.int()`, `.positive()`, `.max()` según contexto

**Señal de alerta:**
- `req.json()` usado directamente sin validación posterior
- `z.string()` para campos que deberían ser enum (estilo, tono, tipo, etc.)

---

## Regla 3 — Rate Limiting

Los siguientes endpoints DEBEN tener rate limiting activo:

| Endpoint | Límite recomendado |
|---|---|
| `/api/generate/*` | 5 req/min por usuario |
| `/api/clone/*` | 3 req/min por usuario |
| `/api/ad/*` | 2 req/2min por usuario |
| `/api/videos/*` | 5 req/min por usuario |
| `/api/studio/*` | 3 req/min por usuario |
| `/api/auth/register` | 5 req/min por IP |
| `/api/contact` | 2 req/30min por usuario |
| `/api/upload` | 20 req/min por usuario |

**Patrón obligatorio:**
```typescript
if (!checkRateLimit(`action:${session.user.id}`, RATE_LIMITS.action)) {
  return ApiErrors.tooManyRequests();
}
```

**Señal de alerta:**
Endpoint de generación, clone, o ad sin `checkRateLimit`.

---

## Regla 4 — Allowlist para Valores de Enum

Campos como `style`, `tone`, `type`, `plan`, `status` que vienen del cliente DEBEN validarse contra una lista blanca de valores conocidos.

**NUNCA:**
```typescript
// ❌ Acepta cualquier string — inyección posible
const style = body.style as string;
```

**SIEMPRE:**
```typescript
// ✅ Solo acepta valores conocidos
const ALLOWED_STYLES = ["Cinematic", "Anime", ...] as const;
const schema = z.object({ style: z.enum(ALLOWED_STYLES).optional() });
```

**Constantes compartidas:**
Las allowlists deben vivir en `src/lib/` y ser importadas tanto por el componente UI como por el API route. Nunca duplicar la lista en dos archivos.

---

## Regla 5 — Protección SSRF

Los endpoints que hacen proxy de URLs externas DEBEN validar el dominio antes de ejecutar la petición.

**Dominios permitidos en Fixora:**
- `v3b.fal.media`
- `fal.media`
- `storage.googleapis.com`
- `cdn.fal.ai`

**Función disponible:**
```typescript
import { assertAllowedProxyUrl } from "@/lib/security";
const url = assertAllowedProxyUrl(rawUrl);
if (!("hostname" in url)) return url; // retorna NextResponse de error
```

**Señal de alerta:**
Cualquier `fetch(url)` donde `url` viene del cliente sin validación de dominio.

---

## Regla 6 — Verificación de Webhooks

Los webhooks DEBEN verificar la autenticidad de la petición antes de procesar.

**Fal.ai:**
```typescript
if (!isValidWebhookRequest(req)) return ApiErrors.unauthorized();
```

**Stripe:**
```typescript
stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
```

**Señal de alerta:**
Webhook que procesa datos sin verificar la firma primero.

---

## Regla 7 — Secrets y Variables de Entorno

**NUNCA en código:**
- API keys de terceros
- Secrets de webhooks
- Claves de base de datos
- Passwords de cualquier tipo

**SIEMPRE:**
- Variables de entorno del servidor (sin prefijo `NEXT_PUBLIC_`)
- Solo `NEXT_PUBLIC_` para lo que el cliente NECESITA conocer (Stripe publishable key, reCAPTCHA site key)

**Verificar:**
- `.env` en `.gitignore` ✅
- `.env.local` en `.gitignore` ✅
- Ningún secret en el repositorio de GitHub

---

## Regla 8 — TypeScript Estricto

- Sin `any` sin comentario de justificación
- Sin `as unknown as X` para bypass de tipos
- Sin `!` (non-null assertion) sin verificación previa
- `noEmit` limpio antes de cada commit

---

## Señales de Alerta Rápida (Red Flags)

```
🔴 CRÍTICO:
- API route sin auth() ni verificación de firma
- Secret hardcodeado en código
- fetch() a URL del cliente sin validación de dominio

🟡 IMPORTANTE:
- Endpoint de generación sin rate limiting  
- z.string() donde debería ser z.enum()
- console.log() en producción
- Texto visible hardcodeado (sin i18n)

🟢 MEJORA:
- any en TypeScript
- Lógica duplicada entre archivos
- Función haciendo más de una tarea
```
