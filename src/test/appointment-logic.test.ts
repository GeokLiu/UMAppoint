import { describe, expect, it } from "vitest";

describe("Appointment Title & Name Normalization", () => {
  function formatLecturerName(title?: string | null, name?: string | null) {
    if (!name) return "";
    const cleanTitle = (title || "").trim();
    if (!cleanTitle) return name;
    if (name.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
      return name;
    }
    return `${cleanTitle} ${name}`;
  }

  it("prepends title if name does not already contain it", () => {
    expect(formatLecturerName("Dr.", "Nadia Rahman")).toBe("Dr. Nadia Rahman");
    expect(formatLecturerName("Prof.", "Azlan Ibrahim")).toBe("Prof. Azlan Ibrahim");
  });

  it("prevents duplicate titles (e.g. Dr. Dr. or Prof. Prof.)", () => {
    expect(formatLecturerName("Dr.", "Dr. Nadia Rahman")).toBe("Dr. Nadia Rahman");
    expect(formatLecturerName("Prof.", "Prof. Azlan Ibrahim")).toBe("Prof. Azlan Ibrahim");
  });

  it("handles null or missing title gracefully", () => {
    expect(formatLecturerName(null, "Nadia Rahman")).toBe("Nadia Rahman");
    expect(formatLecturerName(undefined, "Nadia Rahman")).toBe("Nadia Rahman");
  });
});

describe("Appointment Status Categorization", () => {
  const ACTIVE_STATUSES = [
    "pending",
    "approved",
    "cancellation_requested",
    "rescheduling_requested",
  ];

  const HISTORICAL_STATUSES = ["completed", "rejected", "cancelled"];

  it("correctly identifies active consultations", () => {
    expect(ACTIVE_STATUSES.includes("pending")).toBe(true);
    expect(ACTIVE_STATUSES.includes("approved")).toBe(true);
    expect(ACTIVE_STATUSES.includes("cancellation_requested")).toBe(true);
    expect(ACTIVE_STATUSES.includes("completed")).toBe(false);
  });

  it("correctly identifies historical consultations", () => {
    expect(HISTORICAL_STATUSES.includes("completed")).toBe(true);
    expect(HISTORICAL_STATUSES.includes("rejected")).toBe(true);
    expect(HISTORICAL_STATUSES.includes("cancelled")).toBe(true);
    expect(HISTORICAL_STATUSES.includes("approved")).toBe(false);
  });
});
