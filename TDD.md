# Technical Design Document — AI-Powered Project Management Platform

**Version:** 1.0
**Status:** Engineering handoff (draft)
**Referensi:** PRD v1.0, DECISIONS.md

---

## 1. Arsitektur Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router (Frontend + BFF)      │
│  App Router / Server Actions / Route Handlers (API)          │
│  TanStack Query + Supabase Realtime client                   │
│  Tailwind + shadcn/ui                                        │
└───────────────┬───────────────────────────────┬──────────────┘
                │ Supabase JS SDK               │ Server Actions / RPC
                ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│        Supabase            │   │     Supabase Edge (Ops)      │
│  Postgres + RLS + Realtime │   │  Cron jobs: AI reminder,     │
│  Auth + Storage + Auth     │   │  follow-up, reporting         │
│  Hooks (optional)          │   │  queue via pgmq/table queue   │
└─────────────────────────────┘   └─────────────────────────────┘
                │
                ▼
┌─────────────────────────────┐
│      AI Layer (BYO Key)     │
│  Interface: aiProvider.send │
│  Adapters: Anthropic, OpenAI│
│  Function/tool calling      │
└─────────────────────────────┘
```

**Prinsip kunci:**
- Semua akses data lewat Supabase (server-side) dengan RLS; client hanya punya akses sesuai role (via `RLS` + policy).
- Mutasi data via **Server Actions** di Next.js, bukan akses langsung dari client, agar policy logic & audit terpusat.
- Realtime hanya untuk read/stream (chat, notifikasi, task update); mutasi tetap via server.
- AI agent hanya jalan di server/Edge dengan credential terenkripsi.

---

## 2. Stack Final

| Layer | Pilihan | Catatan |
|---|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui | `src/app` |
| State/Data | TanStack Query + supabase-js (server & browser) | |
| Realtime | Supabase Realtime (Postgres Changes + Broadcast) | chat, notifications |
| DB | Supabase Postgres 15 | RLS multi-tenant |
| Auth | Supabase Auth (email/password + OAuth opsional) | |
| Storage | Supabase Storage | buckets: `project-files`, `chat-attachments`, `esign-documents` |
| AI | Multi-provider: Anthropic + OpenAI | interface + adapter |
| Background | Supabase Edge Functions + pg_cron / queue table | idempotent jobs |
| Testing | Vitest (unit), Playwright (e2e, fase 2+) | |
| Lint/Format | ESLint + Prettier | |

---

## 3. Folder Structure (Monorepo Single-Repo)

```
/
├─ DECISIONS.md
├─ PRD.md
├─ TDD.md (this)
├─ package.json
├─ next.config.mjs
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  ├─ 00001_init.sql
│  │  ├─ 00002_rls.sql
│  │  ├─ 00003_functions.sql
│  │  └─ ... (berurutan)
│  └─ functions/                # Edge Functions
│     ├─ ai-agent/
│     │  ├─ index.ts            # trigger: ai.jobs queue / cron
│     │  ├─ providers/          # anthropic.ts, openai.ts, index.ts
│     │  ├─ tools/              # createTask.ts, updateTask.ts, ...
│     │  └─ prompts/
│     └─ report-scheduler/
└─ src/
   ├─ app/                      # App Router
   │  ├─ (auth)/                # login, register, forgot-password
   │  ├─ (app)/                 # authenticated shell
   │  │  ├─ orgs/[orgId]/       # org scoped routes
   │  │  │  ├─ dashboard/
   │  │  │  ├─ projects/
   │  │  │  ├─ settings/
   │  │  │  └─ members/
   │  │  └─ projects/[projectId]/
   │  │     ├─ board/           # Kanban
   │  │     ├─ gantt/
   │  │     ├─ chat/
   │  │     ├─ files/
   │  │     ├─ tasks/[taskId]/
   │  │     ├─ approvals/
   │  │     └─ kpi/
   │  ├─ api/                   # Route Handlers (webhook, export)
   │  └─ layout.tsx
   ├─ components/               # UI (shadcn) + feature components
   ├─ lib/
   │  ├─ supabase/              # server.ts, client.ts, middleware.ts
   │  ├─ auth/                  # session, role helpers
   │  ├─ validators/            # zod schemas
   │  ├─ ai/                    # provider interface & adapters (mirror)
   │  ├─ audit.ts
   │  └─ permissions.ts         # policy evaluator (server)
   ├─ server/
   │  ├─ actions/               # Server Actions per domain
   │  └─ services/              # business logic (pure TS)
   ├─ hooks/                    # react-query hooks
   ├─ stores/                   # zustand (kanban/dnd local state)
   └─ types/                    # shared types
```

---

## 4. Database Schema (DDL Level)

Semua tabel punya:
```sql
created_at timestamptz default now(),
updated_at timestamptz default now()
```
Row-level `updated_at` dijaga trigger `set_updated_at()`.

### 4.1 Core Multi-Tenancy

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  timezone text default 'UTC',
  approval_flow_id uuid,           -- FK ke approval_flows (default flow)
  created_by uuid,
  created_at/updated_at
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','manager','member','viewer')),
  approval_level int,              -- untuk approver (1..N)
  status text default 'active',    -- invited / active / removed
  invited_by uuid,
  unique (organization_id, user_id)
);
```

**Role map:** `admin` (full org access + settings), `manager` (buat project, approve, lihat KPI dept), `member` (kerjakan task, chat, upload), `viewer` (read-only). `approval_level` menyimpan level approval user dalam org.

### 4.2 Projects & Tasks

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  start_date date,
  end_date date,
  owner_id uuid,                    -- project lead
  status text default 'planning' check (status in ('planning','active','on_hold','completed','cancelled')),
  approval_flow_id uuid,            -- override org default (nullable)
  ai_monitoring_enabled boolean default true,
  ai_auto_apply boolean default false,  -- selalu false sesuai DECISIONS; dipakai untuk masa depan
  template_id uuid,                 -- nullable, untuk project template
  created_by uuid
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade,  -- sub-task
  title text not null,
  description text,
  assignee_id uuid,                 -- user (nullable hingga di-assign)
  start_date date,
  due_date date,
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  status text default 'todo' check (status in ('todo','in_progress','review','done','blocked')),
  progress int default 0 check (progress between 0 and 100),
  estimated_hours numeric,
  labels text[] default '{}',
  sort_order int default 0,
  completed_at timestamptz,
  created_by uuid
);

create table task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,     -- successor
  depends_on_task_id uuid not null references tasks(id) on delete cascade, -- predecessor
  type text default 'finish_to_start',
  unique (task_id, depends_on_task_id)
);

create table task_checklist (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  done boolean default false,
  sort_order int default 0
);

create table task_activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  actor_id uuid,
  action text not null,             -- created / updated / status_changed / comment
  field text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz default now()
);
```

### 4.3 Chat & Files

```sql
create table chat_rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid,                     -- nullable: task chat sbg sub-thread
  name text,
  created_at timestamptz default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id) on delete cascade,
  sender_id uuid,                   -- null jika dikirim AI/system
  sender_type text default 'user' check (sender_type in ('user','ai','system')),
  content text not null,
  reply_to_id uuid,
  attachments uuid[],               -- FK array ke files
  created_at timestamptz default now()
);

create table chat_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade
);

create table files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid,
  task_id uuid,
  message_id uuid,                  -- jika attachment chat
  owner_type text not null check (owner_type in ('project','task','message','esign')),
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid,
  content_hash text,                -- sha256, dipakai juga utk e-sign integrity
  ai_indexed_at timestamptz,        -- penanda sudah diproses AI
  created_at timestamptz default now()
);
```

### 4.4 KPI

```sql
create table kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid,                  -- null = org-wide / department
  name text not null,
  metric text not null check (metric in ('on_time_completion_rate','task_overdue_count','throughput','avg_completion_time','custom')),
  config jsonb default '{}'::jsonb, -- params (mis. time window, formula custom)
  scope text not null check (scope in ('personal','department','overall'))
);

create table kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references kpi_definitions(id) on delete cascade,
  user_id uuid,                     -- untuk scope personal
  period date not null,             -- awal periode
  value numeric not null,
  metadata jsonb,
  computed_at timestamptz default now(),
  unique (definition_id, user_id, period)
);
```

### 4.5 Approval & E-Sign

```sql
create table approval_flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  is_default boolean default false,
  requires_signature boolean default false,
  created_at/updated_at
);

create table approval_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references approval_flows(id) on delete cascade,
  step_number int not null,
  required_role text not null check (required_role in ('project_lead','manager','director')),
  required_level int,               -- match ke organization_members.approval_level
  unique (flow_id, step_number)
);

create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  object_type text not null check (object_type in ('task_completion','milestone','budget_request','document')),
  object_id uuid not null,
  flow_id uuid not null references approval_flows(id),
  status text default 'pending' check (status in ('pending','approved','rejected','in_revision','cancelled')),
  current_step int default 1,
  requested_by uuid,
  title text not null,
  detail jsonb default '{}'::jsonb,
  created_at/updated_at
);

create table approval_step_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references approval_requests(id) on delete cascade,
  step_number int not null,
  approver_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','rejected')),
  note text,
  signed boolean default false,
  signature_id uuid,                -- FK ke signatures
  decided_at timestamptz default now(),
  unique (request_id, step_number, approver_id)
);

create table signatures (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,                  -- jika e-sign utk approval
  document_id uuid references files(id),  -- jika e-sign dokumen
  signer_id uuid not null references auth.users(id),
  signature_type text not null check (signature_type in ('canvas','typed')),
  signature_data text not null,     -- data-url PNG (canvas) atau font/text
  document_hash text not null,      -- sha256 isi dokumen saat ditandatangani
  ip_address text,
  signed_at timestamptz default now()
);
```

### 4.6 AI, Notifikasi, Audit

```sql
create table ai_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (provider in ('anthropic','openai')),
  encrypted_api_key text not null,  -- dienkripsi app-side (PGP sym. via Vault/keyset)
  key_last4 text,
  model text not null default 'claude-sonnet',  -- per provider default
  temperature numeric default 0.3,
  created_by uuid,
  updated_at timestamptz default now(),
  unique (organization_id, provider)
);

create table ai_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid,
  job_type text not null check (job_type in ('reminder','followup','mom_parse','report','progress_extract')),
  payload jsonb default '{}'::jsonb,
  status text default 'pending' check (status in ('pending','running','success','failed','cancelled')),
  attempts int default 0,
  run_at timestamptz,
  executed_at timestamptz,
  error text,
  created_at timestamptz default now()
);

create table ai_actions_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid,
  action_type text not null check (action_type in ('create_task','update_task','update_progress','generate_report','draft_comment','mom_proposal')),
  status text not null default 'draft' check (status in ('draft','approved','rejected','applied')),
  context_source text,              -- 'chat' | 'document' | 'file' | 'manual'
  context_ref jsonb,                -- refs message_id/file_id
  payload jsonb,                    -- draft aksi yang diusulkan
  applied_data jsonb,               -- hasil commit (id task baru, dsb)
  proposed_by text default 'ai',
  reviewed_by uuid,                 -- user yang approve/reject draft
  created_at/updated_at
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('task_assigned','deadline_soon','mention','approval_pending','approval_result','ai_report','ai_reminder','system')),
  title text not null,
  body text,
  metadata jsonb default '{}'::jsonb,  -- refs (task_id, message_id, request_id)
  read_at timestamptz,
  created_at timestamptz default now()
);

create table audit_logs (
  id bigserial primary key,
  organization_id uuid,
  actor_id uuid,
  action text not null,             -- project.create, task.update, approval.decide, e_sign.apply, ai.apply
  entity_type text,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip_address text,
  metadata jsonb,
  created_at timestamptz default now()
);
```

---

## 5. RLS Strategy

Pola utama:
1. **Helper function** `auth.uid()` dan `is_member(org_id, min_role)` (security definer) untuk evaluasi akses.
2. Policy `using` = user adalah member aktif org tsb (untuk read); `with check` = role memadai (untuk write).

```sql
create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from organization_members om
    where om.organization_id = _org
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.has_role(_org uuid, _role text)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from organization_members om
    where om.organization_id = _org
      and om.user_id = auth.uid()
      and om.status = 'active'
      and case _role
        when 'admin' then om.role = 'admin'
        when 'manager' then om.role in ('admin','manager')
        when 'member' then om.role in ('admin','manager','member')
        else om.role in ('admin','manager','member','viewer')
      end
  );
$$;
```

**Prinsip peta per tabel:**
- `organizations` — select: `is_org_member(id)`; update/delete: `has_role(id,'admin')`.
- `organization_members` — select: `is_org_member(organization_id)`; insert: `has_role(organization_id,'admin')`; update: `has_role(organization_id,'admin')`.
- `projects` — select: `is_org_member(organization_id)`; insert: `has_role(organization_id,'member')` (praktis: manager+); update: `has_role(organization_id,'member')` atau `owner_id = auth.uid()`; delete: `has_role(organization_id,'admin')`.
- `tasks` — select: `is_org_member(project org)`; update: assignee atau manager+ (via subquery org dari project).
- `chat_rooms`/`chat_messages` — select: `is_org_member(project org)`.
- `files` — select: `is_org_member(organization_id)`.
- `ai_settings` — select/update: `has_role(organization_id,'admin')`; **API key tidak di-read oleh client** (hanya last4) — diakses hanya server/Edge.
- `kpi_snapshots` — personal: hanya user terkait + manager+; department/overall: manager+.
- `approval_requests` — select: member project; insert: member; update: approver pada step aktif atau admin.
- `signatures` — select: admin + signer + approver; insert: approver.
- `notifications` — select: `user_id = auth.uid()`.
- `audit_logs` — select: `has_role(organization_id,'admin')` (atau manager+).

> Client-side: `supabase-js` memakai anon key + RLS. Semua operasi sensitive tetap dieksekusi server-side (Server Actions) dengan `service_role` di mana perlu, tapi di-layer-service ini policy role tetap divalidasi ulang (defense in depth).

---

## 6. Auth & Onboarding Flow

1. `supabase.auth.signUp` → email verification.
2. Setup wizard (server action `completeOnboarding`):
   - create `organizations` (slug di-generate dari nama + random suffix, unik).
   - insert `organization_members` (role=admin) untuk user saat itu.
   - create default `approval_flows` (3-step: project_lead→manager→director) + set `organizations.approval_flow_id`.
   - create project template opsional.
3. Invite anggota (`inviteMember`):
   - insert `organization_members` status=invited + email; kirim email via Resend/Edge Function; token invite di `organization_member_invites` (fase 1 bisa simple: member ditambah langsung).
   - user bergabung via accept invite → status active.
4. Session & org switching: cookie session via `createServerClient`; middleware cek `organization_id` di path dan keanggotaan user.

---

## 7. Realtime Design

- **Chat:** subscribe `chat_messages` (postgres_changes) per room → TanStack Query cache update.
- **Notifikasi:** subscribe `notifications` per user (`user_id=auth.uid()`).
- **Task live update:** subscribe `tasks` pada project aktif (broadcast) untuk kanban multi-user.
- **AI messages:** sender_type='ai' masuk alur chat yang sama; status streaming dikirim via broadcast (mis. `ai:thinking` event) agar UI menampilkan typing indicator.
- Channel naming: `room:{roomId}`, `project:{projectId}:tasks`, `user:{userId}:notif`.

---

## 8. API Contract

### 8.1 Server Actions (mutasi utama)

Semua action: `"use server"`, validasi zod, lalu `audit.log(...)`.

| Action | Input (ringkas) | Behavior |
|---|---|---|
| `createOrganization` | name, timezone | buat org + admin member + default flow |
| `inviteMember` | orgId, email, role, approvalLevel | tambah member invited + email |
| `updateMemberRole` | orgId, memberId, role, level | validasi admin |
| `createProject` | orgId, name, dates, ownerId, approvalFlowId? | insert project |
| `updateProject` | projectId, fields | audit sebelum/sesudah |
| `createTask` | projectId, title, assignee, dates, priority, deps | insert + activity log |
| `updateTaskStatus` | taskId, newStatus | konfirmasi approval jika task pakai flow |
| `moveTask` | taskId, newStatus, sortOrder | kanban drop |
| `sendChatMessage` | roomId, content, attachments, mentions | insert + resolve mentions → notifications |
| `uploadFile` | projectId/taskId/messageId, file | upload ke Storage + insert files |
| `applyAiDraft` | aiActionId, approve: boolean | commit/reject draft (audit) |
| `submitApproval` | objectType, objectId | buat approval_request, notif approver lv.1 |
| `decideApproval` | requestId, decision, note, signature? | lanjut step / finalize, e-sign jika perlu |
| `createKpiDefinition` | orgId, metric, scope, config | |
| `updateAiSettings` | provider, apiKey, model | enkripsi key at-rest |

### 8.2 Route Handlers

| Route | Method | Fungsi |
|---|---|---|
| `/api/files/[id]/download` | GET | signed URL / stream (cek RLS) |
| `/api/export/gantt` | POST | render Gantt → PDF/image |
| `/api/export/audit` | GET | export audit log (admin) |
| `/api/webhooks/resend` | POST | email deliverability (fase 1 opsional) |

### 8.3 RPC / Postgres Functions

- `create_ai_action_draft(action)` — RPC dipanggil service, menyimpan draft + notif.
- `apply_ai_action(draft_id, reviewed_by)` — commit dengan transaction + audit.
- `recompute_kpi(def_id, period)` — dipanggil cron/AI.

---

## 9. AI Agent Design

### 9.1 Provider Interface

```ts
// src/lib/ai/types.ts
export interface AIProvider {
  id: 'anthropic' | 'openai';
  send(req: AIRequest): Promise<AIResponse>;
}
export interface AIRequest {
  model: string;
  system: string;
  messages: AIMessage[];
  tools: ToolDef[];
  temperature?: number;
  maxTokens?: number;
}
export interface ToolDef {
  name: string;          // e.g. 'create_task'
  description: string;
  parameters: JSONSchema;
}
```

Adapter: `AnthropicProvider`, `OpenAIProvider` (map tool-calling format ke standar internal). Registry `getProvider(orgId)` membaca `ai_settings` dan mendekripsi key (via Supabase Vault / app-key).

### 9.2 Tools AI (draft-first)

| Tool | Parameter inti | Aksi |
|---|---|---|
| `create_task` | projectId, title, desc, assignee, dueDate, priority | buat `ai_actions_log` (status=draft) + notif ke PM untuk review |
| `update_task_progress` | taskId, progress, status? | draft update → apply on confirm |
| `draft_comment` | roomId, content | kirim sebagai draft komentar AI di chat |
| `get_context` | scope: chat/document/task | membaca konteks (chat history, file content yang ter-index) |
| `generate_report` | projectId, period | hasil → draft PDF, post ke chat on confirm |
| `mom_parse` | text/fileId | output: list draft tasks + draft updates |

Draft → user review di UI (panel "AI Suggestions") → `applyAiDraft(true/false)` → commit + `ai_actions_log.status='applied'` + audit log. Tidak ada auto-apply (DECISIONS #2).

### 9.3 Prompt Design

- System prompt menyertakan: role (AI PM assistant), daftar tool JSON schema, aturan ("selalu buat draft, jangan commit langsung"), scope project, timezone, dan instruksi "jangan bocorkan konteks luar project".
- Context grounding: tool `get_context` mengambil message history + file ringkasan (chunking sederhana; full RAG fase 2).

### 9.4 Background Jobs (Cron — Edge Functions)

Semua job idempotent, punya `ai_jobs` row, retry (attempts ≤ 3, exponential backoff), logging error.

| Job | Cadence | Behavior |
|---|---|---|
| `deadline_reminder` | daily (per timezone org) | cari tasks due ≤ 48h & belum selesai → notif + chat reminder |
| `stagnant_progress` | daily | task aktif tanpa update ≥ X hari → follow-up ke assignee via chat/notif |
| `weekly_report` | mingguan | compile KPI + buat draft report → AI generate PDF → post ke chat (draft dulu) |
| `mom_queue` | on-demand | parse MoM → ai_actions_log drafts |

Cron scheduling: `pg_cron` di Supabase memanggil Edge Function; Edge Function membaca `ai_jobs` atau langsung query. Idempotency key: `(job_type, organization_id, project_id, run_period)`.

---

## 10. File Storage & AI Indexing

- Buckets (private): `project-files`, `chat-attachments`, `esign-documents`.
- Path convention: `<bucket>/<orgId>/<projectId>/<uuid>_<filename>`.
- Download via signed URL (server membuatnya dengan durasi pendek), selalu cek RLS member.
- `content_hash` = sha256 file untuk e-sign integrity & dedup.
- AI indexing: saat file text/PDF di-upload, Edge Function `index-file` mengekstrak teks (pdf-parse/tika) → simpan di tabel `file_content` (fase 1: PDF/gambar preview + metadata; fase 2: full text + RAG vector via `pgvector`).

---

## 11. E-Sign Module (Internal)

- **Capture:** komponen SignaturePad (canvas) atau typed signature → data-url PNG.
- **Verifikasi integritas:** server menghitung `sha256` isi file dokumen → simpan di `signatures.document_hash`; simpan pula snapshot metadata (nama file, ukuran, mime).
- **Locking:** setelah ada signature valid, `files` terkait di-set `locked=true` (add kolom); update path/content ditolak kecuali alur revisi baru (buat version baru).
- **Abstraction:** `interface ESignProvider { createSignaturePad(); verifyDocument(hash, currentHash): boolean }` — implementasi internal default; provider eksternal bisa di-swap.

---

## 12. Env & Secrets

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, jangan dipakai client
APP_ENC_KEY=                      # enkripsi AI API key at-rest
RESEND_API_KEY=                   # email (opsional fase 1)
AI_API_KEY_*                       # tidak wajib; key dari user (ai_settings)
```

> AI API key user: disimpan **terenkripsi** (`APP_ENC_KEY` + AES-256-GCM), hanya server yang mendekripsi saat memanggil provider. Client hanya lihat `key_last4`.

---

## 13. Pengujian

- **Unit (Vitest):** validators, permission evaluator, AI draft logic, adapter mapping tool-calling, audit helper.
- **Integrasi:** service layer dengan mock supabase (RLS asumsi diuji di Supabase via `supabase/seed` + policy tests).
- **E2E (Playwright, fase 2):** onboarding, create project→task→kanban move, chat, approval flow.
- **CI:** `npm run lint`, `npm run typecheck`, `npm test`.

---

## 14. Mapping Roadmap ke Modul

| Fase | Modul | Tabel / Fitur |
|---|---|---|
| 1 | Auth, Org, Project, Task+Kanban, Chat, File, Dashboard dasar | sections 4.1–4.3, 6, 7 |
| 2 | Gantt, KPI, Notifications, Audit | 4.4, 4.6 (notif+audit), 8.2 export gantt |
| 3 | AI Agent | 4.6 (ai_*), section 9 |
| 4 | Approval, E-sign, Reporting AI, PWA | 4.5, sections 10–11 |

---

## 15. Open Technical Questions (diselesaikan saat implementasi)

- Supabase Vault vs app-side encryption untuk API key AI (default: app-side dengan `APP_ENC_KEY`, lebih portable).
- pg_cron tersedia di plan Supabase yang dipilih? Jika tidak, fallback: external scheduler (GitHub Actions / n8n) men-trigger Edge Function.
- PDF generation di Edge Function: `@react-pdf/renderer` vs PDF-lib (default PDF-lib untuk lightweight).
- Full-text indexing file: fase 2 (pgvector + embedding provider), fase 1 cukup metadata + preview.
