import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Video,
  List,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/portal-ui";
import { useAuth } from "@/lib/auth";
import {
  apiGetLecturerAppointments,
  fmtDate,
  fmtTime,
  getToken,
  type AppointmentOut,
} from "@/lib/backend";

interface ScheduleItem {
  id: string;
  refCode: string | null;
  student: string;
  matricNo?: string | null;
  date: string; // "YYYY-MM-DD"
  dateDisplay: string;
  time: string;
  location: string;
  purpose: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // Monday = 0, Sunday = 6
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7;
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: [{ title: "My Schedule — UMAppoint" }] }),
  component: function SchedulePage() {
    const { me, isPreview } = useAuth();
    const hasToken = !!getToken();

    const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
    const [currentMonth, setCurrentMonth] = useState(() => new Date());

    // ── Fetch approved appointments for lecturer from FastAPI ───────────────
    const { data: realAppointments, isLoading } = useQuery({
      queryKey: ["lecturer-schedule-approved"],
      queryFn: () => apiGetLecturerAppointments("approved"),
      enabled: !isPreview && hasToken && me?.role === "lecturer",
      retry: false,
    });

    // ── Dynamic fallback items for demo / preview mode ──────────────────────
    const demoItems: ScheduleItem[] = useMemo(() => {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const d = now.getDate();

      const d1 = toDateKey(y, m, d);
      const d2 = toDateKey(y, m, Math.min(d + 2, 28));
      const d3 = toDateKey(y, m, Math.min(d + 5, 28));

      return [
        {
          id: "APT-1042",
          refCode: "APT-1042",
          student: "Aisyah Zulkifli",
          matricNo: "U2102891",
          date: d1,
          dateDisplay: fmtDate(d1),
          time: "09:00 – 09:30",
          location: "Office · Block C-312",
          purpose: "Final year project architecture review",
        },
        {
          id: "APT-1051",
          refCode: "APT-1051",
          student: "Daniel Lee",
          matricNo: "U2004512",
          date: d2,
          dateDisplay: fmtDate(d2),
          time: "14:00 – 14:30",
          location: "Online consultation",
          purpose: "Database normalisation & indexing queries",
        },
        {
          id: "APT-1056",
          refCode: "APT-1056",
          student: "Nur Iman",
          matricNo: "U2101903",
          date: d3,
          dateDisplay: fmtDate(d3),
          time: "11:00 – 11:30",
          location: "Office · Block C-312",
          purpose: "AI project supervision & ethics approval",
        },
      ];
    }, []);

    // ── Normalized appointment list ─────────────────────────────────────────
    const items: ScheduleItem[] = useMemo(() => {
      if (realAppointments && realAppointments.length > 0) {
        return realAppointments.map((a: AppointmentOut) => ({
          id: a.id,
          refCode: a.ref_code,
          student:
            a.student_name ||
            (a.ref_code ? `Ref: ${a.ref_code}` : `Student #${a.student_id.slice(0, 8)}`),
          matricNo: a.student_matric_no ?? null,
          date: a.appointment_date,
          dateDisplay: fmtDate(a.appointment_date),
          time: `${fmtTime(a.start_time)} – ${fmtTime(a.end_time)}`,
          location: a.location || "Office consultation",
          purpose: a.purpose,
        }));
      }

      if (!realAppointments && isPreview) {
        return demoItems;
      }

      return [];
    }, [realAppointments, isPreview, demoItems]);

    // Initial selected date
    const todayStr = useMemo(() => {
      const now = new Date();
      return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const [selectedDate, setSelectedDate] = useState<string>(todayStr);

    // Group items by date for O(1) calendar cell lookup
    const appointmentsByDate = useMemo(() => {
      const map = new Map<string, ScheduleItem[]>();
      for (const item of items) {
        const list = map.get(item.date) || [];
        list.push(item);
        map.set(item.date, list);
      }
      return map;
    }, [items]);

    // Calendar grid calculations
    const curYear = currentMonth.getFullYear();
    const curMonth = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(curYear, curMonth);
    const firstDayOffset = getFirstDayOfWeek(curYear, curMonth);

    const monthName = currentMonth.toLocaleDateString("en-MY", {
      month: "long",
      year: "numeric",
    });

    const selectedAppointments = appointmentsByDate.get(selectedDate) || [];

    const handlePrevMonth = () => {
      setCurrentMonth(new Date(curYear, curMonth - 1, 1));
    };

    const handleNextMonth = () => {
      setCurrentMonth(new Date(curYear, curMonth + 1, 1));
    };

    const handleToday = () => {
      const now = new Date();
      setCurrentMonth(now);
      setSelectedDate(todayStr);
    };

    return (
      <div>
        <PageHeader
          title="My Schedule"
          subtitle="Your confirmed consultations in chronological order and monthly calendar."
          action={
            <Button
              variant="outline"
              onClick={() => setViewMode((v) => (v === "timeline" ? "calendar" : "timeline"))}
              className="gap-2"
            >
              {viewMode === "timeline" ? (
                <>
                  <CalendarDays className="h-4 w-4" />
                  Calendar view
                </>
              ) : (
                <>
                  <List className="h-4 w-4" />
                  Timeline view
                </>
              )}
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "timeline" ? (
          // ── Timeline View ────────────────────────────────────────────────
          items.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center">
              <p className="font-medium text-foreground">No confirmed consultations</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Approved consultations from booking requests will appear here in your schedule.
              </p>
            </div>
          ) : (
            <div className="relative space-y-4 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-px before:bg-border">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="relative ml-0 rounded-xl border bg-card p-5 pl-16 shadow-card"
                >
                  <div className="absolute left-3 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {item.dateDisplay} · {item.time}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="font-semibold text-foreground">{item.student}</p>
                        {item.refCode && (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                            {item.refCode}
                          </span>
                        )}
                      </div>
                      {item.matricNo && (
                        <p className="text-xs text-muted-foreground">Matric: {item.matricNo}</p>
                      )}
                    </div>
                    <StatusPill tone="success">Confirmed</StatusPill>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {item.location}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" />
                      {item.purpose}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => toast.success("Appointment marked as completed")}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Mark as completed
                    </Button>
                    {item.location.toLowerCase().includes("online") && (
                      <Button size="sm" variant="outline">
                        <Video className="mr-1.5 h-4 w-4" />
                        Open meeting
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        ) : (
          // ── Calendar View ────────────────────────────────────────────────
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5 shadow-card">
              {/* Calendar Header Controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{monthName}</h2>
                  <p className="text-xs text-muted-foreground">
                    Click any day to view or filter consultations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextMonth}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Day-of-week headers */}
              <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
                {WEEKDAYS.map((wd) => (
                  <div key={wd} className="py-2">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Monthly Dates Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty offset days */}
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-20 rounded-lg border border-transparent bg-muted/20 p-2 opacity-30"
                  />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = toDateKey(curYear, curMonth, dayNum);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const dayAppts = appointmentsByDate.get(dateStr) || [];
                  const hasAppts = dayAppts.length > 0;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`min-h-20 cursor-pointer rounded-lg border p-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary-soft/50 ring-2 ring-primary/30"
                          : isToday
                            ? "border-primary/50 bg-card hover:bg-muted/40"
                            : "border-border/60 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full font-medium ${
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : isSelected
                                ? "font-bold text-primary"
                                : "text-foreground"
                          }`}
                        >
                          {dayNum}
                        </span>
                        {hasAppts && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {dayAppts.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 space-y-1">
                        {dayAppts.slice(0, 2).map((a) => (
                          <div
                            key={a.id}
                            className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"
                            title={`${a.time} - ${a.student}`}
                          >
                            {(a.time.split("–")[0] || a.time).trim()}{" "}
                            {a.student.split(" ")[0] || a.student}
                          </div>
                        ))}
                        {dayAppts.length > 2 && (
                          <p className="text-[10px] text-muted-foreground">
                            +{dayAppts.length - 2} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Detail Section */}
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Consultations on {fmtDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedAppointments.length === 0
                      ? "No consultations scheduled on this date"
                      : `${selectedAppointments.length} confirmed consultation${selectedAppointments.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                {selectedAppointments.length > 0 && (
                  <StatusPill tone="success">{selectedAppointments.length} Confirmed</StatusPill>
                )}
              </div>

              {selectedAppointments.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No consultations scheduled for {fmtDate(selectedDate)}.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click any highlighted date above to view its consultations, or switch to
                    Timeline view.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedAppointments.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">{item.student}</p>
                              {item.refCode && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                                  {item.refCode}
                                </span>
                              )}
                            </div>
                            {item.matricNo && (
                              <p className="text-xs text-muted-foreground">
                                Matric No: {item.matricNo}
                              </p>
                            )}
                          </div>
                        </div>
                        <StatusPill tone="success">Confirmed</StatusPill>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5 text-primary" />
                          {item.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {item.location}
                        </span>
                      </div>

                      <p className="mt-3 rounded bg-card p-2.5 text-xs text-foreground">
                        <span className="font-medium">Purpose: </span>
                        {item.purpose}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => toast.success("Appointment marked as completed")}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Mark as completed
                        </Button>
                        {item.location.toLowerCase().includes("online") && (
                          <Button size="sm" variant="outline">
                            <Video className="mr-1.5 h-3.5 w-3.5" />
                            Open meeting
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
});
