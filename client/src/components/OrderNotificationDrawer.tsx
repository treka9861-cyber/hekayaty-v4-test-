import { useOrderNotifications, type OrderNotification } from "@/hooks/use-physical-orders";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Package, CheckCircle2, Truck, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export function OrderNotificationDrawer() {
    const [open, setOpen] = useState(false);
    const { data: notifications = [], isLoading } = useOrderNotifications();
    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'order_accepted': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'order_shipped': return <Truck className="w-5 h-5 text-blue-500" />;
            case 'order_delivered': return <Package className="w-5 h-5 text-purple-500" />;
            case 'order_rejected': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button className="relative p-2 rounded-full hover:bg-muted transition-colors group">
                    <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader className="pb-6 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        إشعارات الطلبات
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                            <p className="text-muted-foreground font-medium">لا توجد تحديثات للطلبات بعد</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">ستظهر تحديثات شحناتك هنا</p>
                        </div>
                    ) : (
                        notifications.map((notification: OrderNotification) => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-xl border transition-all hover:bg-muted/50 group relative cursor-pointer ${notification.isRead ? 'opacity-70 grayscale-[0.3]' : 'bg-primary/5 border-primary/20 shadow-sm ring-1 ring-primary/10'
                                    }`}
                                onClick={() => {
                                    setOpen(false);
                                    window.location.href = '/track-orders';
                                }}
                            >
                                {!notification.isRead && (
                                    <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                                )}

                                <div className="flex gap-4">
                                    <div className="mt-1 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm border">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                                            {notification.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {notification.message}
                                        </p>
                                        <div className="mt-2 flex items-center gap-4">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <Badge variant="outline" className="text-[8px] h-4 font-bold border-muted-foreground/30">
                                                ORDR #{notification.orderId}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function Clock(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
