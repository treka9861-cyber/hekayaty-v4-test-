import { useState } from "react";
import { useAdminModerationStories, useAdminModerateStory } from "@/hooks/use-admin";
import { Loader2, BookOpen, Search, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ContentModerationAdmin() {
  const { data: stories, isLoading } = useAdminModerationStories();
  const moderateStory = useAdminModerateStory();
  
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [notes, setNotes] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredStories = stories?.filter((story: any) => {
    if (filterStatus !== "all" && story.moderation_status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return story.title.toLowerCase().includes(q) || 
             story.genre?.toLowerCase().includes(q) ||
             story.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">بحاجة لمراجعة</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">مقبول</Badge>;
      case 'rejected': return <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/30">مرفوض</Badge>;
      case 'flagged': return <Badge variant="outline" className="bg-orange-500/20 text-orange-500 border-orange-500/30">مُعلّم</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleModerate = (status: string) => {
    if (!selectedStory) return;
    moderateStory.mutate({ 
      id: selectedStory.id, 
      status, 
      notes: notes || undefined 
    }, {
      onSuccess: () => {
        setSelectedStory({ ...selectedStory, moderation_status: status, moderation_notes: notes });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <p>قم بمراجعة القصص الجديدة والتحديثات والمحتوى المُعلّم للحفاظ على أمان المنصة.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="ابحث في القصص بالعنوان أو التصنيف..." 
            className="pl-10 bg-white/5 border-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المحتوى</SelectItem>
            <SelectItem value="pending">بحاجة لمراجعة (قيد الانتظار)</SelectItem>
            <SelectItem value="approved">مقبول</SelectItem>
            <SelectItem value="flagged">مُعلّم</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Story List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredStories?.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">لم يتم العثور على محتوى يطابق المعايير.</p>
            </div>
          ) : (
            filteredStories?.map((story: any) => (
              <div 
                key={story.id}
                onClick={() => { setSelectedStory(story); setNotes(story.moderation_notes || ""); }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                  selectedStory?.id === story.id 
                    ? "bg-primary/5 border-primary/30" 
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                {/* Cover Thumbnail */}
                <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10">
                  {story.cover_url ? (
                    <img src={story.cover_url} alt="الغلاف" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <BookOpen className="w-6 h-6 opacity-30" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-bold text-white truncate text-base">{story.title}</h4>
                      {getStatusBadge(story.moderation_status)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2 font-black uppercase tracking-widest">
                      <span className="bg-white/10 px-2 py-0.5 rounded">{story.type}</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{story.genre || 'غير مصنف'}</span>
                      {story.is_published ? (
                        <span className="text-green-500">مباشر</span>
                      ) : (
                        <span className="text-amber-500">مسودة</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{story.description}</p>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    تاريخ الإنشاء: {new Date(story.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          {selectedStory ? (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 sticky top-24">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
                <ShieldCheck className="w-5 h-5 text-primary" /> إجراء الإشراف
              </h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">عنوان القصة</span>
                  <div className="font-bold text-white">{selectedStory.title}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">الحالة الحالية</span>
                  {getStatusBadge(selectedStory.moderation_status)}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <div>
                  <label className="text-xs text-muted-foreground font-bold mb-2 block">ملاحظات الإشراف (تُرسل للكاتب إذا تم الرفض/التعليم)</label>
                  <Textarea 
                    placeholder="قدم سبباً للرفض أو التعليم..."
                    className="bg-black/40 border-white/10 resize-none h-24 text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleModerate('approved')}
                    disabled={moderateStory.isPending || selectedStory.moderation_status === 'approved'}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> قبول
                  </Button>
                  <Button 
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleModerate('rejected')}
                    disabled={moderateStory.isPending || selectedStory.moderation_status === 'rejected'}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> رفض
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full col-span-2 bg-orange-500/10 text-orange-500 border-orange-500/30 hover:bg-orange-500/20"
                    onClick={() => handleModerate('flagged')}
                    disabled={moderateStory.isPending || selectedStory.moderation_status === 'flagged'}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> تعليم للمراجعة
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-muted-foreground">
                <p><strong>قبول:</strong> القصة آمنة وعامة.</p>
                <p><strong>رفض:</strong> القصة تنتهك الشروط. سيتم إشعار الكاتب.</p>
                <p><strong>تعليم:</strong> المحتوى مشكوك فيه، يحد من الظهور.</p>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center text-muted-foreground sticky top-24">
              <BookOpen className="w-8 h-8 mx-auto mb-4 opacity-50" />
              اختر قصة لمراجعة المحتوى والإشراف عليه.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
