import Image from "next/image";
import Link from "next/link";

export function AppShell({
  children,
  backHref,
}: {
  children: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6 sm:max-w-2xl">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/art/mascot-icon.jpg"
            alt=""
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="font-display text-2xl font-semibold tracking-tight text-brand">
            Wondrix
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-ink-soft">
          {backHref ? (
            <Link href={backHref} className="underline-offset-4 hover:underline">
              Back
            </Link>
          ) : null}
          <Link
            href="/parent"
            className="rounded-full border border-stroke bg-card/80 px-3 py-1.5 hover:bg-card"
          >
            Parent
          </Link>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
