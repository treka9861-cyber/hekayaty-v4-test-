import { useState } from "react";
import { useAdminReports, useAdminUpdateReportStatus } from "@/hooks/use-admin";
import { Loader2, ShieldAlert, Flag, CheckCircle, XCircle, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ReportsAdmin() {
  const { data: reports, isLoading } = useAdminReports();
  const updateStatus = useAdminUpdateReportStatus();
  
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredReports = reports?.filter((report: any) => {
    if (filterStatus !== "all" && report.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return report.reason.toLowerCase().includes(q) || 
             report.target_type.toLowerCase().includes(q) ||
             report.reporter?.display_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/30">قيد الانتظار</Badge>;
      case 'investigating': return <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/30">قيد التحقيق</Badge>;
      case 'resolved': return <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">محلول</Badge>;
      case 'dismissed': return <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">مرفوض</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleUpdateStatus = (status: string) => {
    if (!selectedReport) return;
    updateStatus.mutate({ 
      id: selectedReport.id, 
      status, 
      adminNotes: adminNotes || undefined 
    }, {
      onSuccess: () => {
        setSelectedReport({ ...selectedReport, status, admin_notes: adminNotes });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="البحث في البلاغات..."
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
            <SelectItem value="all">جميع البلاغات</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="investigating">قيد التحقيق</SelectItem>
            <SelectItem value="resolved">محلول</SelectItem>
            <SelectItem value="dismissed">مرفوض</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredReports?.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
              <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">لم يتم العثور على بلاغات.</p>
            </div>
          ) : (
            filteredReports?.map((report: any) => (
              <div 
                key={report.id}
                onClick={() => { setSelectedReport(report); setAdminNotes(report.admin_notes || ""); }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedReport?.id === report.id 
                    ? "bg-primary/5 border-primary/30" 
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <Flag className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white capitalize">بلاغ {report.target_type}</h4>
                      <p className="text-xs text-muted-foreground">أبلغ عنه: {report.reporter?.display_name || 'غير معروف'}</p>
                    </div>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
                <div className="text-sm text-gray-300 font-medium mb-1">السبب: {report.reason}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{report.description}</div>
                <div className="mt-3 text-[10px] text-muted-foreground flex justify-between">
                  <span>معرف الهدف: {report.target_id}</span>
                  <span>{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          {selectedReport ? (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 sticky top-24">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" /> تفاصيل البلاغ
              </h3>
              
              <div className="space-y-4 mb-6 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">نوع الهدف ومعرفه</span>
                  <div className="font-mono bg-black/40 px-3 py-2 rounded-lg break-all">
                    {selectedReport.target_type} : {selectedReport.target_id}
                  </div>
                </div>
                
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">سبب البلاغ</span>
                  <div className="font-semibold text-white">{selectedReport.reason}</div>
                </div>
                
                {selectedReport.description && (
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">وصف المستخدم</span>
                    <div className="bg-white/5 p-3 rounded-lg text-gray-300 italic">"{selectedReport.description}"</div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                <div>
                  <label className="text-xs text-muted-foreground font-bold mb-2 block">ملاحظات الإدارة (داخلية)</label>
                  <Textarea 
                    placeholder="أضف ملاحظات التحقيق هنا..."
                    className="bg-black/40 border-white/10 resize-none h-24 text-sm"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20"
                    onClick={() => handleUpdateStatus('investigating')}
                    disabled={updateStatus.isPending || selectedReport.status === 'investigating'}
                  >
                    تحقيق
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20"
                    onClick={() => handleUpdateStatus('dismissed')}
                    disabled={updateStatus.isPending || selectedReport.status === 'dismissed'}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> رفض
                  </Button>
                  <Button 
                    className="w-full col-span-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleUpdateStatus('resolved')}
                    disabled={updateStatus.isPending || selectedReport.status === 'resolved'}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> تحديد كمحلول
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center text-muted-foreground sticky top-24">
              <Eye className="w-8 h-8 mx-auto mb-4 opacity-50" />
              اختر بلاغاً من القائمة لعرض تفاصيله واتخاذ إجراء.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
