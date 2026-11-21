import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Mail, Phone, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, StatusPill } from "@/components/portal-ui";
import { getStoredUser } from "@/lib/backend";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — UMAppoint" }] }),
  component: function ProfilePage() {
    const { me } = useAuth();
    const [fullName, setFullName] = useState(me?.full_name ?? "Aisyah Zulkifli");
    const [email, setEmail] = useState(me?.email ?? "aisyah@um.edu.my");
    const [phone, setPhone] = useState("+60 12 345 6789");
    const [matricNo, setMatricNo] = useState("U2102345");
    const [programme, setProgramme] = useState("Bachelor of Computer Science");
    const [about, setAbout] = useState(
      "Final year student interested in building reliable and accessible software.",
    );
    const [saved, setSaved] = useState(false);

    function handleSave() {
      const stored = getStoredUser();
      if (stored) {
        stored.full_name = fullName;
        localStorage.setItem("uma_user", JSON.stringify(stored));
      }
      setSaved(true);
      toast.success("Profile updated successfully", {
        description: "Your personal details have been saved.",
      });
      setTimeout(() => setSaved(false), 3000);
    }

    return (
      <div>
        <PageHeader
          title="Profile"
          subtitle="Manage your personal information and consultation details."
        />
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-xl border bg-card p-6 text-center shadow-card">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-2xl font-semibold text-primary">
              {(fullName || "U")
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </div>
            <p className="mt-4 font-semibold">{fullName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
            <div className="mt-2 flex justify-center">
              <StatusPill tone="info">
                {me?.role === "lecturer" ? "Lecturer" : "Student"}
              </StatusPill>
            </div>
            <div className="mt-5 space-y-2 border-t pt-4 text-left text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {email}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {phone}
              </p>
            </div>
          </aside>
          <section className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3 border-b pb-4">
              <UserRound className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Personal information</h2>
                <p className="text-sm text-muted-foreground">Keep your details up to date.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Field>
              <Field label="Email address">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </Field>
              <Field label="Phone number">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="Matric number">
                <Input value={matricNo} onChange={(e) => setMatricNo(e.target.value)} />
              </Field>
              <Field label="Programme / Department">
                <Input value={programme} onChange={(e) => setProgramme(e.target.value)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="About you">
                <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} />
              </Field>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              {saved && (
                <span className="flex items-center gap-1 text-sm text-success">
                  <Check className="h-4 w-4" />
                  Changes saved
                </span>
              )}
              <Button onClick={handleSave}>
                <Save className="mr-1.5 h-4 w-4" />
                Save changes
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  },
});
