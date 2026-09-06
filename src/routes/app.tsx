import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  if (!isPending && !user) return <RedirectToSignIn to="/login" />;
  if (!isPending && user && !user.emailVerified) {
    return <Navigate to="/verify" search={{ email: user.primaryEmail ?? "" }} />;
  }
  return <AppShell sessionReady={!isPending && !!user} />;
}
