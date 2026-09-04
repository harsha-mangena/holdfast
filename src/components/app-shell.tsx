import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { SignOutButton, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ThemeToggle } from "@/components/theme-toggle";

const SIDE = [
  { to: "/app", label: "Board" },
  { to: "/app/vendors", label: "Subs" },
  { to: "/app/certificates", label: "Certs" },
  { to: "/app/requirements", label: "Standards" },
  { to: "/app/books", label: "Finance" },
  { to: "/app/chase", label: "Chase" },
  { to: "/app/clerk", label: "Clerk" },
  { to: "/app/settings", label: "Office" },
] as const;

const DOCK = [
  { to: "/app", label: "Board" },
  { to: "/app/vendors", label: "Subs" },
  { to: "/app/certificates", label: "Certs" },
  { to: "/app/books", label: "Finance" },
] as const;

const MORE = [
  { to: "/app/chase", label: "Chase" },
  { to: "/app/clerk", label: "Clerk" },
  { to: "/app/requirements", label: "Standards" },
  { to: "/app/settings", label: "Office" },
  { to: "/app/account", label: "Account" },
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
            <div className="font-display text-2xl font-semibold tracking-wide text-primary">HOLDFAST</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">COI evidence</div>
          </Link>
          <ThemeToggle className="h-9 w-9 shrink-0" />
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {SIDE.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block rounded-md px-3 py-2.5 text-sm text-muted hover:bg-raised hover:text-fg"
              activeProps={{ className: "block rounded-md bg-raised px-3 py-2.5 text-sm text-fg" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="shrink-0 p-2">
          {isPending ? (
            <div className="h-10 animate-pulse rounded-md bg-raised" />
          ) : user ? (
            <Link
              to="/app/account"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-raised"
              activeProps={{ className: "flex items-center gap-2 rounded-md bg-raised px-2 py-1.5" }}
            >
              <AccountMark name={label} image={user.profileImageUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm leading-tight">{label}</span>
                {user.primaryEmail && user.displayName ? (
                  <span className="block truncate text-[10px] leading-tight text-muted">{user.primaryEmail}</span>
                ) : null}
              </span>
            </Link>
          ) : null}
          <SignOutButton className="px-2 py-1" />
        </div>
      </aside>

      <div className="min-h-dvh pt-9 lg:pl-52">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:hidden">
          <Link to="/" className="font-display text-xl text-primary">
            HOLDFAST
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-raised" />
            ) : user ? (
              <Link to="/app/account" aria-label="Account" className="rounded-full">
                <AccountMark name={label} image={user.profileImageUrl} />
              </Link>
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
            {DOCK.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-12 flex-1 items-center justify-center px-1 text-center text-[11px] text-muted"
                activeProps={{ className: "flex min-h-12 flex-1 items-center justify-center bg-raised px-1 text-center text-[11px] text-fg" }}
                onClick={() => setMore(false)}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              className={`flex min-h-12 flex-1 items-center justify-center px-1 text-center text-[11px] ${more || moreActive ? "bg-raised text-fg" : "text-muted"}`}
              onClick={() => setMore((v) => !v)}
            >
              More
            </button>
          </div>
          {more ? (
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

function AccountMark({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return <img src={image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised text-sm font-medium text-primary">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
