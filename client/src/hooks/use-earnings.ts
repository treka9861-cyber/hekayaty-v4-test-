import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { callEdgeFunction } from "./use-edge-functions";

// Get earnings overview using Edge Function
export function useEarnings(user: any) {
    console.log("🛠️ useEarnings Hook Render:", { hasUser: !!user, userId: user?.id });

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['earnings-overview', user?.id],
        queryFn: async () => {
            console.log(`🚀 useEarnings: STARTING FETCH for ${user?.id}...`);
            return callEdgeFunction('earnings-overview', {}, 'GET');
        },
        enabled: !!user?.id,
        staleTime: 0, // Always fetch fresh
        initialData: {
            totalEarnings: 0,
            totalGross: 0,
            totalUnitsSold: 0,
            totalCommission: 0,
            totalPaidOut: 0,
            pendingPayouts: 0,
            availableBalance: 0,
            recentEarnings: [],
            payoutHistory: []
        }
    });

    return {
        totalEarnings: data?.totalEarnings || 0,
        totalGross: data?.totalGross || 0,
        totalUnitsSold: data?.totalUnitsSold || 0,
        totalCommission: data?.totalCommission || 0,
        totalPaid: data?.totalPaidOut || 0,
        currentBalance: data?.availableBalance || 0,
        recentEarnings: data?.recentEarnings || [],
        payoutHistory: data?.payoutHistory || [],
        isLoading,
        error,
        refetch
    };
}

import { useAuth } from "@/hooks/use-auth";

// Get seller orders using Edge Function
export function useSellerOrders() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['seller-orders'],
        queryFn: async () => {
            return callEdgeFunction('seller-orders');
        },
        enabled: !!user,
    });
}

// Request payout using Edge Function
export function useRequestPayout() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (vars: { amount: number, method: string, methodDetails: string }) => {
            return callEdgeFunction('request-payout', vars, 'POST');
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

// Update order fulfillment using Edge Function
export function useUpdateFulfillment() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: {
            orderItemId: number,
            status: string,
            trackingNumber?: string
        }) => {
            return callEdgeFunction('update-fulfillment', data, 'POST');
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

// Get payouts from Supabase (direct query with RLS)
export function usePayouts() {
    return useQuery({
        queryKey: ['payouts'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('payouts')
                .select('*')
                .eq('user_id', user.id)
                .order('requested_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(p => ({
                ...p,
                requestedAt: p.requested_at,
                processedAt: p.processed_at
            }));
        },
        initialData: []
    });
}
