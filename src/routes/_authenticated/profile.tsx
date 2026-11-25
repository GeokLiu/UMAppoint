import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Mail,
  Phone,
  Save,
  UserRound,
  Building2,
  MapPin,
  GraduationCap,
  BookOpen,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, StatusPill } from "@/components/portal-ui";
import { apiGetProfile, apiUpdateProfile, getToken, type UserProfile } from "@/lib/backend";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — UMAppoint" }] }),
  component: function ProfilePage() {
    const { me, isPreview } = useAuth();
    const hasToken = typeof window !== "undefined" && !!getToken();
    const qc = useQueryClient();

    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Profile query
    const { data: dbProfile, isLoading } = useQuery({
      queryKey: ["profile"],
      queryFn: apiGetProfile,
      enabled: hasToken && !isPreview,
      staleTime: 60_000,
    });

    // Form state
    const isLecturer = (dbProfile?.role || me?.role) === "lecturer";

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    // Lecturer fields
    const [title, setTitle] = useState("");
    const [department, setDepartment] = useState("");
    const [officeLocation, setOfficeLocation] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [consultationInfo, setConsultationInfo] = useState("");
    // Student fields
    const [matricNo, setMatricNo] = useState("");
    const [programme, setProgramme] = useState("");
    const [yearOfStudy, setYearOfStudy] = useState("1");
    const [aboutYou, setAboutYou] = useState("");

    // Initialize state when profile is loaded or on auth change
    useEffect(() => {
      if (dbProfile) {
        setFullName(dbProfile.full_name || "");
        setPhone(dbProfile.phone || "+60 12 345 6789");
        if (dbProfile.role === "lecturer") {
          setTitle(dbProfile.title || "Dr.");
          setDepartment(dbProfile.department || "Department of Software Engineering");
          setOfficeLocation(dbProfile.office_location || "Block A, FCSIT");
          setSpecialization(dbProfile.specialization || "General Academic Advising");
          setConsultationInfo(
            dbProfile.consultation_info ||
              "Available for FYP supervision and coursework queries. Please bring specific questions.",
          );
        } else {
          setMatricNo(dbProfile.matric_no || "U2102345");
          setProgramme(dbProfile.programme || "Bachelor of Computer Science");
          setYearOfStudy(String(dbProfile.year_of_study || 1));
          setAboutYou("Student at Faculty of Computer Science & Information Technology, Universiti Malaya.");
        }
      } else if (me) {
        setFullName(me.full_name || "");
        setPhone("+60 12 345 6789");
        if (me.role === "lecturer") {
          setTitle("Assoc. Prof. Dr.");
          setDepartment("Department of Artificial Intelligence");
          setOfficeLocation("Block A, Level 3, Room A3-12");
          setSpecialization("Machine Learning, Natural Language Processing, Malay NLP");
          setConsultationInfo(
            "Available for FYP supervision and ML coursework queries. Please bring your draft or code.",
          );
        } else {
          setMatricNo("U2102345");
          setProgramme("Bachelor of Computer Science (Software Engineering)");
          setYearOfStudy("3");
          setAboutYou("Final year student interested in building reliable and accessible software.");
        }
      }
    }, [dbProfile, me]);

    async function handleSave() {
      setIsSaving(true);
      try {
        if (hasToken && !isPreview) {
          const payload: Partial<UserProfile> = {
            full_name: fullName,
            phone,
          };
          if (isLecturer) {
            payload.title = title;
            payload.department = department;
            payload.office_location = officeLocation;
            payload.specialization = specialization;
            payload.consultation_info = consultationInfo;
          } else {
            payload.matric_no = matricNo;
            payload.programme = programme;
            payload.year_of_study = parseInt(yearOfStudy, 10) || 1;
          }

          await apiUpdateProfile(payload);
          await qc.invalidateQueries({ queryKey: ["profile"] });
        }
        setSaved(true);
        toast.success("Profile updated successfully");
        setTimeout(() => setSaved(false), 3000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update profile";
        toast.error(msg);
      } finally {
        setIsSaving(false);
      }
    }

    const initials = (fullName || me?.full_name || "UM")
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const displayEmail = dbProfile?.email || me?.email || "user@um.edu.my";

    return (
      <div>
        <PageHeader
          title="Profile"
          subtitle="Manage your personal information and consultation details."
        />
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Left aside card with complete readability and natural wrapping */}
          <aside className="h-fit rounded-xl border bg-card p-6 text-center shadow-card">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-2xl font-bold text-primary">
              {initials}
            </div>
            <p className="mt-4 font-semibold text-foreground break-words">{fullName || me?.full_name || "User"}</p>
            <div className="mt-2 flex justify-center">
              <StatusPill tone="info">{isLecturer ? "Lecturer" : "Student"}</StatusPill>
            </div>

            <div className="mt-5 space-y-3.5 border-t pt-4 text-left text-sm">
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <span className="text-xs break-all leading-relaxed select-all">
                  {displayEmail}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-xs">{phone}</span>
              </div>

              {isLecturer ? (
                <>
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span className="text-xs break-words leading-relaxed">
                      {department || "Faculty of Computer Science & IT"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span className="text-xs break-words leading-relaxed">
                      {officeLocation || "FCSIT, Universiti Malaya"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-xs font-medium">Matric: {matricNo}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <BookOpen className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span className="text-xs break-words leading-relaxed">
                      {programme}
                    </span>
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Right form section */}
          <section className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3 border-b pb-4">
              <UserRound className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Personal information</h2>
                <p className="text-sm text-muted-foreground">
                  {isLecturer
                    ? "Manage your faculty credentials and consultation instructions."
                    : "Keep your student information and study details up to date."}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isLecturer ? (
              /* Lecturer Form */
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Academic Title">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Assoc. Prof. Dr., Dr., Prof."
                    />
                  </Field>
                  <Field label="Full Name">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Email Address">
                    <Input value={displayEmail} disabled className="bg-muted cursor-not-allowed" />
                  </Field>
                  <Field label="Phone Number">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+60 12 345 6789"
                    />
                  </Field>
                  <Field label="Department">
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Department of Artificial Intelligence"
                    />
                  </Field>
                  <Field label="Office Location">
                    <Input
                      value={officeLocation}
                      onChange={(e) => setOfficeLocation(e.target.value)}
                      placeholder="e.g. Block A, Level 3, Room A3-12"
                    />
                  </Field>
                </div>
                <Field label="Specialization & Research Interests">
                  <Input
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Machine Learning, Natural Language Processing"
                  />
                </Field>
                <Field label="Consultation Guidelines & Instructions for Students">
                  <Textarea
                    rows={4}
                    value={consultationInfo}
                    onChange={(e) => setConsultationInfo(e.target.value)}
                    placeholder="Provide guidance to students booking consultations with you..."
                  />
                </Field>
              </div>
            ) : (
              /* Student Form */
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full Name">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Email Address">
                    <Input value={displayEmail} disabled className="bg-muted cursor-not-allowed" />
                  </Field>
                  <Field label="Phone Number">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+60 12 345 6789"
                    />
                  </Field>
                  <Field label="Matric Number">
                    <Input
                      value={matricNo}
                      onChange={(e) => setMatricNo(e.target.value)}
                      placeholder="e.g. U2102345"
                    />
                  </Field>
                  <Field label="Programme">
                    <Input
                      value={programme}
                      onChange={(e) => setProgramme(e.target.value)}
                      placeholder="e.g. Bachelor of Computer Science (Software Engineering)"
                    />
                  </Field>
                  <Field label="Year of Study">
                    <Input
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      placeholder="e.g. 1, 2, 3, 4"
                    />
                  </Field>
                </div>
                <Field label="About You">
                  <Textarea
                    rows={3}
                    value={aboutYou}
                    onChange={(e) => setAboutYou(e.target.value)}
                    placeholder="Brief description about your academic interests..."
                  />
                </Field>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
              {saved && (
                <span className="flex items-center gap-1 text-sm text-success">
                  <Check className="h-4 w-4" />
                  Changes saved
                </span>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  },
});
