import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureWcbnMember, useIdentity, useInvalidateIdentity } from "@/lib/wcbn";

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
  const refresh = useInvalidateIdentity();
  const accepted = identity?.wcbnMember?.covenant_accepted_at ?? null;

  const accept = useMutation({
    mutationFn: async () => {
      if (!identity) throw new Error("Not signed in");
      await ensureWcbnMember(identity);
      const { error } = await supabase.rpc("wcbn_accept_covenant");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Covenant accepted. Thank you."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MemberPage title="The WCBN Covenant" description="Accepted on joining, and the standard every member is held to through annual revalidation.">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <ol className="space-y-6">
            {CLAUSES.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl gradient-brand text-xs font-bold text-white">{i + 1}</span>
                <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Covenant status</h2>
            {accepted ? (
              <p className="mt-4 flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />Accepted on {new Date(accepted).toLocaleDateString()}.</p>
            ) : (
              <>
                <p className="mt-4 text-sm text-muted-foreground">Read the six clauses, then record your acceptance. Your acceptance is stored with your membership record.</p>
                <Button className="mt-4 w-full" disabled={accept.isPending} onClick={() => accept.mutate()}>
                  {accept.isPending ? <Loader2 className="animate-spin" /> : <ScrollText />}I accept the Covenant
                </Button>
              </>
            )}
            <p className="mt-4 text-xs text-muted-foreground">Member: {identity?.fullName}</p>
            <p className="text-xs text-muted-foreground">Category: {identity?.wcbnMember?.category ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Inducted: {identity?.wcbnMember?.inducted_at ? new Date(identity.wcbnMember.inducted_at).toLocaleDateString() : "—"}</p>
            <p className="text-xs text-muted-foreground">Next review: {identity?.wcbnMember?.next_review_date ?? "—"}</p>
          </div>
        </aside>
      </div>
    </MemberPage>
  );
}
