# Skill: fixora-web-review

## Propósito

Revisión sistemática de la plataforma Fixora Video para garantizar que el código cumple con la Regla de Oro, las reglas de seguridad y los estándares de calidad definidos en `CLAUDE.md`.

---

## Cuándo activar este skill

- Antes de cada deploy a producción
- Al finalizar una feature nueva
- Al incorporar código de terceros
- Cuando el usuario pida "revisar el proyecto" o "auditoría"

---

## Checklist de revisión

### 1. Regla de Oro
- [ ] Código limpio — variables con nombres con intención clara
- [ ] Código seguro — nunca confiar en datos del cliente
- [ ] Código sólido que soporte de 10 a millones de usuarios sin errores, lentitud, saturación ni cuellos de botella
- [ ] Código ordenado y limpio
- [ ] Código limpio y legible
- [ ] Sin código fake — toda funcionalidad es real
- [ ] Sin código duplicado — DRY estricto
- [ ] Cada función hace UNA sola tarea
- [ ] Código huérfano eliminado
- [ ] Código escalable y mantenible
- [ ] Optimizado para rapidez y eficiencia
- [ ] Validar TODO con Zod antes de llegar al backend
- [ ] No dejar pasar basura al backend



### 2. Seguridad (ver `references/security-rules.md`)
- [ ] Todos los API routes tienen `await auth()` o verificación de firma
- [ ] Todos los endpoints POST tienen validación Zod
- [ ] Rate limiting aplicado en endpoints críticos
- [ ] Sin valores de texto libre en campos de estilo/tono — solo allowlist
- [ ] Sin secrets en código — solo en variables de entorno
- [ ] Sin `console.log` en producción

### 3. Internacionalización
- [ ] Sin texto hardcodeado visible en componentes
- [ ] Toda clave nueva en `messages/es.json` Y `messages/en.json`
- [ ] Nombres de clave descriptivos y en el namespace correcto

### 4. TypeScript
- [ ] `npx tsc --noEmit` sin errores
- [ ] Sin uso de `any` sin justificación documentada
- [ ] Commit solo si 0 errores de TypeScript

### 5. Arquitectura
- [ ] Constantes compartidas en `lib/` — nunca duplicadas entre archivos
- [ ] API routes siguen el patrón: auth → rate limit → parse → validate → execute → respond
- [ ] Client components usan `useTranslations`, Server components usan `getTranslations`

---

## Output esperado

El skill debe devolver un reporte estructurado con:

```json
{
  "passed": [...],
  "warnings": [...],
  "critical": [...],
  "orphanCode": [...],
  "duplicateCode": [...]
}
```

---

## Referencias

- `CLAUDE.md` — contexto completo del proyecto
- `references/security-rules.md` — reglas de seguridad detalladas
- `src/lib/security/` — implementación de seguridad
- `messages/es.json` — traducciones (fuente de verdad)
