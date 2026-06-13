import { useState } from "react";
import { useAdminUsers, useAdminUpdateUserStatus, useAdminVerifyWriter, useAdminOverrideSubscription, useAdminBulkVerify } from "@/hooks/use-admin";
import { WriterReviewPanel } from "./WriterReviewPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Search, Users, Filter, Ban, ShieldCheck, ShieldOff, CheckCircle,
    UserX, RefreshCw, Loader2, BadgeCheck, Star, Crown, Eye, CreditCard, CheckSquare, XSquare
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

const ROLES = ["all", "reader", "writer", "artist", "admin"];
const STATUSES = ["all", "active", "suspended", "banned"];

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        active: "bg-green-500/10 text-green-400 border-green-500/20",
        suspended: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        banned: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return (
        <Badge className={cn("font-bold uppercase text-[10px] tracking-tighter border", map[status] || "bg-muted/10 text-muted-foreground border-white/10")}>
            {status}
        </Badge>
    );
}

function RoleBadge({ role }: { role: string }) {
    const map: Record<string, string> = {
        admin: "bg-primary/15 text-primary border-primary/30",
        writer: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        artist: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        reader: "bg-white/5 text-muted-foreground border-white/10",
    };
    return (
        <Badge className={cn("font-bold capitalize text-[10px] tracking-tighter border", map[role] || "bg-white/5 border-white/10 text-muted-foreground")}>
            {role === "admin" && <Crown className="w-2.5 h-2.5 mr-1" />}
            {role === "writer" && <Star className="w-2.5 h-2.5 mr-1" />}
            {role}
        </Badge>
    );
}

type ActionDialogState = {
    user: any;
    type: "status" | "verify" | "subscription";
} | null;

export function UsersAdmin() {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
    const [actionDialog, setActionDialog] = useState<ActionDialogState>(null);
    const [statusToSet, setStatusToSet] = useState("active");
    const [banReason, setBanReason] = useState("");
    const [verifyNotes, setVerifyNotes] = useState("");
    const [reviewWriterId, setReviewWriterId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkNotes, setBulkNotes] = useState("");

    const filters: any = {};
    if (roleFilter !== "all") filters.role = roleFilter;
    if (statusFilter !== "all") filters.status = statusFilter;
    if (verifiedFilter === "verified") filters.isVerified = true;
    if (verifiedFilter === "unverified") filters.isVerified = false;

    const { data: users, isLoading, refetch } = useAdminUsers(filters);
    const updateStatus = useAdminUpdateUserStatus();
    const verifyWriter = useAdminVerifyWriter();
    const overrideSub = useAdminOverrideSubscription();
    const bulkVerify = useAdminBulkVerify();

    const [newTier, setNewTier] = useState("free");

    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map((u: any) => u.id)));
        }
    }

    const filtered = (users || []).filter((u: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            u.display_name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.username?.toLowerCase().includes(q)
        );
    });

    function handleStatusAction() {
        if (!actionDialog || actionDialog.type !== "status") return;
        updateStatus.mutate(
            { userId: actionDialog.user.id, status: statusToSet, banReason: banReason || undefined },
            { onSuccess: () => { setActionDialog(null); setBanReason(""); } }
        );
    }

    function handleVerifyAction(isVerified: boolean) {
        if (!actionDialog || actionDialog.type !== "verify") return;
        verifyWriter.mutate(
            { userId: actionDialog.user.id, isVerified, verificationNotes: verifyNotes || undefined },
            { onSuccess: () => { setActionDialog(null); setVerifyNotes(""); } }
        );
    }

    function handleSubscriptionAction() {
        if (!actionDialog || actionDialog.type !== "subscription") return;
        overrideSub.mutate(
            { userId: actionDialog.user.id, newTier, adminNotes: verifyNotes || undefined },
            { onSuccess: () => { setActionDialog(null); setVerifyNotes(""); } }
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gradient">إدارة المستخدمين</h2>
                    <p className="text-muted-foreground text-sm">إدارة جميع مستخدمي المنصة، أدوارهم وصلاحياتهم.</p>
                </div>
            </div>

            {/* Filters Bar */}
            <Card className="glass-card border-white/10 bg-black/40">
                <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="ابحث بالاسم، البريد الإلكتروني، اسم المستخدم..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10 h-10"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <div className="flex gap-1">
                            {ROLES.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRoleFilter(r)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all",
                                        roleFilter === r
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                    )}
                                >{r === 'all' ? 'الكل' : r === 'reader' ? 'قارئ' : r === 'writer' ? 'كاتب' : r === 'artist' ? 'فنان' : r === 'admin' ? 'مدير' : r}</button>
                            ))}
                        </div>
                        <div className="w-px h-5 bg-white/10" />
                        <div className="flex gap-1">
                            {STATUSES.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all",
                                        statusFilter === s
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                    )}
                                >{s === 'all' ? 'الكل' : s === 'active' ? 'نشط' : s === 'suspended' ? 'موقوف' : s === 'banned' ? 'محظور' : s}</button>
                            ))}
                        </div>
                        <div className="w-px h-5 bg-white/10" />
                        <div className="flex gap-1">
                            {(["all", "verified", "unverified"] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setVerifiedFilter(v)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all",
                                        verifiedFilter === v
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                    )}
                                >{v === 'all' ? 'الكل' : v === 'verified' ? 'موثق' : v === 'unverified' ? 'غير موثق' : v}</button>
                            ))}
                        </div>
                        <button onClick={() => refetch()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-muted-foreground">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="glass-card border-white/10 bg-black/40 overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/5">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>جميع المستخدمين</CardTitle>
                            <CardDescription>تم العثور على {filtered.length} مستخدم</CardDescription>
                        </div>
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-bold">تم تحديد {selectedIds.size}</span>
                                <Button
                                    size="sm"
                                    className="bg-primary hover:bg-primary/80 text-primary-foreground gap-2 text-xs h-8"
                                    onClick={() => bulkVerify.mutate({ userIds: Array.from(selectedIds), isVerified: true, verificationNotes: bulkNotes }, { onSuccess: () => setSelectedIds(new Set()) })}
                                    disabled={bulkVerify.isPending}
                                >
                                    {bulkVerify.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                                    توثيق جماعي
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-2 text-xs h-8"
                                    onClick={() => bulkVerify.mutate({ userIds: Array.from(selectedIds), isVerified: false }, { onSuccess: () => setSelectedIds(new Set()) })}
                                    disabled={bulkVerify.isPending}
                                >
                                    {bulkVerify.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XSquare className="w-3.5 h-3.5" />}
                                    إلغاء توثيق جماعي
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center p-16">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>لم يتم العثور على مستخدمين يطابقون عوامل التصفية الخاصة بك.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="w-10 py-4">
                                        <Checkbox
                                            checked={selectedIds.size === filtered.length && filtered.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                            className="border-white/20"
                                        />
                                    </TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المستخدم</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الدور</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الحالة</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الوثوق</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">تاريخ الانضمام</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4 text-right">إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((user: any) => (
                                    <TableRow key={user.id} className={cn("border-white/5 hover:bg-white/5 transition-colors", selectedIds.has(user.id) && "bg-primary/5")}>
                                        <TableCell className="py-4 pl-4">
                                            <Checkbox
                                                checked={selectedIds.has(user.id)}
                                                onCheckedChange={() => toggleSelect(user.id)}
                                                className="border-white/20"
                                            />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                                                    <img
                                                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || 'U')}&background=1a1a1a&color=cca660`}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-sm text-foreground truncate">{user.display_name}</span>
                                                        {user.is_verified && (
                                                            <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground font-mono truncate">@{user.username}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <RoleBadge role={user.role} />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <StatusBadge status={user.status || "active"} />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            {user.is_verified ? (
                                                <span className="flex items-center gap-1 text-primary text-xs font-bold">
                                                    <BadgeCheck className="w-3.5 h-3.5" /> موثق
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-4 text-sm text-muted-foreground">
                                            {formatDate(user.created_at)}
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                    onClick={() => setReviewWriterId(user.id)}
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    مراجعة
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
                                                    onClick={() => setActionDialog({ user, type: "status" })}
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                    الحالة
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className={cn(
                                                        "h-8 gap-1.5 text-xs",
                                                        user.is_verified
                                                            ? "text-primary/70 hover:text-destructive hover:bg-destructive/10"
                                                            : "text-primary hover:bg-primary/10"
                                                    )}
                                                    onClick={() => setActionDialog({ user, type: "verify" })}
                                                >
                                                    {user.is_verified ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                                    {user.is_verified ? "إلغاء التوثيق" : "توثيق"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                                    onClick={() => {
                                                        setNewTier(user.subscription_tier || "free");
                                                        setActionDialog({ user, type: "subscription" });
                                                    }}
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    الخطة
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Status Action Dialog */}
            {actionDialog?.type === "status" && (
                <Dialog open onOpenChange={() => setActionDialog(null)}>
                    <DialogContent className="bg-black/90 border-white/10 max-w-md">
                        <DialogHeader>
                            <DialogTitle>تحديث حالة المستخدم</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <p className="text-sm text-muted-foreground">
                                الإدارة: <strong className="text-foreground">{actionDialog.user.display_name}</strong>
                                <span className="ml-1 text-muted-foreground/60">(@{actionDialog.user.username})</span>
                            </p>
                            <div className="flex gap-2">
                                {["active", "suspended", "banned"].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusToSet(s)}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg text-xs font-bold capitalize border transition-all",
                                            statusToSet === s
                                                ? s === "active" ? "bg-green-500/20 border-green-500/40 text-green-400"
                                                    : s === "suspended" ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                                                    : "bg-red-500/20 border-red-500/40 text-red-400"
                                                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                                        )}
                                    >{s === 'active' ? 'نشط' : s === 'suspended' ? 'موقوف' : s === 'banned' ? 'محظور' : s}</button>
                                ))}
                            </div>
                            {(statusToSet === "suspended" || statusToSet === "banned") && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">السبب (اختياري)</label>
                                    <Textarea
                                        placeholder="اكتب سبباً لهذا الإجراء..."
                                        value={banReason}
                                        onChange={(e) => setBanReason(e.target.value)}
                                        className="bg-white/5 border-white/10 resize-none h-20"
                                    />
                                </div>
                            )}
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setActionDialog(null)}>إلغاء</Button>
                            <Button
                                onClick={handleStatusAction}
                                disabled={updateStatus.isPending}
                                className={cn(
                                    "font-bold",
                                    statusToSet === "active" ? "bg-green-600 hover:bg-green-500 text-white"
                                        : statusToSet === "suspended" ? "bg-amber-600 hover:bg-amber-500 text-white"
                                        : "bg-red-600 hover:bg-red-500 text-white"
                                )}
                            >
                                {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                <span className="ml-2 capitalize">تعيين كـ {statusToSet === 'active' ? 'نشط' : statusToSet === 'suspended' ? 'موقوف' : statusToSet === 'banned' ? 'محظور' : statusToSet}</span>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Verify Action Dialog */}
            {actionDialog?.type === "verify" && (
                <Dialog open onOpenChange={() => setActionDialog(null)}>
                    <DialogContent className="bg-black/90 border-white/10 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {actionDialog.user.is_verified ? (
                                    <><ShieldOff className="w-5 h-5 text-destructive" /> إزالة التوثيق</>
                                ) : (
                                    <><BadgeCheck className="w-5 h-5 text-primary" /> منح التوثيق</>
                                )}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                <img
                                    src={actionDialog.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(actionDialog.user.display_name)}&background=1a1a1a&color=cca660`}
                                    className="w-10 h-10 rounded-full object-cover"
                                    alt=""
                                />
                                <div>
                                    <p className="font-bold text-sm">{actionDialog.user.display_name}</p>
                                    <p className="text-xs text-muted-foreground">@{actionDialog.user.username} · {actionDialog.user.role}</p>
                                </div>
                            </div>
                            {!actionDialog.user.is_verified && (
                                <p className="text-sm text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
                                    منح التوثيق يعني أن هذا الكاتب قد حاز على تقدير في حكاياتي. ستظهر شارة التوثيق في ملفه الشخصي وجميع قصصه.
                                </p>
                            )}
                            {actionDialog.user.is_verified && (
                                <p className="text-sm text-muted-foreground bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                                    إزالة التوثيق سيؤدي إلى إزالة الشارة فوراً من ملف المستخدم وقصصه.
                                </p>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">ملاحظات داخلية (اختياري)</label>
                                <Textarea
                                    placeholder="دون سبب هذا القرار..."
                                    value={verifyNotes}
                                    onChange={(e) => setVerifyNotes(e.target.value)}
                                    className="bg-white/5 border-white/10 resize-none h-20"
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setActionDialog(null)}>إلغاء</Button>
                            {!actionDialog.user.is_verified ? (
                                <Button
                                    onClick={() => handleVerifyAction(true)}
                                    disabled={verifyWriter.isPending}
                                    className="bg-primary hover:bg-primary/80 text-primary-foreground font-bold gap-2"
                                >
                                    {verifyWriter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                                    منح التوثيق
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handleVerifyAction(false)}
                                    disabled={verifyWriter.isPending}
                                    variant="destructive"
                                    className="font-bold gap-2"
                                >
                                    {verifyWriter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                                    إزالة التوثيق
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Subscription Action Dialog */}
            {actionDialog?.type === "subscription" && (
                <Dialog open onOpenChange={() => setActionDialog(null)}>
                    <DialogContent className="bg-black/90 border-white/10 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-emerald-400" /> تجاوز الاشتراك
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <p className="text-sm text-muted-foreground">
                                تجاوز خطة الاشتراك لـ <strong className="text-foreground">{actionDialog.user.display_name}</strong>.
                                الخطة الحالية: <Badge className="ml-1 bg-white/5 border-white/10 text-muted-foreground">{actionDialog.user.subscription_tier || "free"}</Badge>
                            </p>
                            
                            <div className="flex gap-2">
                                {["free", "pro", "vip"].map(tier => (
                                    <button
                                        key={tier}
                                        onClick={() => setNewTier(tier)}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg text-xs font-bold capitalize border transition-all",
                                            newTier === tier
                                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                                        )}
                                    >{tier}</button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">ملاحظات داخلية (مطلوبة لسجل المراجعة)</label>
                                <Textarea
                                    placeholder="دون سبب هذا التجاوز اليدوي..."
                                    value={verifyNotes}
                                    onChange={(e) => setVerifyNotes(e.target.value)}
                                    className="bg-white/5 border-white/10 resize-none h-20"
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setActionDialog(null)}>إلغاء</Button>
                            <Button
                                onClick={handleSubscriptionAction}
                                disabled={overrideSub.isPending || !verifyNotes}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                            >
                                {overrideSub.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                حفظ التجاوز
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Writer Review Panel */}
            <WriterReviewPanel writerId={reviewWriterId} onClose={() => setReviewWriterId(null)} />
        </div>
    );
}
