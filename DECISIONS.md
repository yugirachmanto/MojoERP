# DECISIONS — Keputusan Open Questions (PRD v1.0)

Status: Disetujui oleh Product Owner, 2026-08-16.

## 1. Approval Flow

**Keputusan:** Default flow per organisasi, user dapat mengubah/override flow approval per project.

- `organizations.approval_flow_id` = flow default seluruh organisasi.
- `projects.approval_flow_id` (nullable) = override per project; jika null, fallback ke flow organisasi.
- Flow terdiri atas N level yang configurable (Submit → Level 1..N), lihat `approval_flows`, `approval_steps`.

## 2. Mode Aksi AI

**Keputusan:** Semua aksi AI yang mengubah data (create task, update progress, dst.) selalu melalui tahap **draft/konfirmasi** (human-in-the-loop) sebelum commit ke database.

- Tidak ada mode full-autonomous pada tahap ini.
- Draft dikelola di `ai_actions_log` (status: draft → approved/rejected → applied).
- Aksi AI hanya commit setelah user menyetujui draft.

## 3. E-Signature

**Keputusan:** Modul internal sederhana.

- Signature pad (canvas) + typed signature.
- Setiap tanda tangan mencatat: nama penandatangan, waktu, hash dokumen saat ditandatangani.
- Dokumen yang sudah di-e-sign terkunci (read-only) sampai ada revisi baru.
- Interface dibuat sebagai abstraction agar provider pihak ketiga dapat diintegrasikan di masa depan.

## 4. Model AI

**Keputusan:** Multi-provider.

- Minimal: Anthropic + OpenAI (BYO API key, key terenkripsi at rest di `ai_settings`).
- AI layer memakai interface tunggal (`aiProvider.send(model, messages, tools)`) dengan adapter per provider.
- Tool/function calling didukung oleh kedua provider sejak awal.

## 5. Mobile

**Keputusan:** Web-responsive untuk Fase 1–3; PWA ditambahkan di Fase 4.

- Tidak ada aplikasi mobile native pada fase awal.
- PWA (manifest + service worker + push notification) masuk Fase 4.
