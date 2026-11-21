import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock3, MapPin, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { demoAppointments, formatDisplayDate, StatusPill } from "@/components/portal-ui";
import { useAuth } from "@/lib/auth";
import {
  apiGetMyAppointments,
  apiUpdateStatus,
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
    const qc = useQueryClient();
    const [filter, setFilter] = useState("All");
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);

    const hasToken = !!getToken();

    // ── Fetch from FastAPI backend only when logged in with a real token ───
    const { data: realAppointments, isLoading } = useQuery({
      queryKey: ["my-appointments"],
      queryFn: apiGetMyAppointments,
      enabled: !isPreview && hasToken && me?.role === "student",
      retry: false,
    });

    const items: NormalizedAppointment[] = useMemo(() => {
      // 1. If real appointments are loaded from FastAPI:
      if (!isPreview && hasToken && realAppointments !== undefined) {
        return realAppointments
          .filter((a) => {
            if (filter === "All") return true;
            return a.status.toLowerCase() === filter.toLowerCase();
          })
          .map((a: AppointmentOut) => ({
            id: a.id,
            ref_code: a.ref_code,
            lecturerName:
              (a.lecturer_title ? a.lecturer_title + " " : "") +
              (a.lecturer_name || `Lecturer #${a.lecturer_id.slice(0, 8)}`),
            lecturerDepartment: a.lecturer_department || null,
            dateStr: fmtDate(a.appointment_date),
            timeStr: `${fmtTime(a.start_time)} – ${fmtTime(a.end_time)}`,
            location: a.location || "Office consultation",
            purpose: a.purpose,
            status: a.status,
            lecturerNote: a.lecturer_note,
          }));
      }

      // 2. Fallback to mock demo appointments:
      return demoAppointments
        .filter((d) => {
          if (filter === "All") return true;
          return d.status.toLowerCase() === filter.toLowerCase();
        })
        .map((d) => ({
          id: d.id,
          ref_code: null,
          lecturerName: `${d.title} ${d.name}`,
          lecturerDepartment: null,
          dateStr: formatDisplayDate(d.date),
          timeStr: d.time,
          location: d.location,
          purpose: d.purpose,
          status: d.status,
          lecturerNote: null,
        }));
    }, [realAppointments, filter, isPreview, hasToken]);

    const tone = (status: string) => {
      const s = status.toLowerCase();
      if (s === "approved") return "success" as const;
      if (s === "rejected") return "danger" as const;
      if (s === "cancelled") return "neutral" as const;
      return "warning" as const;
    };

    async function handleConfirmCancel() {
      if (!cancellingId) return;

      if (isPreview || cancellingId.startsWith("demo-")) {
        toast.success("Appointment cancelled (Demo Mode)");
        setCancellingId(null);
        setCancelReason("");
        return;
      }

      setIsCancelling(true);
      try {
        await apiUpdateStatus(cancellingId, "CANCELLED", cancelReason.trim() || undefined);
        toast.success("Appointment cancelled", {
          description: "The time slot has been freed for other students.",
        });
        qc.invalidateQueries({ queryKey: ["my-appointments"] });
        qc.invalidateQueries({ queryKey: ["lecturers"] });
        setCancellingId(null);
        setCancelReason("");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to cancel appointment";
        toast.error("Error", { description: msg });
      } finally {
        setIsCancelling(false);
      }
    }

    return (
      <div>
        <PageHeader
          title="My Appointments"
          subtitle="Keep track of your scheduled consultations and request statuses."
        />

        <div className="mb-5 flex flex-wrap gap-2">
          {["All", "Pending", "Approved", "Rejected", "Cancelled"].map((item) => (
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
            {items.map((a) => {
              const canCancel =
                a.status.toLowerCase() === "pending" || a.status.toLowerCase() === "approved";

              return (
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
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.lecturerDepartment}
                        </p>
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

                  {canCancel && (
                    <div className="mt-4 flex gap-2 border-t pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setCancellingId(a.id);
                          setCancelReason("");
                        }}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" />
                        Cancel consultation
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* ── Cancel Appointment Confirmation Dialog ── */}
        <Dialog open={!!cancellingId} onOpenChange={(o) => !o && setCancellingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel consultation</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this appointment? The consultation time slot will be
                released so other students can book it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <label className="text-xs font-medium text-foreground">
                Reason for cancellation (optional):
              </label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Timetable clash, resolved the query earlier..."
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCancellingId(null)} disabled={isCancelling}>
                Keep Appointment
              </Button>
              <Button variant="destructive" onClick={handleConfirmCancel} disabled={isCancelling}>
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
});
