# Worker de correo para Tareas (Edge Function)

Este documento completa el envío real de emails para recordatorios de tareas.

## 1) Migraciones SQL

Ejecuta en este orden:

1. `MIGRATION_TASKS_REMINDERS.sql`
2. `MIGRATION_TASK_EMAIL_DISPATCH.sql`

Esto deja listas:
- `task_email_queue` para cola de correos
- `claim_task_email_jobs(p_limit)` para reclamo seguro de jobs
- `process_task_reminders(p_limit)` para crear notificación app + encolar email

## 2) Configurar secrets en Supabase

```bash
supabase secrets set \
  SUPABASE_URL="https://TU-PROYECTO.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY" \
  SENDGRID_API_KEY="TU_SENDGRID_API_KEY" \
  SENDGRID_FROM_EMAIL="notificaciones@tu-dominio.com" \
  SENDGRID_FROM_NAME="Rodicon" \
  TASK_EMAIL_MAX_JOBS="25"
```

### Windows PowerShell (recomendado)

Puedes ejecutar todo en un solo paso con el script:

```powershell
.\scripts\setup-task-email-worker.ps1 `
  -ProjectRef "TU_PROJECT_REF" `
  -SupabaseUrl "https://TU-PROYECTO.supabase.co" `
  -ServiceRoleKey "TU_SERVICE_ROLE_KEY" `
  -SendgridApiKey "TU_SENDGRID_API_KEY" `
  -SendgridFromEmail "notificaciones@tu-dominio.com" `
  -SendgridFromName "Rodicon" `
  -TaskEmailMaxJobs 25
```

Si no tienes CLI global, no pasa nada: usa `npx`.

```powershell
npx supabase login
```

## 3) Deploy de Edge Function

```bash
supabase functions deploy task-email-dispatch
```

Archivo:
- `supabase/functions/task-email-dispatch/index.ts`

## 4) Programar ejecución cada 5 minutos

Opciones recomendadas:

### Opción A (recomendada): Supabase Scheduled Functions
- Crear un schedule cada 5 min que invoque `task-email-dispatch` con método `POST`.

Pasos:
1. Dashboard → Edge Functions → `task-email-dispatch`
2. Schedule / Cron → `*/5 * * * *`
3. Method: `POST`
4. Body: `{}`

### Opción B: cron externo (GitHub Actions / UptimeRobot / servidor)
- Invocar endpoint HTTP de la function cada 5 min.

Ejemplo request:

```bash
curl -X POST \
  "https://TU-PROYECTO.supabase.co/functions/v1/task-email-dispatch" \
  -H "Authorization: Bearer TU_SUPABASE_ANON_O_SERVICE_KEY" \
  -H "Content-Type: application/json"
```

### Opción C: SQL (pg_cron + pg_net)

Ejecuta [scripts/schedule-task-email-cron.sql](scripts/schedule-task-email-cron.sql) en SQL Editor de Supabase y reemplaza:
- `<PROJECT_REF>`
- `<ANON_OR_SERVICE_KEY>`

## 5) Flujo completo

1. Admin Global crea tarea en módulo `Tareas`.
2. Se registra `task_reminders`.
3. `process_task_reminders` genera:
   - notificación in-app (`notifications`)
   - fila en `task_email_queue`
4. `task-email-dispatch` consume la cola y envía por SendGrid.
5. Estado final en cola: `SENT` o `FAILED`.

## 6) Verificación rápida

```sql
-- Recordatorios pendientes
SELECT * FROM task_reminders WHERE sent_at IS NULL ORDER BY remind_at ASC;

-- Cola de correos
SELECT id, to_email, status, attempts, sent_at, last_error
FROM task_email_queue
ORDER BY created_at DESC
LIMIT 50;
```
