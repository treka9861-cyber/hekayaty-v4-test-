import { useState, useEffect } from "react";
import { useUserOrders, type UserOrder, type UserOrderItem } from "@/hooks/use-physical-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FulfillmentStatusBadge } from "@/components/FulfillmentStatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { Package, Truck, Clock, MapPin, User, ExternalLink, Calendar, Hash, CheckCircle2, ChevronRight, ShoppingBag, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import dashboardBg from "@/assets/9814ae82-9631-4241-a961-7aec31f9aa4d_09-11-19.png";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function OrderTracking() {
    const { t, i18n } = useTranslation();
    const { data: orders = [], isLoading } = useUserOrders();
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

    // Auto-expand the first order if it exists
    useEffect(() => {
        if (orders.length > 0 && expandedOrders.size === 0) {
            setExpandedOrders(new Set([orders[0].orderId]));
        }
    }, [orders]);

    const toggleOrder = (id: number) => {
        const next = new Set(expandedOrders);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedOrders(next);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen relative bg-black flex flex-col items-center justify-center">
                <div
                    className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
                    style={{ backgroundImage: `url(${dashboardBg})` }}
                />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                        <Package className="w-20 h-20 animate-bounce text-primary mb-4 relative" />
                    </div>
                    <p className="text-xl font-serif text-white/70 animate-pulse tracking-[0.3em] font-bold">{t('orderTracking.loadingText')}</p>
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="min-h-screen relative flex flex-col">
                <Navbar />
                <div
                    className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${dashboardBg})` }}
                />
                <div className="fixed inset-0 z-0 bg-black/70 backdrop-blur-[2px]" />

                <div className="container mx-auto p-6 max-w-4xl text-center relative z-10 flex-grow flex items-center justify-center">
                    <div className="glass-card rounded-3xl p-16 border border-white/10 shadow-2xl backdrop-blur-xl bg-black/40 max-w-2xl w-full">
                        <Package className="w-20 h-20 mx-auto mb-6 text-primary/30" />
                        <h2 className="text-3xl font-serif font-bold mb-4 text-white">{t('orderTracking.noOrders2')}</h2>
                        <p className="text-white/60 mb-8 text-lg">{t('orderTracking.noOrders2Desc')}</p>
                        <Link href="/marketplace">
                            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-6 rounded-xl text-lg shadow-xl shadow-primary/20 group">
                                <ShoppingBag className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                {t('orderTracking.browseMarket')}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative flex flex-col pb-20">
            <Navbar />

            {/* Background Layer */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${dashboardBg})` }}
            />
            <div className="fixed inset-0 z-0 bg-black/70 backdrop-blur-[2px]" />

            <div className="container mx-auto p-6 max-w-5xl relative z-10 pt-28">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                            <Badge className="bg-primary/20 text-primary border-primary/30 py-1 px-4 text-xs font-bold uppercase tracking-widest">
                                {t('orderTracking.yourJourney')}
                            </Badge>
                        </div>
                        <h1 className="text-6xl font-serif font-bold text-white tracking-tight drop-shadow-2xl">{t('orderTracking.trackTitle')}</h1>
                        <p className="text-white/60 text-lg max-w-md italic font-serif">{t('orderTracking.trackSubtitle')}</p>
                    </div>
                    <div className="flex bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl items-center gap-4 border border-white/10 shadow-2xl ring-1 ring-white/5">
                        <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.8)]" />
                        <span className="text-sm font-black text-white tracking-widest uppercase">{orders.length} {t('orderTracking.totalOrders')}</span>
                    </div>
                </div>

                <div className="grid gap-10">
                    {orders.map((order: UserOrder) => {
                        const isExpanded = expandedOrders.has(order.orderId);
                        const orderDate = new Date(order.orderDate);
                        const formattedDate = orderDate.toLocaleDateString(i18n.language, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        });

                        return (
                            <div key={order.orderId} className="group/order">
                                <button
                                    onClick={() => toggleOrder(order.orderId)}
                                    className={cn(
                                        "w-full flex items-center justify-between gap-4 px-8 py-5 rounded-3xl border transition-all duration-500",
                                        isExpanded
                                            ? "bg-primary/20 border-primary/40 shadow-[0_0_40px_rgba(var(--primary),0.1)] ring-1 ring-primary/30"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl"
                                    )}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                            isExpanded ? "bg-primary text-white scale-110 rotate-[10deg]" : "bg-white/5 text-primary"
                                        )}>
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">{t('orderTracking.date')}</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl font-serif font-bold text-white">{formattedDate}</span>
                                                <Badge className="bg-black/40 text-primary font-mono text-[10px] py-0 border-primary/20">#{order.orderId}</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="hidden md:flex flex-col items-end">
                                            <p className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">{t('orderTracking.items')}</p>
                                            <p className="text-sm font-bold text-white">{order.items.length} {t('orderTracking.items')}</p>
                                        </div>
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 transition-transform duration-500",
                                            isExpanded ? "rotate-180 bg-primary/20 border-primary/20" : ""
                                        )}>
                                            <ChevronDown className={cn("w-5 h-5 transition-colors", isExpanded ? "text-primary" : "text-white/40")} />
                                        </div>
                                    </div>
                                </button>

                                <div className={cn(
                                    "grid transition-all duration-700 ease-in-out overflow-hidden",
                                    isExpanded ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0"
                                )}>
                                    <div className="min-h-0 space-y-6">
                                        {order.items.map((item: UserOrderItem) => (
                                            <div key={item.orderItemId} className="glass-card overflow-hidden rounded-[2rem] border border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-primary/30 transition-all duration-500">
                                                <div className="p-10">
                                                    <div className="flex flex-col lg:flex-row gap-12">
                                                        {/* Left Column */}
                                                        <div className="flex-grow space-y-10">
                                                            <div className="flex items-start gap-8">
                                                                <div className="relative flex-shrink-0 group">
                                                                    <div className="absolute inset-[-10px] bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    <img
                                                                        src={item.productCoverUrl}
                                                                        alt={item.productTitle}
                                                                        className="relative w-32 h-44 object-cover rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3"
                                                                    />
                                                                    <div className="absolute -top-4 -right-4 bg-primary text-white text-sm w-9 h-9 flex items-center justify-center rounded-2xl font-black shadow-2xl ring-4 ring-black">
                                                                        {item.quantity || 1}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-3 pt-2">
                                                                    <div className="flex items-center gap-3">
                                                                        <FulfillmentStatusBadge status={item.fulfillmentStatus} />
                                                                        <Badge className="bg-white/5 text-white/40 border-white/5 text-[10px] font-mono">ID: {item.orderItemId}</Badge>
                                                                    </div>
                                                                    <h3 className="text-4xl font-serif font-bold text-white leading-tight">{item.productTitle}</h3>
                                                                    <p className="text-primary font-bold flex items-center gap-2 group cursor-pointer hover:text-primary/80 transition-colors">
                                                                        <User className="w-4 h-4" />
                                                                        {t('orderTracking.seller')}: {item.makerName} <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Timeline */}
                                                            <div className="bg-white/10 rounded-3xl p-8 border border-white/10 shadow-inner relative overflow-hidden group/timeline">
                                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                                                                <OrderTimeline status={item.fulfillmentStatus} />
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                                                                {/* Shipping Details */}
                                                                <div className="space-y-5 p-6 rounded-[2rem] bg-white/5 border border-white/5 shadow-xl transition-colors hover:bg-white/[0.07]">
                                                                    <h4 className="flex items-center gap-3 font-black text-xs uppercase tracking-[0.3em] text-white/30">
                                                                        <MapPin className="w-4 h-4 text-primary" />
                                                                        {t('orderTracking.shippingTo')}
                                                                    </h4>
                                                                    {order.shippingAddress ? (
                                                                        <div className="text-base space-y-3">
                                                                            <p className="font-bold text-white text-xl">{order.shippingAddress.fullName}</p>
                                                                            <div className="text-white/60 space-y-1.5 leading-relaxed font-medium">
                                                                                <p>{order.shippingAddress.addressLine}</p>
                                                                                <p>{order.shippingAddress.city}</p>
                                                                                <div className="pt-3">
                                                                                    <div className="inline-flex items-center gap-3 bg-primary/20 text-primary px-4 py-2 rounded-xl text-sm font-black ring-1 ring-primary/20">
                                                                                        <span>📞</span> {order.shippingAddress.phoneNumber}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                                                            <MapPin className="w-10 h-10 mb-2" />
                                                                            <p className="text-sm italic font-serif">{t('orderTracking.trackSubtitle')}</p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Arrival */}
                                                                <div className="space-y-5 p-6 rounded-[2rem] bg-white/5 border border-white/5 shadow-xl transition-colors hover:bg-white/[0.07]">
                                                                    <h4 className="flex items-center gap-3 font-black text-xs uppercase tracking-[0.3em] text-white/30">
                                                                        <Clock className="w-4 h-4 text-primary" />
                                                                        {t('orderTracking.estimatedArrival')}
                                                                    </h4>
                                                                    <div className="space-y-6">
                                                                        {item.fulfillmentStatus === 'delivered' ? (
                                                                            <div className="flex items-center gap-4 bg-green-500/20 p-5 rounded-2xl border border-green-500/30">
                                                                                <CheckCircle2 className="w-8 h-8 text-green-400" />
                                                                                <div>
                                                                                    <p className="font-black text-green-400 uppercase tracking-widest text-xs">{t('orderTracking.statuses.delivered')}</p>
                                                                                    <p className="text-white font-bold text-lg">{new Date(item.deliveredAt || Date.now()).toLocaleDateString()}</p>
                                                                                </div>
                                                                            </div>
                                                                        ) : item.estimatedDeliveryDays ? (
                                                                            <div className="space-y-2">
                                                                                <div className="flex items-baseline gap-2">
                                                                                    <p className="text-5xl font-serif font-bold text-primary">{item.estimatedDeliveryDays}</p>
                                                                                    <p className="text-lg font-serif font-bold text-primary/60">{t('orderTracking.days')}</p>
                                                                                </div>
                                                                                <p className="text-white/60 text-sm font-medium">
                                                                                    {t('orderTracking.estimatedArrival')}: <span className="font-bold text-white uppercase tracking-tighter">
                                                                                        {(() => {
                                                                                            const date = new Date(item.acceptedAt || Date.now());
                                                                                            date.setDate(date.getDate() + (item.estimatedDeliveryDays || 0));
                                                                                            return date.toLocaleDateString(i18n.language, { weekday: 'long', month: 'short', day: 'numeric' });
                                                                                        })()}
                                                                                    </span>
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center animate-spin-slow mb-3">
                                                                                    <Clock className="w-6 h-6 text-white/20" />
                                                                                </div>
                                                                                <p className="text-sm text-white/40 italic font-serif">{t('orderTracking.trackSubtitle')}</p>
                                                                            </div>
                                                                        )}

                                                                        {item.trackingNumber && (
                                                                            <div className="pt-6 border-t border-white/5">
                                                                                <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black mb-3">{t('orderTracking.trackingNumber')}</h4>
                                                                                <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/10 group cursor-pointer hover:border-primary/50 transition-all shadow-inner">
                                                                                    <span className="font-mono text-primary font-black text-lg tracking-wider">{item.trackingNumber}</span>
                                                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 group-hover:bg-primary/20 transition-colors">
                                                                                        <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Rejection Message */}
                                                    {item.fulfillmentStatus === 'rejected' && item.rejectionReason && (
                                                        <div className="mt-10 p-8 bg-red-500/10 rounded-[2rem] border border-red-500/20 backdrop-blur-md shadow-2xl relative overflow-hidden">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                                                            <div className="flex items-center gap-4 mb-4">
                                                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                                                                <h4 className="text-sm font-black uppercase tracking-[0.4em] text-red-400">{t('orderTracking.seller')}</h4>
                                                            </div>
                                                            <p className="text-white/80 italic text-lg leading-relaxed font-serif pl-7">"{item.rejectionReason}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function FulfillmentStatusBadgeWrapper({ status }: { status: string }) {
    return <FulfillmentStatusBadge status={status} />;
}
