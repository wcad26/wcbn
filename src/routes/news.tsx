import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import { PublicPage } from "@/components/wcbn/public-page";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { POST_FIELDS, postDate, postTypeLabel, type WcbnPost } from "@/lib/wcbn-content";
import network from "@/assets/wcbn-network.jpg";

export const Route = createFileRoute("/news")({
  head: () => ({ meta: [
    { title: "News & Announcements | WCBN" },
    { name: "description", content: "Announcements, stories and insight from the World Changers Business Network." },
    { property: "og:title", content: "WCBN News & Announcements" },
    { property: "og:description", content: "Announcements, stories and insight from the World Changers Business Network." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: NewsPage,
});

function NewsPage() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["public", "posts"],
    queryFn: async () => (await supabase.from("wcbn_posts").select(POST_FIELDS)
      .eq("status", "published").eq("audience", "public")
      .order("is_pinned", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false })).data as WcbnPost[] ?? [],
  });

  return (
    <PublicPage eyebrow="Newsroom" title="News & announcements" image={network}
      intro="What the World Changers Business Network is saying, celebrating and announcing.">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-3xl" />)}</div>
        ) : posts.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        ) : (
          <p className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">Nothing has been published yet. Please check back soon.</p>
        )}
      </section>
    </PublicPage>
  );
}

export function PostCard({ post, to = "/news/$slug" as const }: { post: WcbnPost; to?: "/news/$slug" | "/portal/news/$slug" }) {
  return (
    <Link to={to} params={{ slug: post.slug }} className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-40 overflow-hidden bg-muted">
        {post.image_url
          ? <img src={post.image_url} alt={post.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
          : <div className="h-full w-full gradient-brand" />}
        <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-primary">{postTypeLabel(post.post_type)}</span>
        {post.is_pinned && <span className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-accent text-accent-foreground"><Pin className="size-3.5" /></span>}
      </div>
      <div className="p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{postDate(post)}</p>
        <h3 className="mt-2 text-lg font-bold leading-snug">{post.title}</h3>
        {post.summary && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.summary}</p>}
      </div>
    </Link>
  );
}
