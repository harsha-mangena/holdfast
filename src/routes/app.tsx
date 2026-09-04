import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-muted">
        Loading board…
      </div>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;
  if (!user.emailVerified) {
    return <Navigate to="/verify" search={{ email: user.primaryEmail ?? "" }} />;
  }
  return <AppShell />;
}