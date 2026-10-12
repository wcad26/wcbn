import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Globe2, HelpCircle, Mail } from "lucide-react";
import { PublicPage } from "@/components/wcbn/public-page";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact WCBN | World Changers Business Network" },
    { name: "description", content: "Contact the World Changers Business Network team for membership, partnerships and support." },
    { property: "og:title", content: "Contact WCBN" },
    { property: "og:description", content: "Connect with the World Changers Business Network." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Contact,
});

const faqs = [
  ["Who can join?", "Active WCA members who belong to an active Destiny Care Group (DCG)."],
  ["Do I need a new account?", "No. Sign in with your existing WCA account."],
  ["How do I pay my fee?", "By mobile money, bank card or bank transfer — yearly, half-yearly or quarterly."],
];

function Contact() {
  return (
    <PublicPage eyebrow="Contact" title="Let's build meaningful change together." intro="For partnerships, membership support and network enquiries, reach the WCBN team.">
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-20 md:grid-cols-3 lg:px-8">
        <Card icon={<Mail />} title="General enquiries" copy="Our contact details will be published here soon." />
        <Card icon={<Globe2 />} title="Global network" copy="Present through WCA regions and Destiny Care Groups worldwide." />
        <div className="rounded-3xl gradient-brand p-7 text-primary-foreground shadow-soft">
          <h2 className="text-xl font-bold">Ready to join?</h2>
          <p className="mt-2 text-sm text-primary-foreground/80">See the categories and fees, then apply.</p>
          <Link to="/membership" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">View membership <ArrowRight className="size-4" /></Link>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-5 pb-24 lg:px-8">
        <h2 className="flex items-center gap-2 text-2xl font-bold"><HelpCircle className="text-primary" /> Common questions</h2>
        <div className="mt-6 divide-y divide-border rounded-3xl border border-border bg-card">
          {faqs.map(([q, a]) => (
            <div key={q} className="p-6"><p className="font-semibold">{q}</p><p className="mt-1 text-sm text-muted-foreground">{a}</p></div>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}

function Card({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-7 shadow-card">
      <span className="text-primary">{icon}</span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}
