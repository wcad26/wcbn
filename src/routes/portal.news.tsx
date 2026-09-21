import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { POST_FIELDS, postDate, postTypeLabel, type WcbnPost } from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal/news")({ component: PortalNews });

function PortalNews() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["portal", "posts"],
    queryFn: async () => (await supabase.from("wcbn_posts").select(POST_FIELDS)
      .eq("status", "published")
      .order("is_pinned", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false })).data as WcbnPost[] ?? [],
  });

  return (
    <MemberPage title="News & announcements" description="Everything leadership is announcing to the network, newest first.">
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}</div>
      ) : posts.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} to="/portal/news/$slug" params={{ slug: p.slug }} className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-lg">
              <div className="relative h-36 bg-muted">
                {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="h-full w-full gradient-brand" />}
                <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-primary">{postTypeLabel(p.post_type)}</span>
                {p.is_pinned && <span className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-accent text-accent-foreground"><Pin className="size-3.5" /></span>}
              </div>
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{postDate(p)}</p>
                <h3 className="mt-2 font-bold leading-snug">{p.title}</h3>
                {p.summary && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.summary}</p>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">No announcements yet. New posts from leadership will appear here.</p>
      )}
    </MemberPage>
  );
}
