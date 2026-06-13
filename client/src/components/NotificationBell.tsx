import { useState } from "react";
import { Bell, Check, X, ExternalLink, Inbox, MessageSquare, ShoppingCart, TrendingUp, Trophy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function NotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
    const { t } = useTranslation();
    const [, setLocation] = useLocation();

    const getIcon = (type: string) => {
        switch (type) {
            case 'commerce': return <ShoppingCart className="w-4 h-4 text-blue-400" />;
            case 'content': return <Inbox className="w-4 h-4 text-purple-400" />;
            case 'social': return <UserPlus className="w-4 h-4 text-green-400" />;
            case 'creator': return <TrendingUp className="w-4 h-4 text-orange-400" />;
            case 'engagement': return <Trophy className="w-4 h-4 text-yellow-400" />;
            case 'store': return <MessageSquare className="w-4 h-4 text-pink-400" />;
            default: return <Bell className="w-4 h-4 text-gray-400" />;
        }
    };

    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            markRead(notification.id);
        }
        if (notification.link) {
            setLocation(notification.link);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 text-foreground hover:text-primary transition-all active:scale-95"
                    aria-label="فتح الإشعارات"
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[10px] items-center justify-center font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[380px] p-0 bg-[#1a0f0a]/95 backdrop-blur-xl border-white/10 shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="font-serif text-lg font-bold text-primary">{t("notifications.title", "الإشعارات")}</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllRead()}
                            className="h-8 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            <Check className="w-3 h-3 mr-1" />
                            {t("notifications.markAllRead", "تعيين الكل كمقروء")}
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-center p-6 bg-white/5 mx-4 my-2 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Bell className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                            <p className="text-muted-foreground font-medium">{t("notifications.empty", "لا توجد إشعارات بعد")}</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">سنعلمك عندما يحدث شيء مهم.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={cn(
                                        "relative flex gap-4 p-4 transition-all duration-200 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-0",
                                        !n.isRead && "bg-primary/5 border-l-2 border-l-primary"
                                    )}
                                >
                                    <div className={cn(
                                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/5",
                                        n.priority === 'high' && "ring-1 ring-primary/30"
                                    )}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <p className={cn(
                                                "text-sm font-semibold truncate transition-colors",
                                                !n.isRead ? "text-primary" : "text-foreground/90"
                                            )}>
                                                {n.title}
                                            </p>
                                            {n.priority === 'high' && (
                                                <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0 px-1 border-primary/30 text-primary animate-pulse">
                                                    {t("notifications.priority.high", "عاجل")}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-muted-foreground leading-snug line-clamp-2 mb-2">
                                            {n.content}
                                        </p>
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                                            <span>{formatDistanceToNow(new Date(n.createdAt!), { addSuffix: true })}</span>
                                            {n.link && <ExternalLink className="w-3 h-3 ml-auto opacity-40" />}
                                        </div>
                                    </div>
                                    {!n.isRead && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DropdownMenuSeparator className="bg-white/10" />
                <Link href="/notifications">
                    <div className="p-3 text-center transition-colors hover:bg-white/5 cursor-pointer">
                        <span className="text-sm font-medium text-primary hover:text-primary-foreground">
                            {t("notifications.viewAll", "عرض جميع الإشعارات")}
                        </span>
                    </div>
                </Link>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
