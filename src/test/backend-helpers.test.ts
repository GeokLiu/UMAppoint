import { describe, expect, it, beforeEach } from "vitest";
import {
  fmtDate,
  fmtTime,
  getToken,
  setAuth,
  clearAuth,
  getStoredUser,
  type StoredUser,
} from "@/lib/backend";

describe("Backend Helper Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("fmtDate", () => {
    it("formats ISO date string into DD MMM YYYY format", () => {
      const formatted = fmtDate("2026-11-25");
      expect(formatted).toBe("25 Nov 2026");
    });

    it("returns empty string when input is empty or null", () => {
      expect(fmtDate("")).toBe("");
    });
  });

  describe("fmtTime", () => {
    it("formats HH:MM:SS to HH:MM", () => {
      expect(fmtTime("14:30:00")).toBe("14:30");
      expect(fmtTime("09:00:00")).toBe("09:00");
    });

    it("returns empty string if input is empty", () => {
      expect(fmtTime("")).toBe("");
    });
  });

  describe("Authentication Token Management", () => {
    it("stores and retrieves auth token and user in localStorage", () => {
      const dummyUser: StoredUser = {
        user_id: "u-123",
        role: "student",
        full_name: "Muhammad Aiman",
        email: "aiman.student@demo.umappoint.edu",
      };

      setAuth("dummy-jwt-token-xyz", dummyUser);

      expect(getToken()).toBe("dummy-jwt-token-xyz");
      expect(getStoredUser()).toEqual(dummyUser);
    });

    it("clears auth token and user on clearAuth()", () => {
      const dummyUser: StoredUser = {
        user_id: "u-456",
        role: "lecturer",
        full_name: "Dr. Nurul",
        email: "nurul@demo.umappoint.edu",
      };

      setAuth("token-to-be-cleared", dummyUser);
      clearAuth();

      expect(getToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });
  });
});
