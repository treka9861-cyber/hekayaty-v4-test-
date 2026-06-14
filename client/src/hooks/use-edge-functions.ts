import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export async function callEdgeFunction(
    functionName: string,
    data?: any,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'POST'
) {
    console.log(`🚀 Backend API Call: ${functionName} [${method}]`);

    try {
        const url = `/api/edge/${functionName}`;
        const res = await apiRequest(method, url, method === 'GET' ? undefined : data);
        const responseData = await res.json();

        if (responseData && responseData.error) {
            console.error(`❌ Edge Function returned logical error [${functionName}]:`, responseData.error);
            throw new Error(responseData.error);
        }

        console.log(`✅ Backend API Success [${functionName}]:`, responseData);
        return responseData;
    } catch (err: any) {
        console.error(`❌ Backend API Exception [${functionName}]:`, err);
        throw err;
    }
}

// Calculate Shipping
export function useCalculateShippingEdge() {
    return useMutation({
        mutationFn: async (data: { items: any[], city: string }) => {
            return callEdgeFunction('calculate-shipping', data);
        }
    });
}

// Checkout
export function useCheckoutEdge() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: {
            items: any[],
            totalAmount: number,
            paymentMethod?: string,
            paymentProofUrl?: string | null,
            paymentReference?: string | null,
            shippingAddress?: any,
            shippingCost?: number,
            shippingBreakdown?: any[]
        }) => {
            return callEdgeFunction('checkout', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
            queryClient.invalidateQueries({ queryKey: ["/api/orders/user"] });
            toast({ title: "Order Successful", description: "Thank you for your purchase!" });
        },
        onError: (error: Error) => {
            toast({
                title: "Checkout Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    });
}

// Request Payout
export function useRequestPayoutEdge() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { amount: number, method?: string, methodDetails: string }) => {
            return callEdgeFunction('request-payout', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['earnings-overview'] });
            queryClient.invalidateQueries({ queryKey: ['payouts'] });
            toast({ title: "Payout Requested", description: "Your payout will be processed soon." });
        },
        onError: (error: Error) => {
            toast({
                title: "Payout Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    });
}

// Earnings Overview
export function useEarningsOverviewEdge() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['earnings-overview'],
        queryFn: async () => {
            return callEdgeFunction('earnings-overview', undefined, 'GET');
        },
        enabled: !!user,
    });
}

// Seller Orders
export function useSellerOrdersEdge() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['seller-orders'],
        queryFn: async () => {
            return callEdgeFunction('seller-orders', undefined, 'GET');
        },
        enabled: !!user,
    });
}

// Update Fulfillment
export function useUpdateFulfillmentEdge() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: {
            orderItemId: number,
            status: string,
            trackingNumber?: string
        }) => {
            return callEdgeFunction('update-fulfillment', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
            toast({ title: "Order Updated", description: "Fulfillment status updated successfully." });
        },
        onError: (error: Error) => {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    });
}

// Admin: Verify Payment
export function useVerifyPaymentEdge() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { orderId: number }) => {
            return callEdgeFunction('verify-payment', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-orders'] });
            toast({ title: "Payment Verified", description: "Order has been verified and earnings created." });
        },
        onError: (error: Error) => {
            toast({
                title: "Verification Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    });
}
