import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Layers, ShieldCheck } from "lucide-react";
import { AdminPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/criteria")({ component: CriteriaPage });

function CriteriaPage() {
  return (
    <AdminPage
      title="Vetting & Onboarding Architecture"
      description="Streamlined category-driven criteria for Entrepreneurs and Investors & Mentors."
    >
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-card text-center space-y-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Layers className="size-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Criteria Are Now Category & Track-Driven
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The manual numeric scoring matrix has been replaced with smart, streamlined criteria configured directly on each Membership Category.
            Applicants are dynamically classified into <strong>Entrepreneurs</strong> or <strong>Investors & Mentors</strong>, and their applications are evaluated directly in the Vetting Workstation.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-left pt-2">
          <div className="rounded-2xl border border-border p-4 bg-background space-y-1">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" /> Category Management
            </p>
            <p className="text-xs text-muted-foreground">
              Configure tracks, fees, benefits, and target audiences for all categories.
            </p>
            <div className="pt-2">
              <Link to="/admin/categories">
                <Button size="sm" variant="outline" className="w-full text-xs gap-1">
                  Go to Categories <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4 bg-background space-y-1">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" /> Applications Vetting
            </p>
            <p className="text-xs text-muted-foreground">
              Review entrepreneur ventures and investor/mentor questionnaires directly.
            </p>
            <div className="pt-2">
              <Link to="/admin/applications">
                <Button size="sm" className="w-full text-xs gap-1">
                  Vetting Workstation <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
