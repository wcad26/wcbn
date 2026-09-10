import { createFileRoute } from "@tanstack/react-router";
import { MemberPage } from "@/components/wcbn/admin-page";
import { useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal_/covenant")({ component: CovenantPage });

const CLAUSES = [
  ["Christ at the centre", "I will lead my enterprise as a steward, honouring Christ in every decision, contract and relationship."],
  ["Integrity without exception", "I will refuse bribery, fraud, exploitation and deception, whatever the cost to profit or position."],
  ["Excellence in enterprise", "I will pursue quality, sound governance and sustainable growth so that my business is worth imitating."],
  ["People before profit", "I will treat employees, suppliers and customers with dignity, paying fairly and developing others."],
  ["Measurable impact", "I will pursue the impact commitment I have made and report it honestly each year."],
  ["Loyalty to the family", "I will remain active in the World Changers Association and my DCG, and contribute to the network, not only draw from it."],
];

function CovenantPage() {
  const { data: identity } = useIdentity();
  return (
    <MemberPage title="The WCBN Covenant" description="Signed at induction, and the standard every member is held to through annual revalidation.">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <ol className="space-y-6">
            {CLAUSES.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl gradient-brand text-xs font-bold text-primary-foreground">{i + 1}</span>
                <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <aside className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Covenant status</h2>
          <p className="mt-4 text-sm">{identity?.wcbnMember?.inducted_at
            ? `Signed at induction on ${new Date(identity.wcbnMember.inducted_at).toLocaleDateString()}.`
            : "You will sign the Covenant at induction, once your application is approved."}</p>
          <p className="mt-4 text-xs text-muted-foreground">Member: {identity?.fullName}</p>
          <p className="text-xs text-muted-foreground">Category: {identity?.wcbnMember?.category ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Next review: {identity?.wcbnMember?.next_review_date ?? "—"}</p>
        </aside>
      </div>
    </MemberPage>
  );
}
