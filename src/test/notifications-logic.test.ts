import { describe, expect, it } from "vitest";

function formatTimeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function getNotificationTone(title: string) {
  const t = title.toLowerCase();
  if (t.includes("approved") || t.includes("completed")) {
    return "success";
  }
  if (t.includes("cancellation") || t.includes("reschedule") || t.includes("action") || t.includes("request")) {
    return "warning";
  }
  if (t.includes("rejected") || t.includes("cancelled")) {
    return "danger";
  }
  return "info";
}

describe("Notification Logic & Formatting", () => {
  describe("formatTimeAgo", () => {
    it("returns 'Just now' for timestamps within the last minute", () => {
      const now = new Date().toISOString();
      expect(formatTimeAgo(now)).toBe("Just now");
    });

    it("formats minutes ago accurately", () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(formatTimeAgo(tenMinsAgo)).toBe("10 mins ago");
    });

    it("formats hours ago accurately", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      expect(formatTimeAgo(twoHoursAgo)).toBe("2 hours ago");
    });

    it("returns empty string when input is missing", () => {
      expect(formatTimeAgo(undefined)).toBe("");
    });
  });

  describe("getNotificationTone", () => {
    it("maps approved and completed notifications to success tone", () => {
      expect(getNotificationTone("Appointment approved")).toBe("success");
      expect(getNotificationTone("Consultation completed")).toBe("success");
    });

    it("maps cancellation requests to warning tone", () => {
      expect(getNotificationTone("Cancellation requested")).toBe("warning");
      expect(getNotificationTone("New reschedule request")).toBe("warning");
    });

    it("maps rejected or cancelled notifications to danger tone", () => {
      expect(getNotificationTone("Appointment rejected")).toBe("danger");
      expect(getNotificationTone("Appointment cancelled")).toBe("danger");
    });

    it("defaults other notifications to info tone", () => {
      expect(getNotificationTone("Profile updated")).toBe("info");
      expect(getNotificationTone("General Announcement")).toBe("info");
    });
  });
});
