import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslation } from "react-i18next";
import {
    Bell,
    Check,
    Search,
    Filter,
    Settings,
    ShoppingCart,
    Inbox,
    UserPlus,
    TrendingUp,
    Trophy,
    MessageSquare,
    ChevronRight,
    MoreVertical,
    Trash2,
    BellOff,
    Feather
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function NotificationsPage() {
    const { notifications, isLoading, markRead, markAllRead } = useNotifications();
    const { t } = useTranslation();
    const [, setLocation] = useLocation();
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    const filteredNotifications = notifications.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
            n.content.toLowerCase().includes(search.toLowerCase());

        if (activeTab === "unread") return matchesSearch && !n.isRead;
        if (activeTab === "all") return matchesSearch;
        return matchesSearch && n.type === activeTab;
    });

    const getIcon = (type: string) => {
        const className = "w-5 h-5";
        switch (type) {
            case 'commerce': return <div className="p-2 rounded-full bg-blue-500/10 text-blue-400"><ShoppingCart className={className} /></div>;
            case 'content': return <div className="p-2 rounded-full bg-purple-500/10 text-purple-400"><Inbox className={className} /></div>;
            case 'social': return <div className="p-2 rounded-full bg-green-500/10 text-green-400"><UserPlus className={className} /></div>;
            case 'creator': return <div className="p-2 rounded-full bg-orange-500/10 text-orange-400"><TrendingUp className={className} /></div>;
            case 'engagement': return <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-400"><Trophy className={className} /></div>;
            case 'store': return <div className="p-2 rounded-full bg-pink-500/10 text-pink-400"><MessageSquare className={className} /></div>;
            default: return <div className="p-2 rounded-full bg-gray-500/10 text-gray-400"><Bell className={className} /></div>;
        }
    };

    const handleAction = (n: any) => {
        if (!n.isRead) markRead(n.id);
        if (n.link) setLocation(n.link);
    };

    return (
        <div className="min-h-screen bg-[#0f0a08]">
            <Navbar />

            <main className="max-w-5xl mx-auto px-4 pt-24 pb-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <h1 className="font-serif text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mb-2">
                            {t("notifications.pageTitle", "مركز الإشعارات")}
                        </h1>
                        <p className="text-muted-foreground max-w-lg">
                            {t("notifications.pageSubtitle", "ابق مطلعاً على طلباتك، مبيعاتك، وتفاعلات مجتمعك.")}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => markAllRead()} className="bg-white/5 border-white/10 hover:bg-white/10">
                            <Check className="w-4 h-4 mr-2" />
                            {t("notifications.markAllRead", "تحديد الكل كمقروء")}
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10">
                            <Settings className="w-4 h-4 mr-2" />
                            {t("notifications.settings", "الإعدادات")}
                        </Button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t("notifications.searchPlaceholder", "ابحث في الإشعارات...")}
                            className="pl-10 bg-white/5 border-white/10 focus:ring-primary/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content Area */}
                <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                    <div className="overflow-x-auto pb-2 mb-4 scrollbar-hide">
                        <TabsList className="bg-white/5 border border-white/10 p-1 w-full sm:w-auto h-auto min-w-max">
                            <TabsTrigger value="all" className="px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-tighter text-[10px] font-bold">
                                {t("notifications.filter.all", "الكل")}
                            </TabsTrigger>
                            <TabsTrigger value="unread" className="px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-tighter text-[10px] font-bold">
                                {t("notifications.filter.unread", "غير مقروء")}
                            </TabsTrigger>
                            <TabsTrigger value="commerce" className="px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-tighter text-[10px] font-bold">
                                {t("notifications.filter.commerce", "التجارة")}
                            </TabsTrigger>
                            <TabsTrigger value="social" className="px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-tighter text-[10px] font-bold">
                                {t("notifications.filter.social", "اجتماعي")}
                            </TabsTrigger>
                            <TabsTrigger value="creator" className="px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-tighter text-[10px] font-bold">
                                {t("notifications.filter.creator", "صانع محتوى")}
                            </TabsTrigger>
                            <TabsTrigger value="store" className="px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-white uppercase tracking-tighter text-[10px] font-bold">
                                {t("notifications.filter.store", "المتجر")}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <Card className="bg-[#1a0f0a]/60 backdrop-blur-md border-white/5 overflow-hidden">
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center p-20 gap-4">
                                    <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                    <p className="text-muted-foreground animate-pulse">{t("common.loading", "جارٍ تحميل الإشعارات...")}</p>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-20 text-center">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                        <BellOff className="w-10 h-10 text-muted-foreground/20" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-foreground/80">{t("notifications.emptyTitle", "هدوء وسلام")}</h3>
                                    <p className="text-muted-foreground max-w-xs">{t("notifications.emptyDescription", "لا توجد لديك أي إشعارات في هذه الفئة حالياً.")}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {filteredNotifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleAction(n)}
                                            className={cn(
                                                "group relative flex items-start gap-4 p-6 transition-all duration-300 cursor-pointer border-b border-white/5 last:border-0",
                                                !n.isRead ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-white/5"
                                            )}
                                        >
                                            {/* Priority Gradient Glow */}
                                            {!n.isRead && n.priority === 'high' && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-transparent" />
                                            )}

                                            <div className="flex-shrink-0 mt-1">
                                                {getIcon(n.type)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className={cn(
                                                            "text-lg font-bold transition-colors",
                                                            !n.isRead ? "text-primary" : "text-foreground"
                                                        )}>
                                                            {n.title}
                                                        </h4>
                                                        {n.priority === 'high' && (
                                                            <Badge className="bg-primary hover:bg-primary text-white text-[10px] animate-pulse">
                                                                {t("notifications.priority.high", "عاجل")}
                                                            </Badge>
                                                        )}
                                                        {!n.isRead && (
                                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                                                        {formatDistanceToNow(new Date(n.createdAt!), { addSuffix: true })}
                                                    </p>
                                                </div>

                                                <p className="text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                                                    {n.content}
                                                </p>

                                                <div className="flex items-center gap-4">
                                                    {n.link && (
                                                        <Button
                                                            variant="link"
                                                            className="p-0 h-auto text-primary font-bold text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform"
                                                        >
                                                            {t("common.viewDetails", "عرض التفاصيل")}
                                                            <ChevronRight className="w-3 h-3 ml-1" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Item Actions */}
                                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-[#1a0f0a] border-white/10">
                                                        {!n.isRead && (
                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markRead(n.id); }}>
                                                                <Check className="w-4 h-4 mr-2" /> {t("notifications.markAsRead", "تحديد كمقروء")}
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem className="text-destructive">
                                                            <Trash2 className="w-4 h-4 mr-2" /> {t("common.delete", "حذف")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Tabs>

                {/* Bottom Tips */}
                <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5">
                    <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-tr from-primary to-accent p-2 rounded-lg">
                            <Feather className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-serif font-bold text-gradient">Hekayaty</h1>
                            <h4 className="font-bold text-lg mb-1">{t("notifications.tipsTitle", "تفضيلات الإشعارات")}</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t("notifications.tipsDescription", "يمكنك تخصيص كيفية ووقت تلقي الإشعارات في إعداداتك. اختر بين التنبيهات داخل التطبيق، والبريد الإلكتروني، والإشعارات المباشرة.")}
                            </p>
                            <Button variant="outline" size="sm" className="bg-white/5 border-white/10">{t("notifications.configure", "إعداد التنبيهات")}</Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
