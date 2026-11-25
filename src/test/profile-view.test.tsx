import { describe, expect, it } from "vitest";

describe("Profile Role Field Isolation", () => {
  interface BaseProfile {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    role: "student" | "lecturer";
  }

  interface LecturerProfile extends BaseProfile {
    role: "lecturer";
    title: string;
    department: string;
    office_location: string;
    specialization: string;
    consultation_info: string;
  }

  interface StudentProfile extends BaseProfile {
    role: "student";
    matric_no: string;
    programme: string;
    year_of_study: number;
  }

  const mockLecturer: LecturerProfile = {
    id: "l-1",
    email: "nurul.hakim@demo.umappoint.edu",
    full_name: "Nurul Hakimah binti Azman",
    phone: "+60 12 345 6789",
    role: "lecturer",
    title: "Assoc. Prof. Dr.",
    department: "Department of Artificial Intelligence",
    office_location: "Block A, Level 3, Room A3-12",
    specialization: "Machine Learning, NLP",
    consultation_info: "Available for FYP supervision.",
  };

  const mockStudent: StudentProfile = {
    id: "s-1",
    email: "aiman.student@demo.umappoint.edu",
    full_name: "Muhammad Aiman bin Rosli",
    phone: "+60 12 345 6789",
    role: "student",
    matric_no: "U2102345",
    programme: "Bachelor of Computer Science",
    year_of_study: 3,
  };

  it("verifies lecturer profile does not contain student-specific fields", () => {
    expect(mockLecturer.role).toBe("lecturer");
    expect("matric_no" in mockLecturer).toBe(false);
    expect("programme" in mockLecturer).toBe(false);
    expect("year_of_study" in mockLecturer).toBe(false);

    expect(mockLecturer.title).toBe("Assoc. Prof. Dr.");
    expect(mockLecturer.department).toBe("Department of Artificial Intelligence");
  });

  it("verifies student profile does not contain lecturer-specific fields", () => {
    expect(mockStudent.role).toBe("student");
    expect("title" in mockStudent).toBe(false);
    expect("office_location" in mockStudent).toBe(false);
    expect("consultation_info" in mockStudent).toBe(false);

    expect(mockStudent.matric_no).toBe("U2102345");
    expect(mockStudent.programme).toBe("Bachelor of Computer Science");
  });
});
