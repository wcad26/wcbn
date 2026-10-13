import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Crown,
  Heart,
  Printer,
  Scale,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIdentity } from "@/lib/wcbn";

export const Route = createFileRoute("/portal/covenant")({ component: CovenantPage });

const CLAUSES = [
  {
    number: "I",
    title: "Christ at the Centre",
    scripture: "Colossians 3:23-24",
    lead: "Stewardship over Ownership",
    body: "I acknowledge God as the ultimate owner of all resources and myself as a faithful steward. I commit to lead my enterprise honouring Christ in every contract, negotiation, boardroom decision, and customer interaction, seeking first the Kingdom of God and His righteousness in the marketplace.",
    icon: Crown,
  },
  {
    number: "II",
    title: "Integrity Without Exception",
    scripture: "Proverbs 11:1",
    lead: "Absolute Truth in Commerce",
    body: "I will refuse bribery, fraud, tax evasion, deceit, and exploitative practices—whatever the cost to short-term profits or personal standing. My word is my bond, and my commercial reporting shall remain transparent, lawful, and upright before God and society.",
    icon: Scale,
  },
  {
    number: "III",
    title: "Excellence in Enterprise",
    scripture: "Daniel 6:3",
    lead: "Benchmark Operational Standards",
    body: "I will pursue superior quality, rigorous corporate governance, innovation, and sustainable practices. My enterprise shall be managed with such distinction and diligence that it becomes a benchmark worth imitating by peers and a beacon of light in our industry.",
    icon: Sparkles,
  },
  {
    number: "IV",
    title: "People Before Profit",
    scripture: "Leviticus 19:13",
    lead: "Human Dignity & Fair Labour",
    body: "I will honour the dignity of every employee, vendor, and client. I commit to paying fair living wages on time, nurturing employee growth, creating safe and uplifting workplaces, and mentoring the next generation of business leaders.",
    icon: Heart,
  },
  {
    number: "V",
    title: "Measurable Impact",
    scripture: "Matthew 5:16",
    lead: "Tangible Community Transformation",
    body: "Enterprise is our vehicle to alleviate poverty, create dignified jobs, and solve pressing societal challenges. I commit to establish clear annual impact targets, support local communities, and report our progress with complete accountability through the WCBN Impact Index.",
    icon: Award,
  },
  {
    number: "VI",
    title: "Loyalty to the Fellowship",
    scripture: "Ecclesiastes 4:9-10",
    lead: "Kingdom Brotherhood & Mutual Elevation",
    body: "I will actively participate in the World Changers Association and my assigned Destiny Care Group (DCG). I commit to contribute wisdom, trade opportunities, and mentorship to my fellow members—never using the network solely for selfish extraction, but to elevate our collective economic strength.",
    icon: Users,
  },
];

export function CovenantPage() {
  const { data: identity } = useIdentity();

  const handlePrint = () => {
    const el = document.getElementById("wcbn-covenant-charter");
    if (!el) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>WCBN Covenant Charter - ${identity?.fullName || "Member"}</title>
          <style>
            @page { margin: 15mm; size: A4; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: system-ui, -apple-system, sans-serif; color: #0F172A; background: #fff; line-height: 1.5; padding: 0; margin: 0; }
            .charter-card { border: 2px solid #059669; padding: 24px; border-radius: 16px; }
            .header-box { text-align: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 16px; margin-bottom: 20px; }
            .gold-badge { font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.15em; color: #059669; }
            .title { font-size: 24px; font-weight: 800; color: #0B0F19; margin: 8px 0 4px; }
            .preamble { font-size: 12px; font-style: italic; color: #475569; max-width: 600px; margin: 0 auto; }
            .pillar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
            .pillar { border: 1px solid #E2E8F0; padding: 12px; border-radius: 12px; }
            .pillar-title { font-size: 13px; font-weight: bold; color: #0F172A; }
            .pillar-scripture { font-size: 10px; color: #059669; font-weight: 600; margin-bottom: 4px; }
            .pillar-body { font-size: 10.5px; color: #334155; line-height: 1.4; }
            .ratification { margin-top: 24px; border-top: 2px dashed #CBD5E1; padding-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; }
            .signature-box { text-align: right; }
          </style>
        </head>
        <body>
          <div class="charter-card">
            <div class="header-box">
              <span class="gold-badge">WORLD CHANGERS BUSINESS NETWORK</span>
              <h1 class="title">THE SACRED COVENANT CHARTER</h1>
              <p class="preamble">"Consecrated in purpose, united in enterprise, and held to the highest standard of Kingdom stewardship in the marketplace."</p>
            </div>
            <div class="pillar-grid">
              ${CLAUSES.map(
                (c) => `
                <div class="pillar">
                  <div class="pillar-title">${c.number}. ${c.title}</div>
                  <div class="pillar-scripture">${c.scripture} · ${c.lead}</div>
                  <div class="pillar-body">${c.body}</div>
                </div>
              `
              ).join("")}
            </div>
            <div class="ratification">
              <div>
                <strong>Member:</strong> ${identity?.fullName || "—"}<br/>
                <strong>Category:</strong> ${identity?.wcbnMember?.category || "Enterprise"}<br/>
                <strong>Member ID:</strong> ${identity?.member?.member_id || "WCBN-MEMBER"}
              </div>
              <div class="signature-box">
                <strong>Ratified & Affirmed</strong><br/>
                Inducted: ${identity?.wcbnMember?.inducted_at ? new Date(identity.wcbnMember.inducted_at).toLocaleDateString() : "Active Member"}<br/>
                World Changers Association
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 300);
  };

  return (
    <MemberPage
      title="The WCBN Covenant Charter"
      description="The foundational standard of Kingdom ethics, integrity, and mutual stewardship solemnly affirmed by every member of the World Changers Business Network."
      action={
        <Button onClick={handlePrint} variant="outline" className="gap-2 rounded-xl shadow-sm">
          <Printer className="size-4 text-primary" />
          <span>Print / Export Charter</span>
        </Button>
      }
    >
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main Covenant Parchment Document */}
        <div className="lg:col-span-8">
          <div
            id="wcbn-covenant-charter"
            className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-card p-6 sm:p-10 shadow-xl"
          >
            {/* Elegant Corner Embellishments */}
            <div className="absolute right-0 top-0 size-32 bg-primary/5 rounded-bl-full pointer-events-none" />
            <div className="absolute left-0 bottom-0 size-32 bg-amber-500/5 rounded-tr-full pointer-events-none" />

            {/* Document Header */}
            <div className="relative text-center border-b border-border/80 pb-8 space-y-3">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl gradient-brand text-primary-foreground shadow-md ring-4 ring-primary/20">
                <ScrollText className="size-8" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  World Changers Business Network
                </span>
                <h2 className="mt-1 font-serif text-3xl font-extrabold text-foreground sm:text-4xl tracking-tight">
                  The Sacred Covenant
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm italic text-muted-foreground leading-relaxed">
                  "Consecrated in purpose, united in enterprise, and held to the highest standard of Kingdom excellence in the marketplace."
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Formally Ratified Upon Membership Induction</span>
              </div>
            </div>

            {/* The Six Pillars */}
            <div className="relative mt-8 space-y-6">
              {CLAUSES.map((clause) => {
                const Icon = clause.icon;
                return (
                  <div
                    key={clause.number}
                    className="group rounded-2xl border border-border/70 bg-muted/20 p-5 transition hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl gradient-brand font-mono text-sm font-bold text-primary-foreground shadow-sm">
                        {clause.number}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <span>{clause.title}</span>
                          </h3>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-primary">{clause.lead}</span>
                            <span className="text-muted-foreground">({clause.scripture})</span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/90 transition">
                          {clause.body}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Seal & Ratification Block */}
            <div className="mt-10 pt-6 border-t border-border/80 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-8 text-primary" />
                <div>
                  <p className="font-bold text-foreground">World Changers Association</p>
                  <p className="text-[11px]">Charter maintained under leadership council oversight</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">Member: {identity?.fullName}</p>
                <p className="text-[11px]">Category: {identity?.wcbnMember?.category || "Enterprise"} Track</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Membership Affirmation Details */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-border/60">
              <ShieldCheck className="size-5 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">
                Affirmation Credentials
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Covenant Standing:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5 text-sm">
                  <CheckCircle2 className="size-4" /> Ratified & In Good Standing
                </span>
              </div>

              <div className="pt-2 border-t border-border/60">
                <span className="text-muted-foreground block text-[11px]">Member Name:</span>
                <strong className="text-foreground text-sm block mt-0.5">{identity?.fullName}</strong>
              </div>

              <div className="pt-2 border-t border-border/60">
                <span className="text-muted-foreground block text-[11px]">Membership Track:</span>
                <span className="font-semibold text-foreground block mt-0.5">
                  {identity?.wcbnMember?.category || "Enterprise"} · {identity?.wcbnMember?.member_type || "Business"}
                </span>
              </div>

              <div className="pt-2 border-t border-border/60">
                <span className="text-muted-foreground block text-[11px]">Induction Status:</span>
                <span className="font-semibold text-foreground block mt-0.5">
                  {identity?.wcbnMember?.inducted_at
                    ? new Date(identity.wcbnMember.inducted_at).toLocaleDateString()
                    : "Active Member"}
                </span>
              </div>

              <div className="pt-2 border-t border-border/60">
                <span className="text-muted-foreground block text-[11px]">WCA Member ID:</span>
                <span className="font-mono text-xs font-semibold text-foreground block mt-0.5">
                  {identity?.member?.member_id || "WCA-VERIFIED"}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60">
              <Button onClick={handlePrint} className="w-full rounded-xl gap-2 shadow-sm font-semibold">
                <Printer className="size-4" />
                <span>Print Official Charter</span>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-3">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <span>Living the Covenant</span>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every business review and revalidation in the network references these six pillars. The Covenant is not merely symbolic; it is the moral bedrock of our collaborative prosperity.
            </p>
          </div>
        </div>
      </div>
    </MemberPage>
  );
}
