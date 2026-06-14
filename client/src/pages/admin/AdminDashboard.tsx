import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ExternalLink, AlertTriangle, Users, Lock, Unlock, Loader2, Wallet, Truck, History, PenTool, CreditCard, Video, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useAdminOrders, useVerifyOrder, useRejectOrder, useAdminSellers, useFreezeSeller, useAdminPayouts, useApprovePayout, useAdminPayoutHistory, useAdminOrderHistory, usePendingSubscriptions, useApproveSubscription, useRejectSubscription, useAdminSubscriptionHistory, useUpgradeRequests, useApproveUpgradeRequest, useRejectUpgradeRequest } from "@/hooks/use-admin";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PhysicalOrdersAdmin } from "./PhysicalOrdersAdmin";
import { MediaAdmin } from "./MediaAdmin";
import { OverviewAdmin } from "./OverviewAdmin";
import { UsersAdmin } from "./UsersAdmin";
import { SecurityAdmin } from "./SecurityAdmin";
import { ReportsAdmin } from "./ReportsAdmin";
import { ContentModerationAdmin } from "./ContentModerationAdmin";
import { FinancialsAdmin } from "./FinancialsAdmin";
import { OrdersAdmin as GlobalOrdersAdmin } from "./OrdersAdmin";
import { MarketingAdmin } from "./MarketingAdmin";
import { CommunityAdmin } from "./CommunityAdmin";
import { SettingsAdmin } from "./SettingsAdmin";
import { formatDate, cn } from "@/lib/utils";
import { useAdminPrivateMessages, useSendAdminPrivateMessage, useAdminAnnouncements, useCreateAdminAnnouncement, useDeleteAdminAnnouncement, useMarkMessageRead } from "@/hooks/use-admin-system";
import { MessageSquare, Send, Megaphone, Trash2, Pin, Shield, Activity, Users as UsersIcon, Flag, BookMarked, DollarSign, Package, Settings, MessageCircle } from "lucide-react";
import { useDesignRequests } from "@/hooks/use-commissions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CommissionThread } from "@/components/creative-hub/CommissionsManager";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";


function PayoutsAdmin() {
    const { data: payouts, isLoading } = useAdminPayouts();
    const approvePayout = useApprovePayout();

    return (
        <Card className="glass-card border-primary/20 bg-black/60 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/5">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl text-gradient">طلبات السحب</CardTitle>
                        <CardDescription>مراجعة ومعالجة طلبات السحب من المبدعين.</CardDescription>
                    </div>
                    <Wallet className="w-8 h-8 text-primary/40" />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {(!payouts || payouts.length === 0) ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-primary/40" />
                        </div>
                        <p className="text-lg font-medium">لا توجد طلبات!</p>
                        <p className="text-sm">لا توجد طلبات سحب معلقة حالياً.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="hover:bg-transparent border-white/10">
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المبدع</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المبلغ</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الطريقة</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">التفاصيل</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">تاريخ الطلب</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4 text-right">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payouts.map((payout: any) => (
                                <TableRow key={payout.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">{payout.user?.display_name || 'N/A'}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{payout.user?.email || payout.user_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 font-black text-lg text-primary">{payout.amount} <span className="text-xs">ج.م</span></TableCell>
                                    <TableCell className="py-4">
                                        <Badge variant="outline" className="capitalize border-primary/30 text-primary bg-primary/5">
                                            {payout.method?.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 font-mono text-xs opacity-70">{payout.method_details}</TableCell>
                                    <TableCell className="py-4 text-sm font-medium">
                                        {formatDate(payout.requested_at)}
                                    </TableCell>
                                    <TableCell className="py-4 text-right">
                                        <div className="flex justify-end gap-3">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:bg-destructive/10 h-9"
                                                onClick={() => {
                                                    if (confirm('هل أنت متأكد أنك تريد رفض طلب السحب هذا؟'))
                                                        approvePayout.mutate({ payoutId: payout.id, status: 'rejected' });
                                                }}
                                                disabled={approvePayout.isPending}
                                            >
                                                <XCircle className="w-4 h-4 mr-1.5" /> رفض
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-primary hover:bg-primary/80 text-primary-foreground h-9 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105"
                                                onClick={() => {
                                                    if (confirm('هل تؤكد أنك قمت بتحويل الأموال إلى المبدع؟'))
                                                        approvePayout.mutate({ payoutId: payout.id, status: 'processed' });
                                                }}
                                                disabled={approvePayout.isPending}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                                {approvePayout.isPending ? 'جاري المعالجة...' : 'موافقة'}
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
    );
}

function AdminHistory() {
    const { data: payoutHistory, isLoading: payoutsLoading } = useAdminPayoutHistory();
    const { data: orderHistory, isLoading: ordersLoading } = useAdminOrderHistory();
    const { data: subscriptionHistory, isLoading: subsLoading } = useAdminSubscriptionHistory();

    if (payoutsLoading || ordersLoading || subsLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

    return (
        <div className="space-y-10">
            <Card className="glass-card border-white/10 bg-black/40 shadow-2xl overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Wallet className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl text-gradient">سجل السحوبات</CardTitle>
                            <CardDescription>جميع طلبات السحب المعالجة أو المرفوضة.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المبدع</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المبلغ</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الحالة</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">تاريخ الطلب</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payoutHistory?.map((payout: any) => (
                                <TableRow key={payout.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">{payout.user?.display_name}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{payout.user?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 font-black text-primary text-lg">{payout.amount} <span className="text-xs">ج.م</span></TableCell>
                                    <TableCell className="py-4">
                                        <Badge
                                            variant={payout.status === 'processed' ? 'default' : 'destructive'}
                                            className={cn(
                                                "font-bold uppercase tracking-tighter text-[10px]",
                                                payout.status === 'processed' ? "bg-green-500/20 text-green-500 border border-green-500/20" : "bg-destructive/20 text-destructive border border-destructive/20"
                                            )}
                                        >
                                            {payout.status === 'processed' ? 'مكتمل' : payout.status === 'rejected' ? 'مرفوض' : payout.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 text-sm font-medium opacity-80">
                                        {formatDate(payout.requested_at)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="glass-card border-white/10 bg-black/40 shadow-2xl overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl text-gradient">سجل الطلبات</CardTitle>
                            <CardDescription>جميع مدفوعات الطلبات المؤكدة أو المرفوضة.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">رقم الطلب</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المستخدم</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المنتجات</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المبلغ</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الحالة</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">التاريخ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orderHistory?.map((order: any) => (
                                <TableRow key={order.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="py-4 font-mono text-sm font-bold text-primary/60">#{order.id}</TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">{order.user?.display_name || 'زائر'}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{order.user?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            {order.order_items?.map((item: any, i: number) => (
                                                <div key={i} className="text-xs flex items-center gap-1">
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/20">{item.quantity}x</Badge>
                                                    <span className="text-foreground truncate max-w-[200px]">{item.product?.title || 'منتج غير معروف'}</span>
                                                </div>
                                            ))}
                                            {!order.order_items?.length && <span className="text-xs text-muted-foreground italic">لم يتم العثور على عناصر</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 font-black text-primary text-lg">{order.total_amount} <span className="text-xs">ج.م</span></TableCell>
                                    <TableCell className="py-4">
                                        <Badge
                                            variant={order.status === 'paid' ? 'default' : 'destructive'}
                                            className={cn(
                                                "font-bold uppercase tracking-tighter text-[10px]",
                                                order.status === 'paid' ? "bg-green-600/20 text-green-500 border border-green-500/20" : "bg-destructive/20 text-destructive border border-destructive/20"
                                            )}
                                        >
                                            {order.status === 'paid' ? 'تم الدفع' : order.status === 'cancelled' ? 'ملغي' : order.status === 'rejected' ? 'مرفوض' : order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 text-sm font-medium opacity-80">
                                        {formatDate(order.created_at)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="glass-card border-white/10 bg-black/40 shadow-2xl overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Lock className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl text-gradient">سجل الاشتراكات</CardTitle>
                            <CardDescription>جميع طلبات الاشتراكات المعالجة أو المرفوضة.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المستخدم</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الخطة والنادي</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المبلغ</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الحالة</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">التاريخ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptionHistory?.map((sub: any) => (
                                <TableRow key={sub.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">{sub.user?.display_name || 'غير معروف'}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{sub.user?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground text-sm">{sub.plan?.name || 'خطة غير معروفة'}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">النادي: {sub.club?.name || 'غير معروف'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 font-black text-primary text-lg">
                                        {sub.pricing ? (sub.pricing.price_in_cents / 100) : 'غير معروف'} <span className="text-xs">ج.م</span>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Badge
                                            variant={sub.status === 'active' ? 'default' : 'destructive'}
                                            className={cn(
                                                "font-bold uppercase tracking-tighter text-[10px]",
                                                sub.status === 'active' ? "bg-green-500/20 text-green-500 border border-green-500/20" : "bg-destructive/20 text-destructive border border-destructive/20"
                                            )}
                                        >
                                            {sub.status === 'active' ? 'تم التأكيد' : sub.status === 'rejected' ? 'مرفوض' : sub.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 text-sm font-medium opacity-80">
                                        {formatDate(sub.created_at)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function MessagingAdmin({ sellers }: { sellers: any[] }) {
    const { data: messages } = useAdminPrivateMessages();
    const { data: announcements } = useAdminAnnouncements();
    const sendMessage = useSendAdminPrivateMessage();
    const createAnnouncement = useCreateAdminAnnouncement();
    const deleteAnnouncement = useDeleteAdminAnnouncement();
    const markRead = useMarkMessageRead();
    const { user } = useAuth();

    // Mark all unread messages as read when opening tab
    useEffect(() => {
        const unread = messages?.filter(m => !m.isRead && m.receiverId === user?.id);
        unread?.forEach(m => markRead.mutate(m.id));
    }, [messages?.length]);


    const [selectedSeller, setSelectedSeller] = useState<string>("");
    const [privateMsg, setPrivateMsg] = useState("");
    const [annTitle, setAnnTitle] = useState("");
    const [annContent, setAnnContent] = useState("");
    const [isPinned, setIsPinned] = useState(false);

    const handleSendPrivate = () => {
        if (!selectedSeller || !privateMsg || !user) return;
        sendMessage.mutate({
            senderId: user.id,
            receiverId: selectedSeller,
            content: privateMsg
        }, {
            onSuccess: () => {
                setPrivateMsg("");
            }
        });
    };

    const handleCreateAnn = () => {
        if (!annTitle || !annContent || !user) return;
        createAnnouncement.mutate({
            adminId: user.id,
            title: annTitle,
            content: annContent,
            isPinned
        }, {
            onSuccess: () => {
                setAnnTitle("");
                setAnnContent("");
                setIsPinned(false);
            }
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            {/* Private Messages Section */}
            <Card className="glass-card border-primary/20 bg-black/60 shadow-2xl">
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        الرسائل المباشرة
                    </CardTitle>
                    <CardDescription>إرسال رسائل خاصة لمبدعين محددين.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <select
                            className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm text-white outline-none focus:border-primary/50"
                            value={selectedSeller}
                            onChange={(e) => setSelectedSeller(e.target.value)}
                        >
                            <option value="" className="bg-slate-900">اختر مبدعاً...</option>
                            {sellers?.map((s: any) => (
                                <option key={s.id} value={s.id} className="bg-slate-900">{s.display_name} ({s.role === 'writer' ? 'كاتب' : s.role})</option>
                            ))}
                        </select>
                        <Textarea
                            placeholder="اكتب رسالتك الخاصة هنا..."
                            className="bg-white/5 border-white/10 text-white min-h-[100px]"
                            value={privateMsg}
                            onChange={(e) => setPrivateMsg(e.target.value)}
                        />
                        <Button
                            className="w-full gap-2"
                            disabled={!selectedSeller || !privateMsg || sendMessage.isPending}
                            onClick={handleSendPrivate}
                        >
                            <Send className="w-4 h-4" />
                            {sendMessage.isPending ? "جاري الإرسال..." : "إرسال الرسالة"}
                        </Button>
                    </div>

                    <div className="mt-8 border-t border-white/5 pt-6">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">سجل الرسائل</h4>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {messages?.map((msg: any) => (
                                <div key={msg.id} className={cn(
                                    "p-3 rounded-lg border text-sm",
                                    msg.senderId === user?.id
                                        ? "bg-primary/5 border-primary/20 ml-8"
                                        : "bg-white/5 border-white/10 mr-8"
                                )}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-xs text-primary/80">
                                            {msg.senderId === user?.id ? "المسؤول (أنت)" : msg.sender?.display_name} → {msg.receiver?.display_name}
                                        </span>
                                        <span className="text-[10px] opacity-40">{formatDate(msg.createdAt)}</span>
                                    </div>
                                    <p className="text-white/90">{msg.content}</p>
                                    {msg.isRead && msg.senderId === user?.id && (
                                        <div className="text-[9px] text-green-500 mt-1 flex justify-end">تم العرض</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Global Announcements Section */}
            <Card className="glass-card border-accent/20 bg-black/60 shadow-2xl">
                <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-accent" />
                        إذاعة عامة للمنصة
                    </CardTitle>
                    <CardDescription>إرسال إشعار فوري لجميع المستخدمين على المنصة.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <Input
                            placeholder="عنوان الإشعار (مثال: تحديث المنصة)"
                            className="bg-white/5 border-white/10 text-white"
                            value={annTitle}
                            onChange={(e) => setAnnTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder="محتوى الإشعار..."
                            className="bg-white/5 border-white/10 text-white min-h-[80px]"
                            value={annContent}
                            onChange={(e) => setAnnContent(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <select
                                className="bg-white/5 border border-white/10 rounded-md p-2 text-xs text-white outline-none"
                                id="priority-select"
                                defaultValue="high"
                            >
                                <option value="low" className="bg-slate-900">أولوية منخفضة (صامت)</option>
                                <option value="medium" className="bg-slate-900">أولوية متوسطة</option>
                                <option value="high" className="bg-slate-900">أولوية عالية (إشعار منبثق)</option>
                            </select>
                            <Input
                                placeholder="رابط عميق (اختياري)"
                                className="bg-white/5 border-white/10 text-white text-xs"
                                id="link-input"
                            />
                        </div>
                        <Button
                            variant="secondary"
                            className="w-full gap-2 border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                            onClick={async () => {
                                if (!annTitle || !annContent) return;
                                const priority = (document.getElementById('priority-select') as HTMLSelectElement).value;
                                const link = (document.getElementById('link-input') as HTMLInputElement).value;

                                try {
                                    const res = await fetch('/api/admin/notifications/broadcast', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            title: annTitle,
                                            content: annContent,
                                            type: 'system',
                                            priority,
                                            link
                                        })
                                    });
                                    if (res.ok) {
                                        alert("تم إرسال الإشعار بنجاح!");
                                        setAnnTitle("");
                                        setAnnContent("");
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                        >
                            <Send className="w-4 h-4" />
                            إرسال لجميع المستخدمين
                        </Button>
                    </div>

                    <div className="mt-8 border-t border-white/5 pt-6">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">الإعلانات السابقة (للمبدعين)</h4>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {announcements?.map((ann: any) => (
                                <div key={ann.id} className="p-4 rounded-xl bg-white/5 border border-white/10 relative group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            {ann.is_pinned && <Pin className="w-3 h-3 text-primary" />}
                                            <h5 className="font-bold text-sm text-foreground">{ann.title}</h5>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                if (confirm("هل تريد حذف هذا الإعلان؟")) deleteAnnouncement.mutate(ann.id);
                                            }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{ann.content}</p>
                                    <div className="mt-3 flex justify-between items-center text-[10px] opacity-40">
                                        <span>بواسطة {ann.admin?.display_name || "المدير"}</span>
                                        <span>{formatDate(ann.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function CommissionsAdmin({ requestsResponse, isLoading }: { requestsResponse: any, isLoading: boolean }) {
    const [page, setPage] = useState(1);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const { user } = useAuth();

    return (
        <Card className="glass-card border-primary/20 bg-black/60 shadow-2xl overflow-hidden mt-6">
            <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <CardTitle className="text-2xl text-gradient">طلبات التصميم المخصصة</CardTitle>
                            {(requestsResponse?.data?.filter((r: any) => r.status === 'payment_under_review')?.length || 0) > 0 && (
                                <Badge className="bg-amber-600 text-white animate-pulse">
                                    {requestsResponse.data.filter((r: any) => r.status === 'payment_under_review').length} في انتظار المراجعة
                                </Badge>
                            )}
                        </div>
                        <CardDescription>مراقبة جميع طلبات التصميم النشطة والتعاونيات.</CardDescription>
                    </div>
                    <PenTool className="w-8 h-8 text-primary/40" />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin inline-block mr-2" /> جاري التحميل...</div> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>المشروع</TableHead>
                                <TableHead>العميل</TableHead>
                                <TableHead>الفنان</TableHead>
                                <TableHead>الميزانية</TableHead>
                                <TableHead>الحالة</TableHead>
                                <TableHead className="text-right">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requestsResponse?.data?.map((req: any) => (
                                <TableRow key={req.id} className={req.status === 'payment_under_review' ? 'bg-primary/5' : ''}>
                                    <TableCell className="font-bold">
                                        <div className="flex items-center gap-2">
                                            {req.title}
                                            {req.status === 'payment_under_review' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                        </div>
                                    </TableCell>
                                    <TableCell>{req.client?.display_name}</TableCell>
                                    <TableCell>{req.artist?.display_name}</TableCell>
                                    <TableCell className="font-bold text-primary">{req.budget} ج.م</TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === 'payment_under_review' ? 'default' : 'outline'} className="capitalize">
                                            {req.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant={req.status === 'payment_under_review' ? 'default' : 'ghost'} className="gap-2" onClick={() => setSelectedRequestId(req.id)}>
                                            <MessageSquare className="w-4 h-4" /> {req.status === 'payment_under_review' ? 'Review Payment' : 'View Chat'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={!!selectedRequestId} onOpenChange={() => setSelectedRequestId(null)}>
                <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden bg-background">
                    {selectedRequestId && user && <CommissionThread requestId={selectedRequestId} user={user} />}
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function SubscriptionsAdmin() {
    const { data: pendingSubscriptions, isLoading } = usePendingSubscriptions();
    const approveSubscription = useApproveSubscription();
    const rejectSubscription = useRejectSubscription();

    return (
        <Card className="glass-card border-primary/20 bg-black/60 shadow-2xl overflow-hidden mt-6">
            <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl text-gradient">الاشتراكات المعلقة</CardTitle>
                        <CardDescription>مراجعة مدفوعات الاشتراكات اليدوية قبل منح الوصول.</CardDescription>
                    </div>
                    <Lock className="w-8 h-8 text-primary/40" />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin inline-block mr-2" /> جاري التحميل...</div> : 
                 (!pendingSubscriptions || pendingSubscriptions.length === 0) ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500/50" />
                        <p>لا توجد مدفوعات اشتراكات معلقة للمراجعة.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المستخدم</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الخطة والنادي</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المبلغ</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الطريقة والمرجع</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الإثبات</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">التاريخ</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4 text-right">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingSubscriptions.map((sub: any) => (
                                <TableRow key={sub.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground text-sm">{sub.user?.display_name || 'غير معروف'}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{sub.user?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground text-sm">{sub.plan?.name || 'خطة غير معروفة'}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">النادي: {sub.club?.name || 'غير معروف'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 font-black text-primary text-lg">
                                        {sub.pricing ? (sub.pricing.price_in_cents / 100) : 'غير معروف'} <span className="text-xs">ج.م</span>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="outline" className="capitalize w-fit border-primary/30 text-primary bg-primary/5 font-bold text-[10px]">
                                                {sub.payment_method?.replace('_', ' ')}
                                            </Badge>
                                            <span className="font-mono text-[10px] opacity-70 truncate max-w-[120px]">{sub.payment_reference || 'لا يوجد مرجع'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {sub.payment_proof_url ? (
                                            <a href={sub.payment_proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:text-primary/70 transition-colors text-xs font-bold">
                                                <ExternalLink className="w-3.5 h-3.5" /> عرض
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-tighter italic">لا توجد صورة</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4 text-xs font-medium opacity-80">
                                        {formatDate(sub.created_at)}
                                    </TableCell>
                                    <TableCell className="py-4 text-right">
                                        <div className="flex justify-end gap-3">
                                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8"
                                                onClick={() => {
                                                    if (confirm('Reject this subscription payment?'))
                                                        rejectSubscription.mutate({ subscriptionId: sub.id });
                                                }}
                                                disabled={rejectSubscription.isPending || approveSubscription.isPending}>
                                                <XCircle className="w-4 h-4 mr-1.5" /> Reject
                                            </Button>
                                            <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white h-8 font-bold shadow-lg shadow-green-500/20"
                                                onClick={() => approveSubscription.mutate(sub.id)}
                                                disabled={approveSubscription.isPending || rejectSubscription.isPending}>
                                                <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
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
    );
}

function UpgradeRequestsAdmin() {
    const { data: requests, isLoading } = useUpgradeRequests('pending');
    const approveReq = useApproveUpgradeRequest();
    const rejectReq = useRejectUpgradeRequest();

    return (
        <Card className="glass-card border-primary/20 bg-black/60 shadow-2xl overflow-hidden mt-6">
            <CardHeader className="bg-white/5 border-b border-white/5">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl text-gradient">طلبات الترقية المعلقة</CardTitle>
                        <CardDescription>مراجعة طلبات ترقية الاشتراكات الحالية لدورات فوترة أعلى.</CardDescription>
                    </div>
                    <Crown className="w-8 h-8 text-primary/40" />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin inline-block mr-2" /> جاري التحميل...</div> : 
                 (!requests || requests.length === 0) ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500/50" />
                        <p>لا توجد طلبات ترقية معلقة للمراجعة.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المستخدم</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الاشتراك الحالي</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الترقية المطلوبة</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المبلغ المستحق</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الإثبات والمرجع</TableHead>
                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4 text-right">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req: any) => (
                                <TableRow key={req.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground text-sm">{req.user?.display_name || 'غير معروف'}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{req.user?.email || 'بدون بريد'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-xs">{req.plan?.name || 'غير معروف'}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="w-fit text-[10px] py-0 h-4">{req.currentPricing?.billing_cycle}</Badge>
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    {(req.currentPricing?.price_in_cents / 100).toFixed(0)} ج.م
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">ينتهي: {formatDate(req.subscription?.current_period_end)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-xs">{req.targetPlan?.name || req.plan?.name || 'نفس الباقة'}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 w-fit text-[10px] py-0 h-4">
                                                    {req.targetPricing?.billing_cycle}
                                                </Badge>
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    {(req.targetPricing?.price_in_cents / 100).toFixed(0)} ج.م
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 font-black text-amber-500 text-lg">
                                        <div className="flex flex-col gap-1">
                                            <span>
                                                {((req.liveCalculation ? req.liveCalculation.amountDueCents : req.snapshot_amount_due_cents) / 100).toFixed(2)} <span className="text-xs">ج.م</span>
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                                رصيد متبقي: {((req.liveCalculation ? req.liveCalculation.creditCents : req.snapshot_credit_cents) / 100).toFixed(2)} ج.م
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {(req.liveCalculation ? req.liveCalculation.amountDueCents : req.snapshot_amount_due_cents) > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline" className="capitalize w-fit border-primary/30 text-primary bg-primary/5 font-bold text-[10px]">
                                                    {req.payment_method?.replace('_', ' ')}
                                                </Badge>
                                                <span className="font-mono text-[10px] opacity-70 truncate max-w-[120px]">{req.payment_reference || 'لا يوجد مرجع'}</span>
                                            </div>
                                        ) : (
                                            <Badge className="bg-green-500/20 text-green-500">ترقية مجانية (رصيد)</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4 text-right">
                                        <div className="flex justify-end gap-3">
                                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8"
                                                onClick={() => {
                                                    if (confirm('رفض طلب الترقية؟'))
                                                        rejectReq.mutate({ requestId: req.id });
                                                }}
                                                disabled={rejectReq.isPending || approveReq.isPending}>
                                                <XCircle className="w-4 h-4 mr-1.5" /> رفض
                                            </Button>
                                            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white h-8 font-bold shadow-lg shadow-amber-500/20"
                                                onClick={() => approveReq.mutate(req.id)}
                                                disabled={approveReq.isPending || rejectReq.isPending}>
                                                <CheckCircle className="w-4 h-4 mr-1.5" /> تأكيد
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
    );
}

export default function AdminDashboard() {

    const { user, isLoading: authLoading } = useAuth();

    // Orders Hooks
    const { data: pendingOrders, isLoading: ordersLoading } = useAdminOrders();
    const verifyOrder = useVerifyOrder();
    const rejectOrder = useRejectOrder();

    // Sellers Hooks
    const { data: sellers, isLoading: sellersLoading } = useAdminSellers();
    const freezeSeller = useFreezeSeller();

    const { data: adminMessages } = useAdminPrivateMessages();
    const unreadCount = adminMessages?.filter(m => !m.isRead && m.receiverId === user?.id).length || 0;

    const [commissionPage, setCommissionPage] = useState(1);
    const { data: requestsResponse, isLoading: commissionsLoading } = useDesignRequests({ page: commissionPage });

    const searchParams = new URLSearchParams(window.location.search);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [window.location.search]);


    if (authLoading || ordersLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || user.role !== 'admin') {
        if (user?.role !== 'admin') return <Redirect to="/" />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />
            <div className="flex-1 container mx-auto px-4 py-8 pt-32">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-serif">لوحة تحكم المسؤول</h1>
                        <p className="text-muted-foreground">إدارة طلبات المنصة والمبدعين.</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-4 flex-wrap gap-2 h-auto">
                        <TabsTrigger value="overview" className="gap-2">
                            <Activity className="w-4 h-4" /> نظرة عامة
                        </TabsTrigger>
                        <TabsTrigger value="users" className="gap-2">
                            <UsersIcon className="w-4 h-4" /> المستخدمين والكُتاب
                        </TabsTrigger>
                        <TabsTrigger value="security" className="gap-2">
                            <Shield className="w-4 h-4" /> الأمان
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="gap-2">
                            <Flag className="w-4 h-4" /> البلاغات
                        </TabsTrigger>
                        <TabsTrigger value="moderation" className="gap-2">
                            <BookMarked className="w-4 h-4" /> مراجعة المحتوى
                        </TabsTrigger>
                        <TabsTrigger value="financials" className="gap-2">
                            <DollarSign className="w-4 h-4" /> المالية
                        </TabsTrigger>
                        <TabsTrigger value="orders" className="gap-2">
                            <AlertTriangle className="w-4 h-4" /> في انتظار التأكيد
                        </TabsTrigger>
                        <TabsTrigger value="global_orders" className="gap-2">
                            <Package className="w-4 h-4" /> الطلبات العالمية
                        </TabsTrigger>
                        <TabsTrigger value="sellers" className="gap-2">
                            <Users className="w-4 h-4" /> إدارة المبدعين
                        </TabsTrigger>
                        <TabsTrigger value="payouts" className="gap-2">
                            <Wallet className="w-4 h-4" /> طلبات السحب
                        </TabsTrigger>
                        <TabsTrigger value="physical" className="gap-2">
                            <Truck className="w-4 h-4" /> الشحنات المادية
                        </TabsTrigger>
                        <TabsTrigger value="subscriptions" className="gap-2">
                            <Lock className="w-4 h-4" /> الاشتراكات
                        </TabsTrigger>
                        <TabsTrigger value="upgrade_requests" className="gap-2">
                            <Crown className="w-4 h-4" /> طلبات الترقية
                        </TabsTrigger>
                        <TabsTrigger value="media" className="gap-2">
                            <Video className="w-4 h-4" /> مركز الوسائط
                        </TabsTrigger>
                        <TabsTrigger value="messaging" className="gap-2 relative">
                            <MessageSquare className="w-4 h-4" />
                            الرسائل
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold border-2 border-background">
                                    {unreadCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="marketing" className="gap-2">
                            <Megaphone className="w-4 h-4" /> التسويق
                        </TabsTrigger>
                        <TabsTrigger value="community" className="gap-2">
                            <MessageCircle className="w-4 h-4" /> المجتمع
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2">
                            <Settings className="w-4 h-4" /> الإعدادات
                        </TabsTrigger>
                        <TabsTrigger value="commissions" className="gap-2 relative">
                            <PenTool className="w-4 h-4" /> طلبات التصميم
                            {requestsResponse?.data?.some((r: any) => r.status === 'payment_under_review') && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-600 rounded-full animate-pulse" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <History className="w-4 h-4" /> السجل العام
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <OverviewAdmin />
                    </TabsContent>

                    <TabsContent value="users">
                        <UsersAdmin />
                    </TabsContent>

                    <TabsContent value="security">
                        <SecurityAdmin />
                    </TabsContent>

                    <TabsContent value="reports">
                        <ReportsAdmin />
                    </TabsContent>

                    <TabsContent value="moderation">
                        <ContentModerationAdmin />
                    </TabsContent>

                    <TabsContent value="financials">
                        <FinancialsAdmin />
                    </TabsContent>

                    <TabsContent value="global_orders">
                        <GlobalOrdersAdmin />
                    </TabsContent>

                    <TabsContent value="commissions">
                        <CommissionsAdmin requestsResponse={requestsResponse} isLoading={commissionsLoading} />
                    </TabsContent>

                    <TabsContent value="subscriptions">
                        <SubscriptionsAdmin />
                    </TabsContent>

                    <TabsContent value="messaging">
                        <MessagingAdmin sellers={sellers || []} />
                    </TabsContent>

                    <TabsContent value="payouts">
                        <PayoutsAdmin />
                    </TabsContent>

                    <TabsContent value="physical">
                        <PhysicalOrdersAdmin />
                    </TabsContent>

                    <TabsContent value="media">
                        <MediaAdmin />
                    </TabsContent>

                    <TabsContent value="history">
                        <AdminHistory />
                    </TabsContent>

                    <TabsContent value="orders">
                        <Card className="glass-card border-primary/20 bg-black/60 shadow-2xl overflow-hidden mt-6">
                            <CardHeader className="bg-white/5 border-b border-white/5">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-2xl text-gradient">المدفوعات المحلية المعلقة</CardTitle>
                                        <CardDescription>قم بمراجعة قائمة الطلبات التي تنتظر التأكيد.</CardDescription>
                                    </div>
                                    <AlertTriangle className="w-8 h-8 text-primary/40" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {(!pendingOrders || pendingOrders.length === 0) ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500/50" />
                                        <p>لا توجد طلبات معلقة للمراجعة.</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-white/5">
                                            <TableRow className="border-white/10 hover:bg-transparent">
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">رقم الطلب</TableHead>
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">النوع</TableHead>
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المستخدم / العميل</TableHead>
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المنتجات</TableHead>
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المبلغ</TableHead>
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الطريقة</TableHead>
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المرجع</TableHead>
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الإثبات</TableHead>
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">التاريخ</TableHead>
                                                <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4 text-right">إجراءات</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingOrders.map((order: any) => (
                                                <TableRow key={order.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                                    <TableCell className="py-4 font-mono font-bold text-primary/60">#{order.id}</TableCell>
                                                    <TableCell className="py-4">
                                                        {order.shipping_address ? (
                                                            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1.5 font-bold text-[10px] uppercase">
                                                                <Truck className="w-3 h-3" /> مادي
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 font-bold text-[10px] uppercase">
                                                                <CreditCard className="w-3 h-3" /> رقمي
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <span className="font-bold text-foreground text-sm">{order.user?.display_name || order.user_id}</span>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex flex-col gap-1">
                                                            {order.order_items?.map((item: any, i: number) => (
                                                                <div key={i} className="text-xs flex items-center gap-1">
                                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/20">{item.quantity}x</Badge>
                                                                    <span className="text-foreground truncate max-w-[150px]">{item.product?.title || 'منتج غير معروف'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 font-black text-primary">{order.total_amount} <span className="text-[10px]">ج.م</span></TableCell>
                                                    <TableCell className="py-4">
                                                        <Badge variant="outline" className="capitalize border-primary/30 text-primary bg-primary/5 font-bold text-[10px]">
                                                            {order.payment_method?.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4 font-mono text-xs opacity-70">{order.payment_reference || 'غير متوفر'}</TableCell>
                                                    <TableCell className="py-4">
                                                        {order.payment_proof_url ? (
                                                            <a
                                                                href={order.payment_proof_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-primary hover:text-primary/70 transition-colors text-xs font-bold"
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" /> عرض
                                                            </a>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-tighter italic">لا توجد صورة</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-xs font-medium opacity-80">
                                                        {formatDate(order.created_at)}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right">
                                                        <div className="flex justify-end gap-3">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-destructive hover:bg-destructive/10 h-8"
                                                                onClick={() => {
                                                                    if (confirm('هل أنت متأكد أنك تريد رفض وإلغاء هذا الطلب؟'))
                                                                        rejectOrder.mutate(order.id);
                                                                }}
                                                                disabled={rejectOrder.isPending || verifyOrder.isPending}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1.5" /> رفض
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-500 text-white h-8 font-bold shadow-lg shadow-green-500/20"
                                                                onClick={() => verifyOrder.mutate(order.id)}
                                                                disabled={verifyOrder.isPending || rejectOrder.isPending}
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                                                {verifyOrder.isPending ? '...' : 'تأكيد'}
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
                    </TabsContent>

                    <TabsContent value="sellers">
                        <Card>
                            <CardHeader>
                                <CardTitle>مبدعو المنصة</CardTitle>
                                <CardDescription>إدارة الكُتاب والفنانين. تجميد الحسابات إذا لزم الأمر.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {sellersLoading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>المستخدم</TableHead>
                                                <TableHead>الدور</TableHead>
                                                <TableHead>البريد الإلكتروني</TableHead>
                                                <TableHead>الحالة</TableHead>
                                                <TableHead className="text-right">إجراءات</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sellers?.map((seller: any) => (
                                                <TableRow key={seller.id} className={!seller.is_active ? 'bg-destructive/10' : ''}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">
                                                                <img src={seller.avatar_url || `https://ui-avatars.com/api/?name=${seller.display_name}`} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                            <span className="font-medium">{seller.display_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="capitalize badge-cell">
                                                        <Badge variant="secondary">{seller.role === 'writer' ? 'كاتب' : seller.role === 'artist' ? 'فنان' : seller.role}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{seller.email}</TableCell>
                                                    <TableCell>
                                                        {seller.is_active ? (
                                                            <Badge className="bg-green-500 hover:bg-green-600">نشط</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">مجمد</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant={seller.is_active ? "destructive" : "outline"}
                                                            className="gap-2"
                                                            onClick={() => freezeSeller.mutate({ userId: seller.id, isActive: !seller.is_active })}
                                                            disabled={freezeSeller.isPending}
                                                        >
                                                            {seller.is_active ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                                            {seller.is_active ? "تجميد" : "إلغاء التجميد"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!sellers || sellers.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                        لا يوجد مبدعين.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="upgrade_requests">
                        <UpgradeRequestsAdmin />
                    </TabsContent>

                    <TabsContent value="marketing">
                        <MarketingAdmin />
                    </TabsContent>

                    <TabsContent value="community">
                        <CommunityAdmin />
                    </TabsContent>

                    <TabsContent value="settings">
                        <SettingsAdmin />
                    </TabsContent>
                </Tabs>
            </div>
            <Footer />
        </div>
    );
}
