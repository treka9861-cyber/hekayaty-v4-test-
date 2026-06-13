import { useState } from "react";
import { useAdminGlobalOrders, useAdminReturnOrder } from "@/hooks/use-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Package, RefreshCcw, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function OrdersAdmin() {
  const { data: orders, isLoading } = useAdminGlobalOrders();
  const { mutate: updateReturnStatus, isPending } = useAdminReturnOrder();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [returnReason, setReturnReason] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredOrders = orders?.filter((o: any) => 
    o.order?.id?.toString().includes(searchTerm) || 
    o.product?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleReturnAction = (status: string) => {
    if (!selectedOrder) return;
    updateReturnStatus(
      { id: selectedOrder.id, returnStatus: status, returnReason: returnReason },
      {
        onSuccess: () => {
          setSelectedOrder(null);
          setReturnReason("");
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-white">Global Orders & Returns</h2>
        <p className="text-muted-foreground mt-1">
          Monitor physical product fulfillment across the platform and process return requests.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by order ID, title, tracking..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card/50 border-white/10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card/20 rounded-xl border border-white/5">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            No orders found.
          </div>
        ) : (
          filteredOrders.map((item: any) => (
            <Card key={item.id} className="bg-card/40 border-white/5 overflow-hidden transition-all hover:bg-card/60">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground bg-black/40 px-2 py-0.5 rounded">
                        #{item.order?.id}-{item.id}
                      </span>
                      <h4 className="font-bold text-white line-clamp-1">{item.product?.title || 'Unknown Product'}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{item.quantity}x • {item.price} EGP</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>Fulfillment: <span className="text-white capitalize">{item.fulfillment_status}</span></span>
                      {item.tracking_number && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="font-mono text-primary/80">{item.tracking_number}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.return_status ? (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                        item.return_status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        item.return_status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        item.return_status === 'refunded' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        Return {item.return_status.replace('_', ' ')}
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground"
                        onClick={() => setSelectedOrder(item)}
                      >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Initiate Return
                      </Button>
                    )}
                  </div>
                </div>
                {item.return_reason && (
                  <div className="bg-black/30 p-3 text-sm text-muted-foreground border-t border-white/5">
                    <strong>Return Reason:</strong> {item.return_reason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="bg-background border-white/10">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>
              Update the return status for Order Item #{selectedOrder?.order?.id}-{selectedOrder?.id}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Admin Notes / Reason</label>
              <Textarea 
                placeholder="Enter details about this return..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="bg-black/40 border-white/10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setSelectedOrder(null)}
              className="border-white/10 bg-transparent"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleReturnAction('rejected')}
              disabled={isPending}
              className="gap-2"
            >
              <X className="w-4 h-4" /> Reject Return
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => handleReturnAction('approved')}
              disabled={isPending}
            >
              <Check className="w-4 h-4" /> Approve Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
