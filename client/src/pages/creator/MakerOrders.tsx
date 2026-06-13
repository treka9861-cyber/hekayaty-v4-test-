import { useState } from "react";
import { useMakerOrders, useAcceptOrder, useRejectOrderItem, useUpdateShipment, type MakerOrder } from "@/hooks/use-physical-orders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FulfillmentStatusBadge } from "@/components/FulfillmentStatusBadge";
import { Badge } from "@/components/ui/badge";
import { User, Hash, DollarSign, Calendar, MapPin, CheckCircle, XCircle, Package, Truck, Info, Search, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function MakerOrders() {
    const { t } = useTranslation();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const { data: rawOrders = [], isLoading } = useMakerOrders(statusFilter);
    const orders = [...rawOrders].sort((a: MakerOrder, b: MakerOrder) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
    const acceptOrder = useAcceptOrder();
    const rejectOrder = useRejectOrderItem();
    const updateShipment = useUpdateShipment();

    // Modal states
    const [acceptModal, setAcceptModal] = useState<{ open: boolean; orderItemId?: number }>({ open: false });
    const [rejectModal, setRejectModal] = useState<{ open: boolean; orderItemId?: number }>({ open: false });
    const [shipModal, setShipModal] = useState<{ open: boolean; orderItemId?: number }>({ open: false });
    const [detailsModal, setDetailsModal] = useState<{ open: boolean; order?: MakerOrder }>({ open: false });

    // Form states
    const [deliveryDays, setDeliveryDays] = useState(5);
    const [rejectionReason, setRejectionReason] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [carrier, setCarrier] = useState("");

    const handleAccept = async () => {
        if (acceptModal.orderItemId) {
            await acceptOrder.mutateAsync({
                orderItemId: acceptModal.orderItemId,
                estimatedDeliveryDays: deliveryDays
            });
            setAcceptModal({ open: false });
            setDeliveryDays(5);
        }
    };

    const handleReject = async () => {
        if (rejectModal.orderItemId && rejectionReason.trim()) {
            await rejectOrder.mutateAsync({
                orderItemId: rejectModal.orderItemId,
                reason: rejectionReason.trim()
            });
            setRejectModal({ open: false });
            setRejectionReason("");
        }
    };

    const handleShip = async () => {
        if (shipModal.orderItemId && trackingNumber.trim()) {
            await updateShipment.mutateAsync({
                orderItemId: shipModal.orderItemId,
                trackingNumber: trackingNumber.trim(),
                carrier: carrier.trim() || undefined
            });
            setShipModal({ open: false });
            setTrackingNumber("");
            setCarrier("");
        }
    };

    const statusTabs = ['All', 'pending', 'accepted', 'preparing', 'shipped', 'delivered', 'rejected'];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <Package className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-sm text-muted-foreground font-medium">{t('dashboard.makerOrders.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-6 px-4 pt-4">
                <h2 className="text-xl font-bold mb-1">{t('dashboard.makerOrders.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('dashboard.makerOrders.subtitle')}</p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 px-4">
                {statusTabs.map(status => (
                    <Button
                        key={status}
                        variant={statusFilter === (status === 'All' ? undefined : status) ? 'default' : 'outline'}
                        onClick={() => setStatusFilter(status === 'All' ? undefined : status)}
                        size="sm"
                    >
                        {status === 'All' ? t('dashboard.makerOrders.filterAll') : t(`orderTracking.statuses.${status}`)}
                        {status !== 'All' && (
                            <span className="ml-2 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                                {orders.filter((o: MakerOrder) => o.fulfillmentStatus === status).length}
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Orders List */}
            <div className="px-4 pb-4">
                {orders.length === 0 ? (
                    <Card className="p-12 text-center bg-muted/20 border-border/50">
                        <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                        <h3 className="text-xl font-semibold mb-2">{t('dashboard.makerOrders.noOrders')}</h3>
                        <p className="text-muted-foreground">
                            {statusFilter
                                ? t('dashboard.makerOrders.noStatusOrders', { status: t(`orderTracking.statuses.${statusFilter}`) })
                                : t('dashboard.makerOrders.emptyState')}
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {orders.map((order: MakerOrder) => (
                            <Card key={order.orderItemId} className="glass-card p-0 overflow-hidden border border-white/10 hover:border-primary/30 transition-all group">
                                <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono">#{order.orderItemId}</Badge>
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                            {formatDate(order.orderDate)}
                                        </span>
                                    </div>
                                    <FulfillmentStatusBadge status={order.fulfillmentStatus} />
                                </div>
                                <div className="p-6 flex flex-col lg:flex-row gap-8">
                                    {/* Product Info */}
                                    <div className="flex gap-6 flex-1">
                                        <div className="relative group/img">
                                            <img
                                                src={order.productCoverUrl}
                                                alt={order.productTitle}
                                                className="w-24 h-32 object-cover rounded-xl shadow-2xl transition-transform group-hover/img:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity rounded-xl flex items-end p-2">
                                                <p className="text-[10px] text-white font-bold truncate">{order.productTitle}</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <h3 className="font-bold text-xl text-gradient group-hover:tracking-tight transition-all">{order.productTitle}</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                                                <div className="flex items-center gap-2.5 text-muted-foreground/80">
                                                    <div className="p-1 bg-blue-500/10 rounded text-blue-500">
                                                        <User className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="font-medium text-foreground">{order.buyerName}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-muted-foreground/80">
                                                    <div className="p-1 bg-purple-500/10 rounded text-purple-500">
                                                        <Hash className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="font-bold">{t('dashboard.makerOrders.qty')}: {order.quantity || 1}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-muted-foreground/80">
                                                    <div className="p-1 bg-green-500/10 rounded text-green-500">
                                                        <DollarSign className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="font-black text-primary">{(order.price || 0) * (order.quantity || 1)} {t('common.egp')}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-muted-foreground/80">
                                                    <div className="p-1 bg-amber-500/10 rounded text-amber-500">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span>{formatDate(order.orderDate)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shipping Address */}
                                    {order.shippingAddress && (
                                        <div
                                            className="bg-white/5 p-4 rounded-xl min-w-[240px] cursor-pointer hover:bg-white/10 transition-all border border-white/5 hover:border-primary/30 group/addr shadow-inner"
                                            onClick={() => setDetailsModal({ open: true, order })}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-primary/20 rounded-lg group-hover/addr:bg-primary group-hover/addr:text-primary-foreground transition-all">
                                                        <MapPin className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-xs uppercase tracking-widest text-primary/70">{t('dashboard.makerOrders.shippingInfo')}</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/addr:translate-x-1 transition-transform" />
                                            </div>
                                            <div className="text-sm space-y-1.5">
                                                <p className="font-bold text-foreground">{order.shippingAddress.fullName}</p>
                                                <p className="text-xs text-muted-foreground/80 leading-relaxed italic">"{order.shippingAddress.addressLine}"</p>
                                                <div className="flex items-center gap-2 text-primary font-mono text-xs pt-1">
                                                    <Truck className="w-3.5 h-3.5" />
                                                    {order.shippingAddress.phoneNumber}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 min-w-[140px]">
                                        {order.fulfillmentStatus === 'pending' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => setAcceptModal({ open: true, orderItemId: order.orderItemId })}
                                                    className="w-full"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    {t('dashboard.makerOrders.accept')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setRejectModal({ open: true, orderItemId: order.orderItemId })}
                                                    className="w-full"
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    {t('dashboard.makerOrders.reject')}
                                                </Button>
                                            </>
                                        )}

                                        {(order.fulfillmentStatus === 'accepted' || order.fulfillmentStatus === 'preparing') && (
                                            <Button
                                                size="sm"
                                                onClick={() => setShipModal({ open: true, orderItemId: order.orderItemId })}
                                                className="w-full"
                                            >
                                                <Truck className="w-4 h-4 mr-2" />
                                                {t('dashboard.makerOrders.shipOrder')}
                                            </Button>
                                        )}

                                        {order.fulfillmentStatus === 'shipped' && order.trackingNumber && (
                                            <div className="text-sm bg-muted p-3 rounded">
                                                <p className="font-medium mb-1">{t('dashboard.makerOrders.tracking')}</p>
                                                <p className="text-xs font-mono">{order.trackingNumber}</p>
                                            </div>
                                        )}

                                        {order.fulfillmentStatus === 'rejected' && order.rejectionReason && (
                                            <div className="text-sm bg-destructive/10 p-3 rounded text-destructive">
                                                <p className="font-medium mb-1">{t('dashboard.makerOrders.rejectedLabel')}</p>
                                                <p className="text-xs">{order.rejectionReason}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Accept Order Modal */}
            <Dialog open={acceptModal.open} onOpenChange={(open) => setAcceptModal({ open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dashboard.makerOrders.modals.acceptTitle')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="delivery-days">{t('dashboard.makerOrders.modals.estDelivery')}</Label>
                            <Input
                                id="delivery-days"
                                type="number"
                                min="1"
                                max="90"
                                value={deliveryDays}
                                onChange={(e) => setDeliveryDays(parseInt(e.target.value) || 1)}
                                className="mt-2"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('dashboard.makerOrders.modals.estDeliveryDesc')}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAcceptModal({ open: false })}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleAccept} disabled={acceptOrder.isPending}>
                            {acceptOrder.isPending ? t('dashboard.makerOrders.modals.accepting') : t('dashboard.makerOrders.modals.confirmAcceptance')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Order Modal */}
            <Dialog open={rejectModal.open} onOpenChange={(open) => setRejectModal({ open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dashboard.makerOrders.modals.rejectTitle')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="rejection-reason">{t('dashboard.makerOrders.modals.rejectionReason')}</Label>
                            <Textarea
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder={t('dashboard.makerOrders.modals.rejectionPlaceholder')}
                                className="mt-2"
                                rows={4}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('dashboard.makerOrders.modals.rejectionDesc')}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectModal({ open: false })}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={rejectOrder.isPending || rejectionReason.trim().length < 5}
                        >
                            {rejectOrder.isPending ? t('dashboard.makerOrders.modals.rejecting') : t('dashboard.makerOrders.modals.rejectTitle')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ship Order Modal */}
            <Dialog open={shipModal.open} onOpenChange={(open) => setShipModal({ open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dashboard.makerOrders.modals.shipTitle')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="tracking-number">{t('dashboard.makerOrders.modals.trackingNumber')} *</Label>
                            <Input
                                id="tracking-number"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="مثال: 1Z999AA10123456784"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="carrier">{t('dashboard.makerOrders.modals.carrier')}</Label>
                            <Input
                                id="carrier"
                                value={carrier}
                                onChange={(e) => setCarrier(e.target.value)}
                                placeholder="مثال: DHL، أرامكس، فيديكس"
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShipModal({ open: false })}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleShip}
                            disabled={updateShipment.isPending || trackingNumber.trim().length < 3}
                        >
                            {updateShipment.isPending ? t('dashboard.makerOrders.modals.updating') : t('dashboard.makerOrders.modals.markAsShipped')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detailed Shipping Info Modal */}
            <Dialog open={detailsModal.open} onOpenChange={(open) => setDetailsModal({ ...detailsModal, open })}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            <MapPin className="w-6 h-6 text-primary" />
                            {t('dashboard.makerOrders.modals.deliveryDetails')}
                        </DialogTitle>
                    </DialogHeader>

                    {detailsModal.order && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.makerOrders.modals.buyerInfo')}</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">{(detailsModal.order as any).buyerName}</p>
                                                <p className="text-xs text-muted-foreground">{t('dashboard.makerOrders.modals.buyerInfo')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">{new Date((detailsModal.order as any).orderDate).toLocaleDateString()}</p>
                                                <p className="text-xs text-muted-foreground">{t('orderTracking.date')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.makerOrders.modals.productInfo')}</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <img src={(detailsModal.order as any).productCoverUrl} className="w-10 h-10 rounded-lg object-cover border" />
                                            <div>
                                                <p className="text-sm font-semibold truncate max-w-[120px]">{(detailsModal.order as any).productTitle}</p>
                                                <p className="text-xs text-muted-foreground">{t('dashboard.makerOrders.qty')}: {(detailsModal.order as any).quantity || 1}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {((detailsModal.order as any).customizationData) && Object.keys((detailsModal.order as any).customizationData).length > 0 && (
                                <div className="space-y-4 pt-4 border-t">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.makerOrders.modals.customizationDetails')}</h4>
                                    <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                                        {Object.entries((detailsModal.order as any).customizationData as Record<string, string>).map(([key, value]) => (
                                            <div key={key} className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-amber-600/70">{key}</span>
                                                <span className="text-sm font-medium text-amber-900">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {((detailsModal.order as any).shippingAddress) && (
                                <div className="space-y-4 pt-4 border-t">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('dashboard.makerOrders.modals.shippingAddress')}</h4>
                                    <div className="bg-muted/50 p-6 rounded-2xl space-y-4 border border-border">
                                        <div className="flex items-start gap-4">
                                            <MapPin className="w-5 h-5 text-primary mt-1" />
                                            <div className="space-y-1 flex-1">
                                                <p className="font-bold text-lg">{(detailsModal.order as any).shippingAddress.fullName}</p>
                                                <p className="text-muted-foreground leading-relaxed">
                                                    {(detailsModal.order as any).shippingAddress.addressLine}
                                                </p>
                                                <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold mt-2">
                                                    {(detailsModal.order as any).shippingAddress.city}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center overflow-hidden">
                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold">{t('dashboard.makerOrders.modals.contactNumber')}</p>
                                                <p className="text-lg font-mono font-bold tracking-wider">{(detailsModal.order as any).shippingAddress.phoneNumber}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                    <Truck className="w-4 h-4 text-amber-600" />
                                </div>
                                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                    {t('dashboard.makerOrders.modals.shippingTip')}
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button className="w-full" onClick={() => setDetailsModal({ open: false })}>
                            {t('dashboard.makerOrders.modals.close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div>
    );
}
