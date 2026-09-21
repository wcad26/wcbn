import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MemberPage } from "@/components/wcbn/admin-page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { POST_FIELDS, postDate, postTypeLabel, type WcbnPost } from "@/lib/wcbn-content";

export const Route = createFileRoute("/portal/news/$slug")({ component: PortalPost });

function PortalPost() {
  const { slug } = Route.useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ["portal", "post", slug],
    queryFn: async () => (await supabase.from("wcbn_posts").select(POST_FIELDS).eq("slug", slug).eq("status", "published").maybeSingle()).data as WcbnPost | null,
  });

  if (isLoading) return <MemberPage title="Announcement" description="Loading."><Skeleton className="h-96 rounded-3xl" /></MemberPage>;

  if (!post) {
    return (
      <MemberPage title="Not found" description="This item may have been unpublished.">
        <Button asChild><Link to="/portal/news">Back to news</Link></Button>
      </MemberPage>
    );
  }

  return (
    <MemberPage title={post.title} description={`${postTypeLabel(post.post_type)} · ${postDate(post)}`}
      action={<Button asChild variant="outline"><Link to="/portal/news">Back to news</Link></Button>}>
      <article className="rounded-3xl border border-border bg-card p-6 shadow-card">
        {post.image_url && <img src={post.image_url} alt={post.title} className="mb-6 max-h-80 w-full rounded-2xl object-cover" />}
        {post.summary && <p className="text-lg leading-8 text-muted-foreground">{post.summary}</p>}
        <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-foreground/90">{post.body}</div>
        {post.tags?.length ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((t) => <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{t}</span>)}
          </div>
        ) : null}
      </article>
    </MemberPage>
  );
}
