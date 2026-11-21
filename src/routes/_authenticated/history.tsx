import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Search, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { demoAppointments, formatDisplayDate, StatusPill } from "@/components/portal-ui";
import { useAuth } from "@/lib/auth";
import {
  apiGetMyAppointments,
  apiGetLecturerAppointments,
  fmtDate,
  fmtTime,
  getToken,
  type AppointmentOut,
} from "@/lib/backend";

interface HistoryItem {
  id: string;
  name: string;
  title: string;
  date: string;
  time: string;
  location: string;
  purpose: string;
  status: string;
}

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — UMAppoint" }] }),
  component: function HistoryPage() {
    const { me, isPreview } = useAuth();
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("All");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const hasToken = !!getToken();
    const isLecturer = me?.role === "lecturer";

    const { data: realAppointments, isLoading } = useQuery({
      queryKey: ["history-appointments", isLecturer ? "lecturer" : "student"],
      queryFn: () => (isLecturer ? apiGetLecturerAppointments() : apiGetMyAppointments()),
      enabled: !isPreview && hasToken,
      retry: false,
    });

    const items: HistoryItem[] = useMemo(() => {
      if (realAppointments && realAppointments.length > 0) {
        return realAppointments.map((a: AppointmentOut) => ({
          id: a.id,
          name: isLecturer ? a.student_name || "Student" : a.lecturer_name || "Lecturer",
          title: isLecturer ? "" : a.lecturer_title || "Dr.",
          date: a.appointment_date,
          time: `${fmtTime(a.start_time)} – ${fmtTime(a.end_time)}`,
          location: a.location || "Office consultation",
          purpose: a.purpose,
          status: a.status.charAt(0).toUpperCase() + a.status.slice(1).toLowerCase(),
        }));
      }

      const past = [
        { ...demoAppointments[0]!, date: "2026-09-22", status: "Completed" },
        { ...demoAppointments[1]!, date: "2026-08-11", status: "Cancelled" },
        { ...demoAppointments[2]!, date: "2026-07-04", status: "Rejected" },
      ];

      return past.map((d) => ({
        id: d.id,
        name: d.name,
        title: d.title,
        date: d.date,
        time: d.time,
        location: d.location,
        purpose: d.purpose,
        status: d.status,
      }));
    }, [realAppointments, isLecturer]);

    const filtered = useMemo(() => {
      return items.filter((a) => {
        const matchesStatus = status === "All" || a.status.toLowerCase() === status.toLowerCase();
        const matchesQuery = `${a.title} ${a.name} ${a.purpose}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesStart = !startDate || a.date >= startDate;
        const matchesEnd = !endDate || a.date <= endDate;

        return matchesStatus && matchesQuery && matchesStart && matchesEnd;
      });
    }, [items, status, query, startDate, endDate]);

    return (
      <div>
        <PageHeader title="History" subtitle="Review your previous consultations and requests." />

        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-card md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or purpose..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full md:w-40"
              title="From date"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full md:w-40"
              title="To date"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["All", "Completed", "Approved", "Rejected", "Cancelled"].map((item) => (
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
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed bg-card p-12 text-center">
            <p className="font-medium text-foreground">No consultations found in history</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search query, status filters, or date range.
            </p>
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
                  <p className="font-medium">
                    {a.title ? `${a.title} ` : ""}
                    {a.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.location}</p>
                </div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {fmtDate(a.date) || formatDisplayDate(a.date)}
                  <span className="hidden lg:inline">· {a.time}</span>
                </p>
                <p className="text-sm text-muted-foreground">{a.purpose}</p>
                <div>
                  <StatusPill
                    tone={
                      a.status.toLowerCase() === "completed"
                        ? "success"
                        : a.status.toLowerCase() === "rejected"
                          ? "danger"
                          : a.status.toLowerCase() === "approved"
                            ? "success"
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
