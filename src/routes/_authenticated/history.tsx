import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Search, Loader2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { demoAppointments, formatDisplayDate, StatusPill } from "@/components/portal-ui";
import { useAuth } from "@/lib/auth";
import { apiGetHistory, getToken, fmtTime, fmtDate } from "@/lib/backend";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — UMAppoint" }] }),
  component: function HistoryPage() {
    const { me, isPreview } = useAuth();
    const hasToken = typeof window !== "undefined" && !!getToken();

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("All");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const isLecturer = me?.role === "lecturer";

    const { data: realHistory, isLoading } = useQuery({
      queryKey: ["history"],
      queryFn: apiGetHistory,
      enabled: hasToken && !isPreview,
      staleTime: 30_000,
    });

    // Unified list of history records
    const historyList = useMemo(() => {
      if (hasToken && !isPreview) {
        return (realHistory ?? []).map((a) => {
          // Format status to Title Case (e.g. "completed" -> "Completed")
          const rawStatus = a.status.toLowerCase();
          const displayStatus =
            rawStatus === "completed"
              ? "Completed"
              : rawStatus === "rejected"
                ? "Rejected"
                : rawStatus === "cancelled"
                  ? "Cancelled"
                  : a.status;

          const title = a.lecturer_title || "Dr.";
          const lecName = a.lecturer_name || "Lecturer";
          const formattedLecturerName = lecName.toLowerCase().startsWith(title.toLowerCase().trim())
            ? lecName
            : `${title} ${lecName}`;

          const partyName = isLecturer
            ? a.student_name || "Student"
            : formattedLecturerName;

          const partySub = isLecturer
            ? a.student_matric_no ? `Matric: ${a.student_matric_no}` : "Student"
            : a.location || "Office";

          return {
            id: a.id,
            name: partyName,
            subtitle: partySub,
            date: a.appointment_date,
            dateDisplay: fmtDate(a.appointment_date),
            time: `${fmtTime(a.start_time)} – ${fmtTime(a.end_time)}`,
            purpose: a.purpose,
            status: displayStatus,
          };
        });
      }

      // Demo fallback mode
      return [
        {
          id: demoAppointments[0]?.id || "demo-1",
          name: demoAppointments[0]?.name || "Azlan Ibrahim",
          subtitle: demoAppointments[0]?.location || "Office · C-312",
          date: "2026-09-22",
          dateDisplay: formatDisplayDate("2026-09-22"),
          time: demoAppointments[0]?.time || "09:00 – 09:30",
          purpose: demoAppointments[0]?.purpose || "Discuss final year project architecture",
          status: "Completed",
        },
        {
          id: demoAppointments[1]?.id || "demo-2",
          name: demoAppointments[1]?.name || "Nadia Rahman",
          subtitle: demoAppointments[1]?.location || "Online consultation",
          date: "2026-08-11",
          dateDisplay: formatDisplayDate("2026-08-11"),
          time: demoAppointments[1]?.time || "14:00 – 14:30",
          purpose: demoAppointments[1]?.purpose || "Review software design proposal",
          status: "Cancelled",
        },
        {
          id: demoAppointments[2]?.id || "demo-3",
          name: demoAppointments[2]?.name || "Farid Hakim",
          subtitle: demoAppointments[2]?.location || "Office · B-118",
          date: "2026-07-04",
          dateDisplay: formatDisplayDate("2026-07-04"),
          time: demoAppointments[2]?.time || "11:00 – 11:30",
          purpose: demoAppointments[2]?.purpose || "Feedback on usability testing plan",
          status: "Rejected",
        },
      ];
    }, [hasToken, isPreview, realHistory, isLecturer]);

    const filtered = useMemo(() => {
      return historyList.filter((a) => {
        // Status filter
        if (status !== "All" && a.status.toLowerCase() !== status.toLowerCase()) {
          return false;
        }
        // Text search filter
        if (query.trim()) {
          const q = query.toLowerCase();
          const match =
            a.name.toLowerCase().includes(q) ||
            a.purpose.toLowerCase().includes(q) ||
            a.subtitle.toLowerCase().includes(q);
          if (!match) return false;
        }
        // Start date filter
        if (startDate && a.date < startDate) {
          return false;
        }
        // End date filter
        if (endDate && a.date > endDate) {
          return false;
        }
        return true;
      });
    }, [historyList, status, query, startDate, endDate]);

    return (
      <div>
        <PageHeader title="History" subtitle="Review your previous consultations and requests." />
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-card md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isLecturer ? "Search by student or purpose..." : "Search by lecturer or purpose..."}
              className="pl-9"
            />
          </div>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full md:w-44"
            title="Start date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full md:w-44"
            title="End date"
          />
        </div>
        <div className="mt-4 flex gap-2">
          {["All", "Completed", "Rejected", "Cancelled"].map((item) => (
            <Button
              key={item}
              size="sm"
              variant={status === item ? "default" : "outline"}
              onClick={() => setStatus(item)}
            >
              {item}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-8 flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-xl border bg-card p-8 text-center shadow-card">
            <EmptyState
              title="No consultations found"
              text={query || status !== "All" || startDate || endDate ? "Try clearing your search or filters." : "You have no past consultation history yet."}
            />
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border bg-card shadow-card">
            <div className="hidden grid-cols-[1.3fr_1fr_1fr_0.7fr] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <span>{isLecturer ? "Student" : "Lecturer"}</span>
              <span>Date & time</span>
              <span>Purpose</span>
              <span>Status</span>
            </div>
            {filtered.map((a) => (
              <div
                key={a.id}
                className="grid gap-3 border-b px-5 py-4 last:border-0 md:grid-cols-[1.3fr_1fr_1fr_0.7fr] md:items-center md:gap-4"
              >
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.subtitle}</p>
                </div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  {a.dateDisplay}
                  <span className="hidden lg:inline">· {a.time}</span>
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">{a.purpose}</p>
                <div>
                  <StatusPill
                    tone={
                      a.status === "Completed"
                        ? "success"
                        : a.status === "Rejected"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {a.status}
                  </StatusPill>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
});
