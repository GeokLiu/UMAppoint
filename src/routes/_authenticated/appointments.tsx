import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock3, MapPin, Loader2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { demoAppointments, formatDisplayDate, StatusPill } from "@/components/portal-ui";
import { useAuth } from "@/lib/auth";
import {
  apiGetMyAppointments,
  apiRequestCancellation,
  fmtDate,
  fmtTime,
  getToken,
  type AppointmentOut,
} from "@/lib/backend";

interface NormalizedAppointment {
  id: string;
  ref_code: string | null;
  lecturerName: string;
  lecturerDepartment: string | null;
  dateStr: string;
  timeStr: string;
  location: string;
  purpose: string;
  status: string;
  lecturerNote: string | null;
}

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({ meta: [{ title: "My Appointments — UMAppoint" }] }),
  component: function AppointmentsPage() {
    const { me, isPreview } = useAuth();
    const [filter, setFilter] = useState("All");
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancellationReason, setCancellationReason] = useState("");
    const [submittingCancellation, setSubmittingCancellation] = useState(false);
    const queryClient = useQueryClient();

    const hasToken = !!getToken();

    // ── Fetch from FastAPI backend only when logged in with a real token ───
    const { data: realAppointments, isLoading } = useQuery({
      queryKey: ["my-appointments"],
      queryFn: apiGetMyAppointments,
      enabled: !isPreview && hasToken && me?.role === "student",
      retry: false,
    });

    async function submitCancellation(appointmentId: string) {
      if (cancellationReason.trim().length < 5) {
        toast.error("Please provide a reason of at least 5 characters.");
        return;
      }
      setSubmittingCancellation(true);
      try {
        await apiRequestCancellation(appointmentId, cancellationReason.trim());
        toast.success("Cancellation request sent to your lecturer.");
        setCancellingId(null);
        setCancellationReason("");
        await queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
        await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not submit cancellation request.");
      } finally {
        setSubmittingCancellation(false);
      }
    }
    const items: NormalizedAppointment[] = useMemo(() => {
      // 1. If real appointments are loaded from FastAPI:
      if (!isPreview && hasToken && realAppointments !== undefined) {
        return realAppointments
          .filter((a) => {
            if (filter === "All") return true;
            const expected = filter === "Cancellation Requested" ? "cancellation_requested" : filter.toLowerCase();
            return a.status.toLowerCase() === expected;
          })
          .map((a) => ({
            id: a.id,
            ref_code: a.ref_code,
            lecturerName: a.lecturer_name
              ? (a.lecturer_title && !a.lecturer_name.toLowerCase().startsWith(a.lecturer_title.toLowerCase())
                  ? `${a.lecturer_title} ${a.lecturer_name}`
                  : a.lecturer_name)
              : a.ref_code
                ? `Ref: ${a.ref_code}`
                : `Appointment #${a.id.slice(0, 8)}`,
            lecturerDepartment: a.lecturer_department ?? null,
            dateStr: fmtDate(a.appointment_date),
            timeStr: `${fmtTime(a.start_time)} – ${fmtTime(a.end_time)}`,
            location: a.location || "Office",
            purpose: a.purpose,
            status: a.status,
            lecturerNote: a.lecturer_note,
          }));
      }

      // 2. Demo mode / fallback: show demo appointments immediately
      return demoAppointments
        .filter((a) => {
          if (filter === "All") return true;
          return a.status.toLowerCase() === filter.toLowerCase();
        })
        .map((d) => ({
          id: d.id,
          ref_code: null,
          lecturerName: d.title && !d.name.toLowerCase().startsWith(d.title.toLowerCase())
            ? `${d.title} ${d.name}`
            : d.name,
          lecturerDepartment: null,
          dateStr: formatDisplayDate(d.date),
          timeStr: d.time,
          location: d.location || "Office",
          purpose: d.purpose,
          status: d.status,
          lecturerNote: null,
        }));
    }, [realAppointments, filter, isPreview, hasToken]);

    const tone = (status: string) => {
      const s = status.toLowerCase();
      if (s === "approved") return "success" as const;
      if (s === "pending") return "warning" as const;
      if (s === "rejected") return "danger" as const;
      return "info" as const;
    };

    return (
      <div>
        <PageHeader
          title="My Appointments"
          subtitle="Keep track of your scheduled consultations and request statuses."
        />

        <div className="mb-5 flex flex-wrap gap-2">
          {["All", "Pending", "Approved", "Cancellation Requested", "Rejected"].map((item) => (
            <Button
              key={item}
              size="sm"
              variant={filter === item ? "default" : "outline"}
              onClick={() => setFilter(item)}
            >
              {item}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-10 text-center">
            <p className="font-medium text-foreground">No {filter.toLowerCase()} appointments</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Book consultations from the &quot;Find Lecturers&quot; page to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <article key={a.id} className="rounded-xl border bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-base">{a.lecturerName}</p>
                      {a.ref_code && (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                          {a.ref_code}
                        </span>
                      )}
                    </div>
                    {a.lecturerDepartment && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.lecturerDepartment}</p>
                    )}
                  </div>
                  <StatusPill tone={tone(a.status)}>{a.status.toUpperCase()}</StatusPill>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {a.dateStr}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-primary" />
                    {a.timeStr}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {a.location}
                  </span>
                </div>

                <p className="mt-4 text-sm text-foreground">
                  <span className="font-medium">Purpose: </span> {a.purpose}
                </p>

                {a.lecturerNote && (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    Lecturer response note: {a.lecturerNote}
                  </p>
                )}
                {a.status === "cancellation_requested" ? (
                  <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                    Your cancellation request is awaiting the lecturer response.
                  </p>
                ) : !isPreview && (a.status === "pending" || a.status === "approved") ? (
                  <div className="mt-4">
                    {cancellingId === a.id ? (
                      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                        <label className="text-sm font-medium" htmlFor={"cancel-reason-" + a.id}>Reason for cancellation</label>
                        <Textarea id={"cancel-reason-" + a.id} value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} placeholder="Briefly explain why you need to cancel..." rows={3} maxLength={500} />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={submittingCancellation || cancellationReason.trim().length < 5} onClick={() => void submitCancellation(a.id)}>
                            {submittingCancellation ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Submit request
                          </Button>
                          <Button size="sm" variant="outline" disabled={submittingCancellation} onClick={() => { setCancellingId(null); setCancellationReason(""); }}>Keep appointment</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setCancellingId(a.id); setCancellationReason(""); }}><XCircle className="h-4 w-4" /> Request cancellation</Button>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    );
  },
});
