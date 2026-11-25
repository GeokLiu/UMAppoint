import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "@/components/portal-ui";
import { PageHeader, EmptyState } from "@/components/PageHeader";

describe("Portal UI Components", () => {
  describe("StatusPill", () => {
    it("renders children text accurately", () => {
      render(<StatusPill tone="success">Approved</StatusPill>);
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("applies proper color classes based on tone", () => {
      const { container: successEl } = render(<StatusPill tone="success">Active</StatusPill>);
      expect(successEl.firstChild).toHaveClass("bg-success-soft");

      const { container: dangerEl } = render(<StatusPill tone="danger">Cancelled</StatusPill>);
      expect(dangerEl.firstChild).toHaveClass("bg-danger-soft");

      const { container: warningEl } = render(<StatusPill tone="warning">Pending</StatusPill>);
      expect(warningEl.firstChild).toHaveClass("bg-warning-soft");
    });
  });

  describe("PageHeader", () => {
    it("renders title and optional subtitle", () => {
      render(
        <PageHeader
          title="History"
          subtitle="Review previous consultations and requests."
        />
      );
      expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
      expect(screen.getByText("Review previous consultations and requests.")).toBeInTheDocument();
    });
  });

  describe("EmptyState", () => {
    it("renders empty state title and text", () => {
      render(
        <EmptyState
          title="No consultations found"
          text="You have no past consultation history yet."
        />
      );
      expect(screen.getByText("No consultations found")).toBeInTheDocument();
      expect(screen.getByText("You have no past consultation history yet.")).toBeInTheDocument();
    });
  });
});
