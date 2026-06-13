import { useState } from "react";
import { useCommunityPosts, useCreateCommunityPost } from "@/hooks/use-store-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, MessageCircle, Pin, Lock, Loader2, Trash2, MoreHorizontal } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface CommunityManagerProps {
  user: any;
}

const POST_TYPES = [
  { value: "text", label: "تحديث" },
  { value: "announcement", label: "إعلان" },
  { value: "poll", label: "تصويت" },
];

export function CommunityManager({ user }: CommunityManagerProps) {
  const { data: posts, isLoading } = useCommunityPosts(user?.id);
  const createPost = useCreateCommunityPost();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "text", isExclusive: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    createPost.mutate(form, {
      onSuccess: () => {
        setIsOpen(false);
        setForm({ title: "", content: "", type: "text", isExclusive: false });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif">منشورات المجتمع</h2>
          <p className="text-muted-foreground text-sm mt-1">
            شارك التحديثات والاستطلاعات والمحتوى الحصري مع متابعيك وأعضائك.
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 shrink-0">
          <Plus className="w-4 h-4" /> منشور جديد
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "إجمالي المنشورات", value: posts?.length || 0 },
          { label: "المثبتة", value: posts?.filter((p: any) => p.is_pinned).length || 0 },
          { label: "للأعضاء فقط", value: posts?.filter((p: any) => p.is_exclusive).length || 0 },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-4 rounded-2xl border border-white/10 text-center">
            <p className="text-3xl font-bold font-serif text-primary">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Posts List */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />)}
        </div>
      )}

      {!isLoading && (!posts || posts.length === 0) && (
        <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-bold mb-2">لا توجد منشورات بعد</h3>
          <p className="text-muted-foreground mb-6">
            ابدأ التفاعل مع مجتمعك بمشاركة أول تحديث أو إعلان أو استطلاع لك.
          </p>
          <Button onClick={() => setIsOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> أنشئ أول منشور لك
          </Button>
        </div>
      )}

      {posts && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <div key={post.id} className="glass-card rounded-2xl border border-white/10 p-5 flex gap-4 items-start hover:border-white/20 transition-colors">
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="secondary" className="capitalize text-xs">{post.type}</Badge>
                  {post.is_pinned && <Badge className="gap-1 text-xs bg-amber-500/20 text-amber-400 border-amber-500/30"><Pin className="w-3 h-3" /> مثبت</Badge>}
                  {post.is_exclusive && <Badge className="gap-1 text-xs bg-primary/20 text-primary border-primary/30"><Lock className="w-3 h-3" /> للأعضاء فقط</Badge>}
                  <span className="text-xs text-muted-foreground ml-auto">{formatDate(post.created_at)}</span>
                </div>
                {post.title && <h4 className="font-bold text-white mb-1">{post.title}</h4>}
                <p className="text-muted-foreground text-sm line-clamp-2">{post.content}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#111] border-white/10">
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Pin className="w-4 h-4" /> تثبيت المنشور
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer text-red-400 focus:text-red-400">
                    <Trash2 className="w-4 h-4" /> حذف المنشور
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Create Post Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">إنشاء منشور للمجتمع</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">نوع المنشور</Label>
              <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  {POST_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">العنوان (اختياري)</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="أعط منشورك عنواناً..."
                className="bg-black/20 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">المحتوى *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="شارك تحديثاً مع مجتمعك..."
                className="bg-black/20 border-white/10 resize-none"
                rows={4}
                required
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="font-medium text-sm">للأعضاء فقط</p>
                <p className="text-xs text-muted-foreground">يمكن للمشتركين المدفوعين فقط عرض هذا المنشور</p>
              </div>
              <Switch
                checked={form.isExclusive}
                onCheckedChange={(v) => setForm(p => ({ ...p, isExclusive: v }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createPost.isPending || !form.content.trim()} className="gap-2">
                {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                نشر المنشور
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
