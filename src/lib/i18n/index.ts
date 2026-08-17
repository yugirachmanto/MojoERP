export const LANGUAGES = [
  { code: "id", label: "Bahasa Indonesia" },
  { code: "en", label: "English" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: Language = "id";

const id = {
  common: {
    save: "Simpan",
    saving: "Menyimpan...",
    cancel: "Batal",
    create: "Buat",
    creating: "Membuat...",
    edit: "Edit",
    delete: "Hapus",
    close: "Tutup",
    loading: "Memuat...",
    back: "Kembali",
    search: "Cari",
    all: "Semua",
    download: "Unduh",
    upload: "Unggah",
    optional: "opsional",
    unknown: "Tidak diketahui",
  },
  auth: {
    welcome: "Selamat datang",
    welcomeBack: "Selamat datang kembali",
    login: "Masuk",
    loginTitle: "Masuk ke akun kamu",
    authError: "Terjadi kesalahan saat autentikasi. Silakan coba lagi.",
    register: "Daftar",
    registerTitle: "Buat akun baru",
    name: "Nama Lengkap",
    namePlaceholder: "Nama kamu",
    email: "Email",
    phone: "Nomor Telepon",
    phonePlaceholder: "+62 812 3456 7890",
    password: "Password",
    passwordMin: "Minimal 8 karakter.",
    confirmPassword: "Konfirmasi Password",
    confirmMismatch: "Konfirmasi password tidak sama",
    forgotPassword: "Lupa password?",
    resetPassword: "Reset Password",
    resetPasswordTitle: "Buat password baru",
    resetPasswordDone: "Simpan password",
    sendResetLink: "Kirim link reset",
    resetLinkSent: "Link reset password terkirim",
    resetLinkSentBody:
      "Link reset password telah dikirim ke email kamu. Periksa inbox (dan folder spam).",
    showPassword: "Tampilkan password",
    hidePassword: "Sembunyikan password",
    noAccount: "Belum punya akun?",
    haveAccount: "Sudah punya akun?",
    backToLogin: "Kembali ke login",
    accountCreated: "Akun berhasil dibuat",
    passwordChanged: "Password berhasil diubah",
    checkEmail: "Cek email kamu untuk verifikasi",
    checkEmailBody:
      "Akun berhasil dibuat. Kami telah mengirim link verifikasi ke email kamu.",
    verifyThenLogin: "Setelah verifikasi, silakan",
    creatingAccount: "Membuat akun...",
    signedOut: "Berhasil keluar",
  },
  onboarding: {
    title: "Siapkan workspace kamu",
    welcome: "Selamat datang di ProjectHub 👋",
    welcomeBody:
      "Buat organisasi pertama kamu untuk memulai. Kamu bisa mengundang tim nanti.",
    createOrgCard: "Buat Organisasi",
    subtitle: "Buat organisasi untuk mulai mengelola project.",
    companyName: "Nama Perusahaan",
    companyNameHelp:
      "Kosongkan untuk memakai nama kamu sebagai nama workspace.",
    timezone: "Zona Waktu",
    timezonePlaceholder: "Pilih zona waktu",
    createOrg: "Buat organisasi",
    creating: "Membuat...",
    orgCreated: "Organisasi berhasil dibuat",
  },
  nav: {
    dashboard: "Dashboard",
    projects: "Projects",
    members: "Anggota",
    settings: "Pengaturan",
    overview: "Overview",
    board: "Board",
    gantt: "Gantt",
    tasks: "Tasks",
    chat: "Chat",
    files: "Files",
  },
  userMenu: {
    profile: "Profil",
    signOut: "Keluar",
  },
  notifications: {
    title: "Notifikasi",
    markAllRead: "Tandai semua",
    empty: "Tidak ada notifikasi",
  },
  settings: {
    title: "Pengaturan",
    subtitle: "Kelola pengaturan organisasi dan preferensi kamu.",
    orgInfo: "Informasi Organisasi",
    orgInfoDesc: "Hanya admin yang dapat mengubah pengaturan ini.",
    approvalFlow: "Approval Flow (Default)",
    approvalFlowDesc:
      "Alur approval default organisasi. Dapat di-override per project.",
    noApprovalFlow: "Belum ada approval flow default.",
    aiIntegration: "AI Integration",
    aiIntegrationDesc:
      "Konfigurasi AI agent (BYO API key) tersedia di Fase 3.",
    aiIntegrationBody:
      "Di fase ini, kamu dapat menonaktifkan AI monitoring per project dari halaman project.",
    myPreferences: "Preferensi Saya",
    myPreferencesDesc: "Pengaturan ini hanya berlaku untuk akun kamu.",
    language: "Bahasa",
    languageHelp: "Bahasa antarmuka aplikasi.",
    languageUpdated: "Bahasa berhasil diubah",
  },
  orgSwitcher: {
    organizations: "Organisasi",
  },
  dashboard: {
    title: "Dashboard",
    hello: "Halo, {name}",
    subtitle: "Ringkasan tugas dan progress project kamu.",
    myTasks: "Task Saya",
    notFinished: "belum selesai",
    dueSoon: "Jatuh Tempo (7 hari)",
    deadlineNear: "deadline mendekat",
    overdue: "Terlambat",
    needsAttention: "perlu perhatian",
    activeProjects: "Project Aktif",
    ofProjects: "dari {count} project",
    noTasksAssigned: "Tidak ada task yang ditugaskan ke kamu.",
    recentProjects: "Project Terbaru",
    noProjectsBody: "Belum ada project.",
    createFirstProject: "Buat project pertama",
    overallProgress: "Progress keseluruhan",
    noDeadline: "Tanpa deadline",
  },
  projects: {
    title: "Projects",
    subtitle: "Semua project dalam organisasi kamu.",
    count: "{count} project di organisasi ini.",
    new: "Project Baru",
    empty: "Belum ada project. Klik “Project Baru” untuk membuat.",
    noDescription: "Belum ada deskripsi.",
  },
};

const en: typeof id = {
  common: {
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    create: "Create",
    creating: "Creating...",
    edit: "Edit",
    delete: "Delete",
    close: "Close",
    loading: "Loading...",
    back: "Back",
    search: "Search",
    all: "All",
    download: "Download",
    upload: "Upload",
    optional: "optional",
    unknown: "Unknown",
  },
  auth: {
    welcome: "Welcome",
    welcomeBack: "Welcome back",
    login: "Sign in",
    loginTitle: "Sign in to your account",
    authError: "Something went wrong during authentication. Please try again.",
    register: "Sign up",
    registerTitle: "Create a new account",
    name: "Full Name",
    namePlaceholder: "Your name",
    email: "Email",
    phone: "Phone Number",
    phonePlaceholder: "+62 812 3456 7890",
    password: "Password",
    passwordMin: "At least 8 characters.",
    confirmPassword: "Confirm Password",
    confirmMismatch: "Password confirmation does not match",
    forgotPassword: "Forgot password?",
    resetPassword: "Reset Password",
    resetPasswordTitle: "Create a new password",
    resetPasswordDone: "Save password",
    sendResetLink: "Send reset link",
    resetLinkSent: "Password reset link sent",
    resetLinkSentBody:
      "A password reset link has been sent to your email. Check your inbox (and spam folder).",
    showPassword: "Show password",
    hidePassword: "Hide password",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    backToLogin: "Back to sign in",
    accountCreated: "Account created successfully",
    passwordChanged: "Password changed successfully",
    checkEmail: "Check your email for verification",
    checkEmailBody:
      "Account created. We've sent a verification link to your email.",
    verifyThenLogin: "After verifying, please",
    creatingAccount: "Creating account...",
    signedOut: "Signed out successfully",
  },
  onboarding: {
    title: "Set up your workspace",
    welcome: "Welcome to ProjectHub 👋",
    welcomeBody:
      "Create your first organization to get started. You can invite your team later.",
    createOrgCard: "Create Organization",
    subtitle: "Create an organization to start managing projects.",
    companyName: "Company Name",
    companyNameHelp: "Leave blank to use your name as the workspace name.",
    timezone: "Timezone",
    timezonePlaceholder: "Select timezone",
    createOrg: "Create organization",
    creating: "Creating...",
    orgCreated: "Organization created successfully",
  },
  nav: {
    dashboard: "Dashboard",
    projects: "Projects",
    members: "Members",
    settings: "Settings",
    overview: "Overview",
    board: "Board",
    gantt: "Gantt",
    tasks: "Tasks",
    chat: "Chat",
    files: "Files",
  },
  userMenu: {
    profile: "Profile",
    signOut: "Sign out",
  },
  notifications: {
    title: "Notifications",
    markAllRead: "Mark all read",
    empty: "No notifications",
  },
  settings: {
    title: "Settings",
    subtitle: "Manage organization settings and your preferences.",
    orgInfo: "Organization Info",
    orgInfoDesc: "Only admins can change these settings.",
    approvalFlow: "Approval Flow (Default)",
    approvalFlowDesc: "Default approval flow. Can be overridden per project.",
    noApprovalFlow: "No default approval flow yet.",
    aiIntegration: "AI Integration",
    aiIntegrationDesc:
      "AI agent configuration (BYO API key) will be available in Phase 3.",
    aiIntegrationBody:
      "In this phase, you can disable AI monitoring per project from the project page.",
    myPreferences: "My Preferences",
    myPreferencesDesc: "These settings only apply to your account.",
    language: "Language",
    languageHelp: "Application interface language.",
    languageUpdated: "Language updated successfully",
  },
  orgSwitcher: {
    organizations: "Organizations",
  },
  dashboard: {
    title: "Dashboard",
    hello: "Hello, {name}",
    subtitle: "Overview of your tasks and project progress.",
    myTasks: "My Tasks",
    notFinished: "not finished",
    dueSoon: "Due Soon (7 days)",
    deadlineNear: "deadlines approaching",
    overdue: "Overdue",
    needsAttention: "needs attention",
    activeProjects: "Active Projects",
    ofProjects: "of {count} projects",
    noTasksAssigned: "No tasks assigned to you.",
    recentProjects: "Recent Projects",
    noProjectsBody: "No projects yet.",
    createFirstProject: "Create your first project",
    overallProgress: "Overall progress",
    noDeadline: "No deadline",
  },
  projects: {
    title: "Projects",
    subtitle: "All projects in your organization.",
    count: "{count} projects in this organization.",
    new: "New Project",
    empty: "No projects yet. Click “New Project” to create one.",
    noDescription: "No description yet.",
  },
};

export const dictionaries: Record<Language, typeof id> = { id, en };

export function getDictionary(lang: Language): typeof id {
  return dictionaries[lang] ?? id;
}

type Dict = typeof id;

export type TranslationKey = {
  [K in keyof Dict]: Dict[K] extends string
    ? K
    : `${K}.${Extract<keyof Dict[K], string>}`;
}[keyof Dict];

export function translate(
  lang: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const parts = key.split(".");
  let value: unknown = dictionaries[lang] ?? id;
  for (const part of parts) {
    value = (value as Record<string, unknown>)?.[part];
    if (value === undefined) break;
  }
  let str =
    typeof value === "string"
      ? value
      : (key.split(".").pop() ?? key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}
