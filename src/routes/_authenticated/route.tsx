import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

// Login is turned off: every page is open for preview.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AppShell,
});
