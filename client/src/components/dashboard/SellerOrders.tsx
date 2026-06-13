import { useState } from "react";
import { useSellerOrders, useFulfillOrder, SellerOrderItem } from "@/hooks/use-seller-orders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Package, Truck, CheckCircle, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function SellerOrders() {
    const { data: items, isLoading } = useSellerOrders();
    const fulfillMutation = useFulfillOrder();

    // State for Fulfillment Dialog
    const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [trackingNumber, setTrackingNumber] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!items || items.length === 0) {
        return (
            <div className="text-center py-12 glass-card rounded-xl">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">لا توجد طلبات بعد</h3>
                <p className="text-muted-foreground">عندما تقوم بمبيعات، ستظهر هنا.</p>
            </div>
        );
    }

    // Group items by Order
    const ordersMap = new Map<number, SellerOrderItem[]>();
    items.forEach(item => {
        const list = ordersMap.get(item.order_id) || [];
        list.push(item);
        ordersMap.set(item.order_id, list);
    });

    const orderGroups = Array.from(ordersMap.entries()).map(([id, groupItems]) => ({
        id,
        date: groupItems[0].order.created_at,
        customer: groupItems[0].order.user,
        address: groupItems[0].order.shipping_address,
        items: groupItems
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleOpenFulfill = (orderId: number, pendingItems: SellerOrderItem[]) => {
        setSelectedOrder(orderId);
        setSelectedItems(pendingItems.map(i => i.id));
        setTrackingNumber("");
        setIsDialogOpen(true);
    };

    const handleFulfillSubmit = () => {
        if (!selectedOrder) return;
        fulfillMutation.mutate({
            orderId: selectedOrder,
            itemIds: selectedItems,
            trackingNumber,
            status: 'shipped'
        }, {
            onSuccess: () => {
                setIsDialogOpen(false);
            }
        });
    };

    return (
        <div className="space-y-6">
            {orderGroups.map((order) => {
                const pendingItems = order.items.filter(i => i.fulfillment_status === 'pending');
                const isFullyShipped = pendingItems.length === 0;

                return (
                    <Card key={order.id} className="glass-card overflow-hidden border-border/50">
                        <div className="bg-muted/30 p-4 flex flex-wrap gap-4 justify-between items-center border-b border-border/50">
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="bg-background">طلب #{order.id}</Badge>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(order.date), "MMM d, yyyy")}
                                </div>
                                <div className="text-sm font-medium">
                                    المشتري: {order.customer?.display_name || order.customer?.email || "زائر"}
                                </div>
                            </div>
                            <div>
                                {isFullyShipped ? (
                                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        مكتمل
                                    </Badge>
                                ) : (
                                    <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">
                                        يتطلب إجراء
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <CardContent className="p-6">
                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="md:col-span-2 space-y-4">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">العناصر</h4>
                                    {order.items.map((item) => (
                                        <div key={item.id} className="flex gap-4 items-center bg-background/50 p-3 rounded-lg border border-border/50">
                                            <div className="w-12 h-16 bg-muted rounded overflow-hidden shrink-0">
                                                <img src={item.product?.cover_url} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="font-medium truncate">{item.product?.title}</h5>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-sm text-muted-foreground">الكمية: {item.quantity}</span>
                                                    <div className="flex items-center gap-2">
                                                        {item.fulfillment_status === 'shipped' ? (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                                                <Truck className="w-3 h-3 mr-1" /> تم الشحن
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">قيد الانتظار</span>
                                                        )}
                                                        {item.tracking_number && (
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                #{item.tracking_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">تفاصيل الشحن</h4>
                                    {order.address ? (
                                        <div className="text-sm space-y-1">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-medium">{order.address.fullName}</p>
                                                    <p>{order.address.addressLine}</p>
                                                    <p>{order.address.city}</p>
                                                    <p className="text-muted-foreground mt-1">{order.address.phoneNumber}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">لا يوجد عنوان شحن (طلب رقمي؟)</p>
                                    )}

                                    {!isFullyShipped && (
                                        <div className="pt-4">
                                            <Button
                                                className="w-full gap-2"
                                                onClick={() => handleOpenFulfill(order.id, pendingItems)}
                                            >
                                                <Package className="w-4 h-4" />
                                                شحن العناصر
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>شحن الطلب</DialogTitle>
                        <DialogDescription>
                            أدخل معلومات التتبع للعناصر المحددة.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>حدد العناصر المراد شحنها</Label>
                            {selectedOrder && ordersMap.get(selectedOrder)?.filter(i => i.fulfillment_status === 'pending').map(item => (
                                <div key={item.id} className="flex items-center space-x-2 border p-2 rounded">
                                    <Checkbox
                                        checked={selectedItems.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) setSelectedItems([...selectedItems, item.id]);
                                            else setSelectedItems(selectedItems.filter(id => id !== item.id));
                                        }}
                                    />
                                    <span className="text-sm flex-1 truncate">{item.product.title} (x{item.quantity})</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label>رقم التتبع</Label>
                            <Input
                                placeholder="مثال: TRK123456789"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={handleFulfillSubmit} disabled={fulfillMutation.isPending || selectedItems.length === 0}>
                            {fulfillMutation.isPending ? "جاري التحديث..." : "تأكيد الشحن"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
