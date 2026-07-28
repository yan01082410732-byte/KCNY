export type Post = { id: number; author: string; place: string; time: string; avatar: string; title: string; body: string; tags: string[]; comments: number; accent: "coral" | "blue" | "yellow" };

export function PostCard({ post }: { post: Post }) {
  return <article className="post-card"><div className={`avatar ${post.accent}`}>{post.avatar}</div><div className="post-main"><div className="post-meta"><strong>{post.author}</strong><span>{post.place}</span><span>·</span><span>{post.time}</span></div><h3>{post.title}</h3><p>{post.body}</p><div className="post-bottom"><div className="tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><button>◌ {post.comments}</button></div></div></article>;
}
