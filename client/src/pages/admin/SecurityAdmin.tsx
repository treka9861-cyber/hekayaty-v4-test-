import { useState } from "react";
import { useAdminAuditLogs } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, Search, BadgeCheck, Ban, ShieldOff, Settings, RefreshCw } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

const ACTION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    verify_writer: { label: "توثيق كاتب", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: BadgeCheck },
    unverify_writer: { label: "إلغاء توثيق كاتب", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: ShieldOff },
    update_user_status: { label: "تحديث الحالة", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Ban },
    update_settings: { label: "تحديث الإعدادات", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Settings },
};

function ActionBadge({ action }: { action: string }) {
    const meta = ACTION_META[action] || { label: action.replace(/_/g, " "), color: "bg-white/5 text-muted-foreground border-white/10", icon: Settings };
    const Icon = meta.icon;
    return (
        <Badge className={cn("border text-[10px] font-bold uppercase tracking-tighter gap-1", meta.color)}>
            <Icon className="w-2.5 h-2.5" />
            {meta.label}
        </Badge>
    );
}

export function SecurityAdmin() {
    const { data: logs, isLoading, refetch } = useAdminAuditLogs();
    const [search, setSearch] = useState("");

    const filtered = (logs || []).filter((log: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            log.action?.toLowerCase().includes(q) ||
            log.admin?.display_name?.toLowerCase().includes(q) ||
            log.target_id?.toLowerCase().includes(q) ||
            log.details?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-xl">
                    <Shield className="w-6 h-6 text-red-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gradient">مركز الأمان</h2>
                    <p className="text-muted-foreground text-sm">تتبع جميع إجراءات المسؤولين وأحداث أمان المنصة.</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "إجمالي الأحداث", value: (logs || []).length, color: "text-foreground" },
                    { label: "عمليات التوثيق", value: (logs || []).filter((l: any) => l.action === "verify_writer").length, color: "text-green-400" },
                    { label: "تغييرات الحالة", value: (logs || []).filter((l: any) => l.action === "update_user_status").length, color: "text-blue-400" },
                ].map(({ label, value, color }) => (
                    <Card key={label} className="glass-card border-white/10 bg-black/40">
                        <CardContent className="p-5 flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{label}</span>
                            <span className={cn("text-2xl font-black", color)}>{value}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="البحث بالإجراء، المسؤول، أو الهدف..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-white/5 border-white/10 h-10"
                    />
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-muted-foreground border border-white/10"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Logs Table */}
            <Card className="glass-card border-white/10 bg-black/40 overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/5">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>سجل التدقيق</CardTitle>
                            <CardDescription>آخر 100 إجراء للمسؤولين عبر المنصة</CardDescription>
                        </div>
                        <Shield className="w-6 h-6 text-red-400/30" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center p-16">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">لم يتم تسجيل أحداث تدقيق بعد.</p>
                            <p className="text-sm mt-1">ستظهر إجراءات المسؤولين مثل التوثيقات وتحديثات الحالة هنا.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الإجراء</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المسؤول</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">معرف الهدف</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">التفاصيل</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">وقت الحدث</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((log: any) => (
                                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="py-4">
                                            <ActionBadge action={log.action} />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div>
                                                <p className="font-bold text-sm text-foreground">{log.admin?.display_name || "غير معروف"}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{log.admin?.email || log.admin_id}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="font-mono text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/10 truncate max-w-[120px] block">
                                                {log.target_id || "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4 max-w-[200px]">
                                            <span className="text-xs text-muted-foreground truncate block">
                                                {log.details ? (
                                                    (() => {
                                                        try {
                                                            const parsed = JSON.parse(log.details);
                                                            return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(", ");
                                                        } catch {
                                                            return log.details;
                                                        }
                                                    })()
                                                ) : "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4 text-sm text-muted-foreground">
                                            {formatDate(log.created_at)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
