# Setup Supabase (db push) — ProjectHub

Langkah-langkah untuk membuat project Supabase dan menerapkan semua migrasi
(`supabase/migrations/00001` s.d. `00006`) ke database.

---

## 1. Prasyarat

- Node.js (sudah terpasang, v24) dan npm.
- Akun Supabase (daftar di https://supabase.com).
- Docker **tidak wajib** untuk `supabase db push` (hanya wajib untuk mode lokal `supabase start`).

## 2. Install Supabase CLI (Windows)

Pilih salah satu:

```powershell
# Opsi A: npm
npm install -g supabase

# Opsi B: Chocolatey
choco install supabase

# Opsi C: Scoop
scoop install supabase
```

Verifikasi:

```powershell
supabase --version
```

## 3. Login ke Supabase

Akses token dibuat di dashboard → **Account Settings → Access Tokens**.

```powershell
supabase login
# atau pakai token langsung:
supabase login --token <YOUR_ACCESS_TOKEN>
```

## 4. Buat Project Supabase

1. Buka https://supabase.com/new → buat organisasi + project baru.
2. Catat **Database Password** yang dibuat saat ini (tidak bisa dilihat lagi nanti).
3. Setelah project jadi, catat dari **Project Settings → API**:
   - **Project URL** (contoh: `https://abcdefgh.supabase.co`)
   - **anon public key**
   - **service_role key** (jangan pernah diekspos ke frontend)
4. **Project Ref** = bagian subdomain dari URL (contoh ref untuk
   `https://abcdefgh.supabase.co` adalah `abcdefgh`).

## 5. Isi File `.env`

Salin `.env.example` menjadi `.env`, lalu isi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

> `SUPABASE_SERVICE_ROLE_KEY` digunakan oleh server action `inviteMember`
> untuk mencari `auth.users` berdasarkan email. Wajib diisi agar fitur undang
> anggota berfungsi.

## 6. Link Project

Jalankan dari folder project ini (C:\Users\HP\Documents\Default Project):

```powershell
supabase link --project-ref abcdefgh
```

Supabase CLI akan meminta **Database Password** dari langkah 4.
Status berhasil: `Finished supabase link.`

## 7. Terapkan Migrasi (db push)

```powershell
supabase db push
```

CLI akan:
- Mendeteksi file di `supabase/migrations/00001_init.sql` … `00006_profiles.sql`,
- Menjalankannya berurutan,
- Menyimpan riwayat ke tabel `supabase_migrations.schema_migrations`.

Untuk non-interaktif (tanpa prompt password), pakai DB URL:

```powershell
supabase db push --db-url "postgresql://postgres:<DATABASE_PASSWORD>@db.abcdefgh.supabase.co:5432/postgres"
```

> Port database default Supabase adalah **5432** (bukan 6543 yang hanya untuk pooler/transaction mode).

## 8. Verifikasi Migrasi

```powershell
supabase migration list
```

Semua baris `00001`–`00006` harus berstatus `Local`/`Remote` terpasang.

Cek tabel di dashboard **Table Editor**: `profiles`, `organizations`,
`organization_members`, `projects`, `approval_flows`, `approval_steps`,
`tasks`, `subtasks`, `task_dependencies`, `task_activity_log`, `chat_rooms`,
`chat_messages`, `files`, `ai_settings`, `notifications`, `audit_logs`.

Cek Storage: bucket `project-files` dan `chat-attachments` harus ada di
**Storage**.

## 9. Konfigurasi Auth (Redirect URL)

Di **Project Settings → Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: tambahkan `http://localhost:3000/auth/callback`
  dan `http://localhost:3000` (untuk callback reset password / email confirmation).

Pastikan **Email → Confirm email** sesuai preferensi (app sudah menangani
`requiresConfirmation` pada alur register).

## 10. Jalankan Aplikasi

```powershell
npm run dev
```

Buka `http://localhost:3000`, register user pertama → otomatis dibuatkan
organisasi + default 3-level approval flow oleh RPC `bootstrap_organization`.

---

## Troubleshooting

| Masalah | Solusi |
| --- | --- |
| `db push` minta password berulang / gagal auth | Pakai `--db-url` dari langkah 7. Pastikan password sesuai dengan yang dibuat saat create project. |
| `relation "public.profiles" does not exist` | Migrasi belum semua terpasang. Jalankan ulang `supabase db push` dan cek `supabase migration list`. |
| `auth.users` tidak bisa di-reference | Pastikan project bukan project lama yang sudah deprecated; `auth.users` selalu tersedia di project baru. |
| Storage policy tidak aktif | Konfirmasi bucket `project-files` & `chat-attachments` dibuat (dilakukan di `00005_storage.sql`). |
| Fitur undang anggota gagal | Cek `SUPABASE_SERVICE_ROLE_KEY` terisi di `.env` dan server di-restart. |
| Local dev butuh reset | `supabase db reset --linked` untuk drop & re-apply semua migrasi ke project ter-link. |
