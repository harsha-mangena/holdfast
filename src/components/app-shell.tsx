import { Link, Outlet } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const NAV = [
  { to: "/app", label: "Board" },
  { to: "/app/vendors", label: "Subs" },
  { to: "/app/certificates", label: "Certs" },
  { to: "/app/books", label: "Books" },
  { to: "/app/chase", label: "Chase" },
  { to: "/app/clerk", label: "Clerk" },
  { to: "/app/settings", label: "Office" },
];

export function AppShell() {
  const { user, isPending } = useCurrentUserState();
  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="border-b border-border bg-surface px-3 py-2 text-center text-[10px] uppercase tracking-[0.16em] text-muted sm:text-[11px]">
        Staging · fake documents only
      </div>
      <div className="flex min-h-[calc(100dvh-40px)]">
        <aside className="hidden w-48 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <Link to="/" className="border-b border-border px-4 py-5">
            <div className="font-display text-2xl font-semibold tracking-wide text-primary">HOLDFAST</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">COI evidence</div>
          </Link>
          <nav className="flex-1 space-y-0.5 p-2">
            {NAV.map((item) => (
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
          <div className="border-t border-border p-2">
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-raised" />
            ) : user ? (
              <Link
                to="/app/account"
                className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-raised"
                activeProps={{ className: "flex items-center gap-2 rounded-md bg-raised px-2 py-2" }}
              >
                <AccountMark name={user.displayName ?? user.primaryEmail ?? "Account"} image={user.profileImageUrl} />
                <span className="min-w-0 flex-1 truncate text-sm">{user.displayName ?? user.primaryEmail ?? "Account"}</span>
              </Link>
            ) : null}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:hidden">
            <Link to="/" className="font-display text-xl text-primary">
              HOLDFAST
            </Link>
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-raised" />
            ) : user ? (
              <Link to="/app/account" aria-label="Account" className="rounded-full">
                <AccountMark name={user.displayName ?? user.primaryEmail ?? "Account"} image={user.profileImageUrl} />
              </Link>
            ) : (
              <UserButton />
            )}
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            <Outlet />
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-12 flex-1 items-center justify-center px-1 text-center text-[11px] text-muted"
                activeProps={{ className: "flex min-h-12 flex-1 items-center justify-center bg-raised px-1 text-center text-[11px] text-fg" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
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
