import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SignOutButton, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ThemeToggle } from "@/components/theme-toggle";

const SIDE = [
  { to: "/app", label: "Board" },
  { to: "/app/vendors", label: "Subs" },
  { to: "/app/certificates", label: "Certs" },
  { to: "/app/jobs", label: "Jobs" },
  { to: "/app/books", label: "Books" },
  { to: "/app/calendar", label: "Calendar" },
  { to: "/app/chase", label: "Chase" },
  { to: "/app/clerk", label: "Ask" },
  { to: "/app/requirements", label: "Standards" },
  { to: "/app/settings", label: "Office" },
] as const;

const DOCK = [
  { to: "/app", label: "Board" },
  { to: "/app/vendors", label: "Subs" },
  { to: "/app/certificates", label: "Certs" },
  { to: "/app/jobs", label: "Jobs" },
] as const;

const MORE = [
  { to: "/app/books", label: "Books" },
  { to: "/app/calendar", label: "Calendar" },
  { to: "/app/chase", label: "Chase" },
  { to: "/app/clerk", label: "Ask" },
  { to: "/app/requirements", label: "Standards" },
  { to: "/app/settings", label: "Office" },
] as const;

export function AppShell() {
  const { user, isPending } = useCurrentUserState();
  const [more, setMore] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const moreActive = MORE.some((i) => path === i.to || path.startsWith(i.to + "/"));
  const label = user?.displayName ?? user?.primaryEmail ?? "Account";

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="fixed inset-x-0 top-0 z-40 flex h-9 items-center justify-center border-b border-border bg-surface text-[10px] uppercase tracking-[0.16em] text-muted">
        Staging · fake documents only
      </div>

      <aside className="fixed bottom-0 left-0 top-9 z-30 hidden w-52 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex shrink-0 items-start justify-between gap-1 px-3 py-3">
          <Link to="/" className="min-w-0">
            <div className="font-display text-2xl font-semibold tracking-wide text-primary">Holdfast</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">The 6 a.m. gate</div>
          </Link>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {SIDE.map((item) => {
            const on = item.to === "/app" ? path === "/app" : path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block rounded-md px-3 py-2.5 text-sm ${on ? "bg-raised text-fg" : "text-muted hover:bg-raised hover:text-fg"}`}
              >
                {on ? <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-h-dvh pt-9 lg:pl-52">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <Link to="/" className="font-display text-xl text-primary lg:hidden">
            Holdfast
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {isPending ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-raised" />
            ) : user ? (
              <AvatarMenu name={label} email={user.primaryEmail} image={user.profileImageUrl} />
            ) : (
              <UserButton />
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface lg:hidden">
          <div className="flex">
            {DOCK.map((item) => {
              const on = item.to === "/app" ? path === "/app" : path === item.to || path.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex min-h-12 flex-1 items-center justify-center px-1 text-center text-[11px] ${on ? "bg-raised text-fg" : "text-muted"}`}
                  onClick={() => setMore(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              className={`flex min-h-12 flex-1 items-center justify-center px-1 text-center text-[11px] ${more || moreActive ? "bg-raised text-fg" : "text-muted"}`}
              onClick={() => setMore((v) => !v)}
            >
              More
            </button>
          </div>
          {more || moreActive ? (
            <div className="grid grid-cols-2 gap-1 border-t border-border p-2">
              {MORE.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-md px-3 py-2.5 text-sm text-muted hover:bg-raised hover:text-fg"
                  activeProps={{ className: "rounded-md bg-raised px-3 py-2.5 text-sm text-fg" }}
                  onClick={() => setMore(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </nav>
      </div>
    </div>
  );
}

function AvatarMenu({ name, email, image }: { name: string; email: string | null; image: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} className="rounded-full" onClick={() => setOpen((v) => !v)}>
        <AccountMark name={name} image={image} />
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <div className="truncate text-sm">{name}</div>
            {email ? <div className="truncate text-[11px] text-muted">{email}</div> : null}
          </div>
          <Link to="/app/account" className="block px-3 py-2.5 text-sm hover:bg-raised" onClick={() => setOpen(false)}>
            Profile
          </Link>
          <div className="border-t border-border px-2 py-2">
            <SignOutButton className="w-full px-2 py-1 text-left" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountMark({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raised text-sm font-medium text-primary">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
