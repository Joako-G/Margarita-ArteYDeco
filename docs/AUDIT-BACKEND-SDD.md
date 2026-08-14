## Auditoria del Backend

# Fase 1 — Descubrimiento (solo lectura)

Objetivo: comprender el backend sin modificar ningún archivo.

Debe revisar:

- Arquitectura del backend.
- Estructura de carpetas.
- Middleware.
- Rutas públicas y privadas.
- Autenticación.
- Autorización.
- Validaciones.
- Variables de entorno utilizadas.
- Configuración de Helmet, CORS, cookies y rate limiting.

Prohibido modificar código.

Resultado esperado:

- SECURITY_AUDIT_PHASE1.md

# Fase 2 — Análisis de vulnerabilidades (solo lectura)

Intentar detectar:

- Broken Authentication
- Broken Authorization
- IDOR
- CSRF
- SSRF
- XSS
- SQL Injection
- NoSQL Injection
- Command Injection
- Path Traversal
- File Upload
- Race Conditions
- Session Fixation
- Privilege Escalation
- Information Disclosure
- Secrets Exposure
- JWT Issues
- Cookie Issues
- Rate Limiting Bypass
- Business Logic Flaws

Cada hallazgo debe incluir:

- Riesgo (Critical / High / Medium / Low)
- Evidencia
- Archivo
- Línea
- Explicación
- Recomendación

Sin modificar código.

Resultado:

- SECURITY_AUDIT_PHASE2.md

# Fase 3 — Plan de remediación

Ahora sí generar:

- prioridades
- orden de implementación
- impacto
- esfuerzo estimado

Resultado:

- SECURITY_REMEDIATION_PLAN.md

# Fase 4 — Correcciones

Recién aquí modificar el código.

Corregir:

1- Critical
2- High
3- Medium
4- Low

Después de cada corrección:

- ejecutar tests
- verificar que no se rompa ninguna funcionalidad