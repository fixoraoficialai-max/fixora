# CLAUDE.md — Fixora Video

> Instrucciones permanentes para el asistente de IA.
> Leer completo antes de tocar cualquier archivo.

---

## ¿Qué es Fixora Video?

Plataforma SaaS de generación de video con IA. Los usuarios crean videos, imágenes, avatares y contenido publicitario usando créditos prepagados. Monetización por suscripción (Stripe) y créditos adicionales.

**Empresa:** fixoraoficialai-max  
**Dominio:** fixora

video.com  
**Repositorio:** github.com/fixoraoficialai-max/fixora

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript estricto |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | NextAuth v5 (credentials + Google OAuth) |
| Generación de video/imagen | Fal.ai (FLUX, Kling AI) |
| IA de texto | Anthropic Claude (claude-3-5-haiku para prompts) |
| Pagos | Stripe (suscripciones + créditos) |
| Email | Resend |
| Errores | Sentry |
| Analytics | Vercel Analytics |
| Estado cliente | Zustand + TanStack Query |
| i18n | next-intl (cookie-based, sin cambio de URL) |
| Estilos | Tailwind CSS + variables CSS personalizadas |
| Animaciones | Framer Motion |
| Rate limiting | @upstash/ratelimit + @upstash/redis |
| Validación | Zod (en cliente Y en servidor) |

---

## La Regla de Oro (OBLIGATORIO siempre)

```
✅ Código limpio — nombrar variables con intención clara
✅ Código seguro — nunca confiar en datos del cliente
✅ codigo escalable y matenible 
✅ codigo solido que pueda soportar de 10 usuarios a millones de usuarios sin romperse ni caerse ni generar errores ni lentitud ni latencia ni saturacion ni cuellos de botellas ni nada por el estilo 
✅ codigo ordenado y limpio 
✅ codigo limpio y legible

✅ optimizar el codigo para que sea mas rapido y eficiente 
✅ Sin código fake — no simular funcionalidad
✅ Sin código duplicado — DRY estricto
✅ Cada función hace UNA sola tarea
✅ Eliminar código huérfano y duplicado al encontrarlo
✅ Validar TODO con Zod antes de llegar al backend
✅ No dejar pasar basura al backend
✅ TypeScript sin errores — `npx tsc --noEmit` antes de commit
✅ Commit solo si 0 errores de TypeScript
```

---

## Comandos Esenciales

```bash
# Desarrollo
npm run dev              # Servidor en localhost:3000
npm run type-check       # Verificar TypeScript sin compilar
npm run lint             # ESLint

# Base de datos
npm run db:studio        # Prisma Studio (GUI de la BD)
npm run db:generate      # Regenerar cliente Prisma
npm run db:migrate       # Crear migración nueva
npm run db:migrate:deploy # Aplicar migraciones en producción
npm run db:push          # Push sin migración (dev only)
npm run db:reset         # Resetear BD (¡destructivo!)

# Deploy
git push origin main     # Vercel despliega automáticamente
```

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Forgot/Reset Password
│   ├── (dashboard)/     # App principal (autenticada)
│   │   ├── create/      # Generadores: prompt, image, video, clone, multi-clone, ad
│   │   ├── dashboard/   # Página de inicio
│   │   ├── history/     # Historial de generaciones
│   │   ├── projects/    # Proyectos con escenas
│   │   ├── settings/    # Perfil, seguridad, créditos, idioma
│   │   └── studio/      # Editor de series de video
│   ├── (marketing)/     # Landing page pública
│   ├── admin/           # Panel de administración
│   └── api/             # API Routes (servidor)
│       ├── auth/        # Register, login-check, forgot/reset password
│       ├── generate/    # prompt, image (via Fal.ai)
│       ├── videos/      # Generación de video
│       ├── clone/       # Avatar AI
│       ├── ad/          # Ad Creator
│       ├── studio/      # Serie/escenas
│       ├── user/        # Perfil, contraseña
│       ├── webhooks/    # Fal.ai (resultados) + Stripe (pagos)
│       └── upload/      # Subida de imágenes
├── components/
│   ├── layout/          # TopBar, Sidebar
│   ├── shared/          # CollapsibleSection, LanguageSelector, EmptyState
│   └── ui/              # button, card, input, badge (design system)
├── features/
│   ├── auth/            # LoginForm, RegisterForm, ForgotPassword, ResetPassword
│   ├── settings/        # ProfileEditForm, ChangePasswordForm, UpgradePlanButton
│   └── video/           # VideoWizard y componentes del wizard
├── i18n/
│   ├── config.ts        # Locales soportados: ["es", "en"] — default: "es"
│   ├── request.ts       # Resolver: cookie NEXT_LOCALE → "es"
│   └── actions.ts       # Server Action para cambiar idioma
├── lib/
│   ├── ai/              # Cliente Anthropic + tools/skills
│   ├── api/             # Helpers de respuesta (apiSuccess, ApiErrors)
│   ├── audit/           # Registro de acciones críticas
│   ├── auth/            # Configuración NextAuth
│   ├── credits/         # Lógica de créditos
│   ├── db/              # Cliente Prisma singleton
│   ├── email/           # Templates de email (Resend)
│   ├── fal/             # Cliente Fal.ai + tipos
│   ├── redis/           # Cliente Upstash Redis
│   ├── security/        # Rate limiting, SSRF guard, webhook auth, IP limiter
│   ├── stripe/          # Planes, cliente Stripe
│   ├── validations/     # Schemas Zod: auth, user, video
│   └── prompt-constants.ts  # Estilos y tonos para optimizador de prompts
├── messages/
│   ├── es.json          # Traducciones en español (idioma por defecto)
│   └── en.json          # Traducciones en inglés
├── stores/              # Zustand stores (estado global cliente)
└── types/               # Tipos TypeScript compartidos
```

---

## Modelos de Base de Datos

```
User            → usuario, rol (USER/ADMIN), contraseña opcional (OAuth)
Account         → proveedor OAuth (Google)
Session         → sesiones NextAuth
VerificationToken → tokens email/reset
Project         → proyecto de video (tiene Scenes y Videos)
Scene           → escena dentro de un proyecto
Video           → video generado (resultado de Fal.ai)
UserCredits     → saldo y créditos lifetime por usuario
Subscription    → plan Stripe del usuario (FREE/STARTER/PRO/STUDIO)
StripeEvent     → idempotencia de webhooks Stripe
GeneratedImage  → imágenes generadas
LoginAttempt    → intentos de login para lockout
AuditLog        → registro de acciones críticas
```

---

## Reglas de Internacionalización (i18n)

```
⛔ NUNCA hardcodear texto visible en componentes
✅ SIEMPRE usar t('key') de next-intl
✅ Añadir clave en AMBOS archivos: messages/es.json y messages/en.json
✅ Idioma por defecto: español ("es")
✅ Detección: cookie NEXT_LOCALE → español (sin detección de browser)
✅ Selector de idioma: Settings > Perfil > Idioma
```

**Namespaces de traducción:**
- `sidebar` — navegación y sidebar
- `dashboard` — página de inicio
- `projects` — lista y detalle de proyectos
- `auth` — login, registro, forgot/reset password
- `settings` — perfil, seguridad, créditos, idioma
- `video` — wizard de video

---

## Reglas de Seguridad

```
✅ Zod en TODOS los API routes — validar input antes de procesar
✅ Autenticación verificada al inicio de cada handler con auth()
✅ Rate limiting aplicado en endpoints de generación y auth
✅ Valores de estilo/tono: SIEMPRE usar allowlist (enum en Zod)
✅ SSRF guard activo en /api/download (solo dominios de Fal.ai)
✅ Webhooks verificados por firma (Fal.ai y Stripe)
✅ CSP headers configurados en next.config.ts
✅ .env en .gitignore — NUNCA commitear secrets
⛔ NUNCA exponer ANTHROPIC_API_KEY, STRIPE_SECRET_KEY al cliente
⛔ NUNCA aceptar valores de estilo/tono como texto libre del cliente
```

---

## Integración con Claude (Anthropic)

**Modelo actual:** `claude-3-5-haiku-20241022` (prompts rápidos y económicos)  
**Cliente:** singleton en `src/lib/ai/client.ts`  
**Uso actual:** optimización de prompts para generación de video/imagen  
**Rate limit:** 5 optimizaciones/minuto por usuario  

**Ubicación de skills/tools:**
```
src/lib/ai/
├── client.ts      # Singleton Anthropic
├── tools/         # Definiciones de skills (Tool Use)
└── prompts/       # System prompts por feature
```

---

## Patrones Establecidos

### API Route — estructura estándar
```
1. Verificar sesión (auth())
2. Verificar rate limit
3. Parsear y validar body con Zod
4. Ejecutar lógica de negocio
5. Retornar apiSuccess() o ApiErrors.*()
```

### Respuestas de API
```typescript
// Éxito
return apiSuccess({ data })

// Errores — usar ApiErrors helpers
return ApiErrors.unauthorized()
return ApiErrors.validation(errors)
return ApiErrors.tooManyRequests()
return ApiErrors.notFound()
```

### Componentes de formulario
```
- Client components: useTranslations("namespace")
- Server components: getTranslations("namespace") — await
- Validación: react-hook-form + zodResolver
- UI: FormField + Input del design system
```

---

## Qué NO Hacer

```
⛔ No crear API routes sin autenticación (excepto webhooks con firma)
⛔ No saltarse la validación Zod
⛔ No hardcodear texto visible — siempre i18n
⛔ No duplicar constantes entre archivos (usar barrel exports)
⛔ No hacer fetch a Fal.ai o Anthropic directamente desde el cliente
⛔ No tocar next.config.ts sin revisar el CSP completo
⛔ No modificar el schema de Prisma sin crear migración
⛔ No usar `any` en TypeScript
⛔ No dejar console.log en producción
⛔ No commitear con errores de TypeScript
```

---

## Variables de Entorno Necesarias

```bash
# Base de datos
DATABASE_URL=

# Autenticación (NextAuth v5 — variables renombradas de v4)
AUTH_SECRET=
AUTH_URL=
ADMIN_PIN=   # PIN del panel admin (15-30 chars) — solo en Vercel, nunca en .env

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Generación de video/imagen
FAL_KEY=
FAL_WEBHOOK_SECRET=

# IA de texto
ANTHROPIC_API_KEY=

# Pagos
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email
RESEND_API_KEY=

# Anti-bot
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# Rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Monitoreo
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## Flujo de Deploy

```
git push origin main → Vercel build automático → fixoravideo.com
```

Vercel configura las env vars en el dashboard (no en archivos).  
`.env` y `.env.local` son solo para desarrollo local.

---

*Última actualización: Mayo 2026*
