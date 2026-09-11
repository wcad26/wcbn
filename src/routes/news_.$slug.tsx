import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/wcbn/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { POST_FIELDS, postDate, postTypeLabel, type WcbnPost } from "@/lib/wcbn-content";

export const Route = createFileRoute("/news_/$slug")({ component: PostDetail });

function PostDetail() {
  const { slug } = Route.useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ["public", "post", slug],
    queryFn: async () => (await supabase.from("wcbn_posts").select(POST_FIELDS)
      .eq("slug", slug).eq("status", "published").maybeSingle()).data as WcbnPost | null,
  });

  return (
    <PageShell>
      <main className="pt-20">
        {isLoading ? (
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6"><Skeleton className="h-96 rounded-3xl" /></div>
        ) : !post ? (
          <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
            <h1 className="text-3xl font-bold">Article not found</h1>
            <Button asChild className="mt-6 rounded-full"><Link to="/news">Back to the newsroom</Link></Button>
          </div>
        ) : (
          <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{postTypeLabel(post.post_type)} · {postDate(post)}</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">{post.title}</h1>
            {post.summary && <p className="mt-5 text-lg leading-8 text-muted-foreground">{post.summary}</p>}
            {post.image_url && <img src={post.image_url} alt={post.title} className="mt-8 w-full rounded-3xl object-cover" />}
            <div className="mt-8 whitespace-pre-wrap text-base leading-8 text-foreground/90">{post.body}</div>
            {post.tags?.length ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {post.tags.map((t) => <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{t}</span>)}
              </div>
            ) : null}
            <Button asChild variant="outline" className="mt-10 rounded-full"><Link to="/news">Back to the newsroom</Link></Button>
          </article>
        )}
      </main>
    </PageShell>
  );
}
