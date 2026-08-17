import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
          PH
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">ProjectHub</h1>
        <p className="text-sm text-muted-foreground">
          AI-powered project management platform
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-8 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} ProjectHub ·{" "}
        <Link href="/" className="underline-offset-4 hover:underline">
          Beranda
        </Link>
      </p>
    </div>
  );
}