import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap, AlertCircle } from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s["mode"] === "register" ? ("register" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — UMAppoint" },
      { name: "description", content: "Sign in or register for UMAppoint consultation booking." },
      { property: "og:title", content: "Sign in — UMAppoint" },
      {
        property: "og:description",
        content: "Sign in or register for UMAppoint consultation booking.",
      },
    ],
  }),
  component: AuthPage,
});

const DEMO = [
  { label: "Demo student", email: "aiman.student@demo.umappoint.edu", role: "student" as Role },
  { label: "Demo lecturer", email: "nurul.hakim@demo.umappoint.edu", role: "lecturer" as Role },
];

function AuthPage() {
  const { mode } = Route.useSearch();
  const register = mode === "register";
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [role, setRole] = useState<"student" | "lecturer">("student");
  const [f, setF] = useState({
    email: "",
    password: "",
    full_name: "",
    matric_no: "",
    programme: "",
    department: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setF({ ...f, [k]: e.target.value });
  };

  const { signIn, signUp, setPreviewRole } = useAuth();

  // Fast sign-in for seeded accounts
  async function quickSignIn(email: string, pw: string) {
    setBusy(true);
    setErrorMsg(null);
    try {
      await signIn(email, pw);
      toast.success("Signed in with FastAPI!");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setErrorMsg(msg);
      toast.error("Sign in failed", { description: msg });
    } finally {
      setBusy(false);
    }
  }

  // Preview mode: no server calls, just enter the portal with the chosen role.
  function enter(r: Role) {
    setBusy(true);
    setPreviewRole(r);
    toast.success(r === "lecturer" ? "Signed in as demo lecturer" : "Signed in as demo student");
    navigate({ to: "/dashboard" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      if (register) {
        await signUp({
          email: f.email,
          password: f.password,
          full_name: f.full_name,
          role,
          matric_no: role === "student" ? f.matric_no : undefined,
          programme: role === "student" ? f.programme : undefined,
          department: role === "lecturer" ? f.department : undefined,
        });
        toast.success("Account created! Logged in successfully.");
      } else {
        await signIn(f.email, f.password);
        toast.success("Signed in successfully!");
      }
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setErrorMsg(msg);
      toast.error(register ? "Registration failed" : "Sign in failed", {
        description: msg,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-gold-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold">UMAppoint</span>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold">Consultations made simple.</h2>
          <p className="mt-3 text-primary-foreground/75">
            For FCSIT students and lecturers at Universiti Malaya.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© 2026 UMAppoint</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">
            {register ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {register ? "Already registered? " : "New here? "}
            <Link
              to="/auth"
              search={{ mode: register ? undefined : "register" }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>

          {errorMsg && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {register && (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                  {(["student", "lecturer"] as const).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className={
                        role === r
                          ? "rounded-md bg-card py-1.5 text-sm font-medium shadow-card"
                          : "py-1.5 text-sm text-muted-foreground"
                      }
                    >
                      {r === "student" ? "Student" : "Lecturer"}
                    </button>
                  ))}
                </div>
                <div>
                  <Label>Full name</Label>
                  <Input required value={f.full_name} onChange={set("full_name")} />
                </div>
                {role === "student" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Matric no.</Label>
                      <Input value={f.matric_no} onChange={set("matric_no")} />
                    </div>
                    <div>
                      <Label>Programme</Label>
                      <Input value={f.programme} onChange={set("programme")} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={f.department}
                      onChange={set("department")}
                      placeholder="Department of Software Engineering"
                    />
                  </div>
                )}
              </>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" required value={f.email} onChange={set("email")} />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={f.password}
                onChange={set("password")}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait..." : register ? "Create account" : "Sign in"}
            </Button>
          </form>
          {!register && (
            <div className="mt-8 space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  FastAPI Live Accounts
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sign in to test live appointments and approvals:
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-primary/30 hover:bg-primary/10 text-xs"
                    disabled={busy}
                    onClick={() => quickSignIn("nurul.hakim@demo.umappoint.edu", "Password123!")}
                  >
                    Dr. Nurul (Lecturer)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-primary/30 hover:bg-primary/10 text-xs"
                    disabled={busy}
                    onClick={() => quickSignIn("aiman.student@demo.umappoint.edu", "Password123!")}
                  >
                    Aiman (Student)
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Offline preview (No backend)
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {DEMO.map((d) => (
                    <Button
                      key={d.email}
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => enter(d.role)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
