import { useState } from "react";
import { useUniverses, useCreateUniverse } from "@/hooks/use-store-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Globe, Lock, Trash2, Edit2, Map, Users, BookOpen, Loader2 } from "lucide-react";
import { CloudinaryUpload } from "@/components/ui/cloudinary-upload";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface UniverseManagerProps {
  userId: string;
}

export function UniverseManager({ userId }: UniverseManagerProps) {
  const { data: universes, isLoading } = useUniverses(userId);
  const createUniverse = useCreateUniverse();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", coverUrl: "", isPublic: true });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createUniverse.mutate(form, {
      onSuccess: () => {
        setIsOpen(false);
        setForm({ name: "", description: "", coverUrl: "", isPublic: true });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif">إدارة العوالم</h2>
          <p className="text-muted-foreground text-sm mt-1">
            ابنِ عوالم مترابطة وشخصيات وتاريخاً يمتد عبر قصصك.
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 shrink-0">
          <Plus className="w-4 h-4" /> عالم جديد
        </Button>
      </div>

      {/* Universe Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />)}
        </div>
      )}

      {!isLoading && (!universes || universes.length === 0) && (
        <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
          <Map className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-bold mb-2">لا توجد عوالم بعد</h3>
          <p className="text-muted-foreground mb-6">
            أنشئ عالمك الخيالي الأول لربط قصصك وشخصياتك وتاريخك في عالم مشترك.
          </p>
          <Button onClick={() => setIsOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> أنشئ عالمك الأول
          </Button>
        </div>
      )}

      {universes && universes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {universes.map((universe: any) => (
            <div key={universe.id} className="group relative glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-primary/30 transition-all duration-300">
              {/* Cover */}
              <div className="h-32 relative">
                {universe.cover_url ? (
                  <img src={universe.cover_url} alt={universe.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Map className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="w-7 h-7 bg-black/60 border border-white/20 hover:bg-black">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="destructive" className="w-7 h-7 bg-red-500/60 hover:bg-red-500">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="absolute bottom-3 left-3">
                  {universe.is_public
                    ? <span className="flex items-center gap-1 text-xs text-gray-300 bg-black/60 px-2 py-1 rounded-full"><Globe className="w-3 h-3" /> عام</span>
                    : <span className="flex items-center gap-1 text-xs text-amber-400 bg-black/60 px-2 py-1 rounded-full"><Lock className="w-3 h-3" /> للأعضاء فقط</span>
                  }
                </div>
              </div>
              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold font-serif text-white truncate">{universe.name}</h3>
                {universe.description && (
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{universe.description}</p>
                )}
                <div className="flex gap-4 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 0 شخصيات</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> 0 كتب</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Universe Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">إنشاء عالم جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">اسم العالم *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="مثال: مملكة السبج"
                className="bg-black/20 border-white/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">الوصف</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="صف عالمك بإيجاز، موضوعاته وتاريخه..."
                className="bg-black/20 border-white/10 resize-none"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">صورة الغلاف</Label>
              <CloudinaryUpload
                defaultImage={form.coverUrl}
                onUpload={(url: string) => setForm(p => ({ ...p, coverUrl: url }))}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="font-medium text-sm">عالم عام</p>
                <p className="text-xs text-muted-foreground">مرئي لجميع الزوار في متجرك</p>
              </div>
              <Switch
                checked={form.isPublic}
                onCheckedChange={(v) => setForm(p => ({ ...p, isPublic: v }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createUniverse.isPending || !form.name.trim()} className="gap-2">
                {createUniverse.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إنشاء العالم
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
