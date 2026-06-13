import { useState } from "react";
import { StoreProps } from "./types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share2, MoreHorizontal, Loader2, Pin, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCommunityPosts, useCreateCommunityPost } from "@/hooks/use-store-system";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export function StoreCommunity({ user, themeColor, fontClass, isOwnStore }: StoreProps) {
  const { data: posts, isLoading } = useCommunityPosts(user.id);
  const createPost = useCreateCommunityPost();
  const [newContent, setNewContent] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const handleSubmit = () => {
    if (!newContent.trim()) return;
    createPost.mutate({ content: newContent, type: "text" }, {
      onSuccess: () => {
        setNewContent("");
        setIsComposing(false);
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Create Post Box — Owner Only */}
      {isOwnStore && (
        <div className="glass-card p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
          <div className="flex gap-4 items-center">
            <Avatar className="w-12 h-12 border-2 shrink-0" style={{ borderColor: themeColor }}>
              <AvatarImage src={user.avatarUrl!} />
              <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            {!isComposing ? (
              <div
                className="flex-1 bg-black/20 hover:bg-black/40 transition-colors cursor-text rounded-full py-3 px-6 text-gray-400 border border-white/5"
                onClick={() => setIsComposing(true)}
              >
                شارك تحديثًا، أو استطلاعًا، أو محتوى حصريًا...
              </div>
            ) : (
              <Textarea
                autoFocus
                placeholder="بم تفكر؟"
                className="flex-1 bg-black/20 border-white/10 resize-none rounded-2xl focus-visible:ring-1 text-white"
                style={{ "--tw-ring-color": themeColor } as any}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
              />
            )}
          </div>
          {isComposing && (
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setIsComposing(false); setNewContent(""); }}>
                إلغاء
              </Button>
              <Button
                disabled={!newContent.trim() || createPost.isPending}
                style={{ backgroundColor: themeColor }}
                onClick={handleSubmit}
              >
                {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "نشر التحديث"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Posts Feed */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-48 rounded-3xl bg-white/5" />
          ))}
        </div>
      )}

      {!isLoading && (!posts || posts.length === 0) && (
        <div className="py-24 text-center glass-card rounded-3xl border border-dashed border-white/10">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className={`text-2xl font-bold text-white mb-2 ${fontClass}`}>لا توجد منشورات بعد</h3>
          <p className="text-gray-400">
            {isOwnStore
              ? "ابدأ بالتفاعل مع قرائك من خلال مشاركة تحديث أعلاه."
              : "لم يقم هذا المبدع بنشر أي شيء بعد. تابعه لتتلقى إشعارًا عندما يفعل ذلك!"}
          </p>
        </div>
      )}

      {posts?.map((post: any) => (
        <div key={post.id} className="glass-card rounded-3xl border border-white/5 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-6 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user.avatarUrl!} />
                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-bold text-white">{user.displayName}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>{formatDate(post.created_at)}</span>
                  {post.is_pinned && (
                    <><span>•</span><span className="flex items-center gap-1 text-amber-400"><Pin className="w-3 h-3" /> مثبت</span></>
                  )}
                  {post.is_exclusive && (
                    <><span>•</span><span className="flex items-center gap-1" style={{ color: themeColor }}><Lock className="w-3 h-3" /> للأعضاء فقط</span></>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white rounded-full">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            {post.title && <h3 className={`text-xl font-bold mb-3 text-white ${fontClass}`}>{post.title}</h3>}
            <p className="text-gray-300 leading-relaxed">{post.content}</p>
          </div>

          {/* Image if any */}
          {post.media_url && (
            <div className="w-full bg-black/50 border-y border-white/5">
              <img src={post.media_url} alt="Post attachment" className="w-full max-h-[500px] object-cover" />
            </div>
          )}

          {/* Actions */}
          <div className="p-4 flex items-center justify-between border-t border-white/5 bg-black/20">
            <div className="flex gap-2">
              <Button variant="ghost" className="rounded-full gap-2 text-gray-400 hover:text-white hover:bg-white/5">
                <Heart className="w-5 h-5" />
              </Button>
              <Button variant="ghost" className="rounded-full gap-2 text-gray-400 hover:text-white hover:bg-white/5">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full text-gray-400 hover:text-white hover:bg-white/5">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
