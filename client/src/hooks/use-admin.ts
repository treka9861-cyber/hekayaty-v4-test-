import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { callEdgeFunction } from "./use-edge-functions";

// Get pending orders via Edge Function
export function usePendingOrders() {
    return useQuery({
        queryKey: ['pending-orders'],
        queryFn: async () => {
            return callEdgeFunction('get-pending-orders', { status: 'pending' });
        },
        initialData: [],
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false
    });
}

// Verify payment via Edge Function
export function useVerifyPayment() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (orderId: number) => {
            return callEdgeFunction('verify-payment', { orderId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-orders'] });
            toast({
                title: "Payment Verified",
                description: "Order has been verified and earnings created."
            });
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

// Reject Order
export function useRejectOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (orderId: number) => {
            return callEdgeFunction('reject-order', { orderId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-orders'] });
            toast({ title: "Order Rejected" });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to reject", variant: "destructive" });
        }
    });
}

// Get Sellers
export function useAdminSellers() {
    return useQuery({
        queryKey: ['admin-sellers'],
        queryFn: async () => {
            return callEdgeFunction('get-sellers', {});
        },
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false
    });
}

// Freeze Seller
export function useFreezeSeller() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ userId, isActive }: { userId: string, isActive: boolean }) => {
            return callEdgeFunction('freeze-seller', { userId, isActive });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
            toast({ title: "Seller Status Updated" });
        },
        onError: (error: Error) => {
            toast({ title: "Update Failed", variant: "destructive" });
        }
    });
}

// Get Payout Requests
export function useAdminPayouts() {
    return useQuery({
        queryKey: ['admin-payouts'],
        queryFn: async () => {
            return callEdgeFunction('get-all-payouts', {});
        }
    });
}

// Approve/Reject Payout
export function useApprovePayout() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ payoutId, status }: { payoutId: number, status: 'processed' | 'rejected' }) => {
            return callEdgeFunction('approve-payout', { payoutId, status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
            toast({ title: "Payout status updated" });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to update payout", description: error.message, variant: "destructive" });
        }
    });
}

// Get Payout History (Processed/Rejected)
export function useAdminPayoutHistory() {
    return useQuery({
        queryKey: ['admin-payout-history'],
        queryFn: async () => {
            const data = await callEdgeFunction('get-all-payouts', { status: 'all' });
            return data.filter((p: any) => p.status !== 'pending');
        }
    });
}

// Get Order History (Paid/Rejected)
export function useAdminOrderHistory() {
    return useQuery({
        queryKey: ['admin-order-history'],
        queryFn: async () => {
            const data = await callEdgeFunction('get-pending-orders', { status: 'all' });
            return data.filter((o: any) => o.status !== 'pending');
        }
    });
}

// Get Subscription History (Active/Rejected)
export function useAdminSubscriptionHistory() {
    return useQuery({
        queryKey: ['admin-subscription-history'],
        queryFn: async () => {
            const data = await callEdgeFunction('get-pending-subscriptions', { status: 'all' });
            return data.filter((s: any) => s.status !== 'pending');
        }
    });
}

// Export aliases
export const useAdminOrders = usePendingOrders;
export const useVerifyOrder = useVerifyPayment;

// Get Pending Subscriptions
export function usePendingSubscriptions() {
    return useQuery({
        queryKey: ['admin-pending-subscriptions'],
        queryFn: async () => {
            return callEdgeFunction('get-pending-subscriptions', { status: 'pending' });
        },
        initialData: [],
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false
    });
}

// Approve Subscription
export function useApproveSubscription() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (subscriptionId: string) => {
            return callEdgeFunction('approve-subscription', { subscriptionId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-pending-subscriptions'] });
            toast({ title: "Subscription Approved" });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
        }
    });
}

// Reject Subscription
export function useRejectSubscription() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ subscriptionId, reason }: { subscriptionId: string, reason?: string }) => {
            return callEdgeFunction('reject-subscription', { subscriptionId, reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-pending-subscriptions'] });
            toast({ title: "Subscription Rejected" });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
        }
    });
}

// ==========================================
// UPGRADE REQUESTS
// ==========================================

export function useUpgradeRequests(status?: string) {
    return useQuery({
        queryKey: ['admin-upgrade-requests', status || 'all'],
        queryFn: async () => {
            return callEdgeFunction('get-upgrade-requests', { status: status || 'all' });
        },
        initialData: [],
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false
    });
}

export function useApproveUpgradeRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (requestId: number) => {
            return callEdgeFunction('approve-upgrade-request', { requestId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-upgrade-requests'] });
            queryClient.invalidateQueries({ queryKey: ['admin-pending-subscriptions'] }); // Just in case
            toast({ title: "Upgrade Approved", description: "The subscription has been successfully upgraded." });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to approve upgrade", description: error.message, variant: "destructive" });
        }
    });
}

export function useRejectUpgradeRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ requestId, reason }: { requestId: number, reason?: string }) => {
            return callEdgeFunction('reject-upgrade-request', { requestId, reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-upgrade-requests'] });
            toast({ title: "Upgrade Rejected", description: "The request was rejected and the user notified." });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to reject upgrade", description: error.message, variant: "destructive" });
        }
    });
}

// ==========================================
// PHASE 1 — NEW ADMIN CORE HOOKS
// ==========================================

async function fetchAdmin(path: string, options?: RequestInit) {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const headers: any = { 'Content-Type': 'application/json' };
    if (session?.user?.id) headers['x-user-id'] = session.user.id;
    const res = await fetch(path, { ...options, headers });
    if (!res.ok) throw new Error(await res.text());
    if (res.status === 204) return null;
    return res.json();
}

export function useAdminOverviewStats() {
    return useQuery({
        queryKey: ['admin-overview-stats'],
        queryFn: () => fetchAdmin('/api/admin/overview-stats'),
        staleTime: 30_000,
    });
}

export function useAdminUsers(filters?: { role?: string; status?: string; isVerified?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.isVerified !== undefined) params.set('isVerified', String(filters.isVerified));
    return useQuery({
        queryKey: ['admin-users', filters],
        queryFn: () => fetchAdmin(`/api/admin/users?${params.toString()}`),
        staleTime: 10_000,
    });
}

export function useAdminUpdateUserStatus() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ userId, status, banReason, adminNotes }: { userId: string; status: string; banReason?: string; adminNotes?: string }) => {
            return fetchAdmin(`/api/admin/users/${userId}/status`, {
                method: 'POST',
                body: JSON.stringify({ status, banReason, adminNotes }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast({ title: "User status updated" });
        },
        onError: (e: Error) => toast({ title: "Failed to update status", description: e.message, variant: "destructive" }),
    });
}

export function useAdminVerifyWriter() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ userId, isVerified, verificationNotes }: { userId: string; isVerified: boolean; verificationNotes?: string }) => {
            return fetchAdmin(`/api/admin/users/${userId}/verify`, {
                method: 'POST',
                body: JSON.stringify({ isVerified, verificationNotes }),
            });
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast({ title: vars.isVerified ? "✅ Writer Verified!" : "Verification Removed", description: vars.isVerified ? "The verified badge has been granted." : "The badge has been removed." });
        },
        onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
    });
}

export function useAdminAuditLogs() {
    return useQuery({
        queryKey: ['admin-audit-logs'],
        queryFn: () => fetchAdmin('/api/admin/audit-logs'),
        staleTime: 15_000,
    });
}

// === PHASE 2 HOOKS ===

export function useAdminReports() {
    return useQuery({
        queryKey: ['admin-reports'],
        queryFn: () => fetchAdmin('/api/admin/reports'),
    });
}

export function useAdminUpdateReportStatus() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, status, adminNotes }: { id: number, status: string, adminNotes?: string }) => {
            const res = await fetch(`/api/admin/reports/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, adminNotes })
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
            toast({ title: "Report Status Updated" });
        },
        onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
    });
}

export function useAdminModerationStories() {
    return useQuery({
        queryKey: ['admin-moderation-stories'],
        queryFn: () => fetchAdmin('/api/admin/moderation/stories'),
    });
}

export function useAdminModerateStory() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, status, notes }: { id: number, status: string, notes?: string }) => {
            const res = await fetch(`/api/admin/moderation/stories/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes })
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-moderation-stories'] });
            toast({ title: "Story Moderated" });
        },
        onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
    });
}

// ==========================================
// PHASE 3 — FINANCIALS & LOGISTICS
// ==========================================

export function useAdminFinances() {
    return useQuery({
        queryKey: ['admin-finances'],
        queryFn: () => fetchAdmin('/api/admin/finances'),
    });
}

export function useAdminGlobalOrders() {
    return useQuery({
        queryKey: ['admin-global-orders'],
        queryFn: () => fetchAdmin('/api/admin/orders'),
    });
}

export function useAdminReturnOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, returnStatus, returnReason }: { id: number, returnStatus: string, returnReason?: string }) => {
            const res = await fetch(`/api/admin/orders/${id}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ returnStatus, returnReason })
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-global-orders'] });
            toast({ title: "Return Status Updated" });
        },
        onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
    });
}

export function useAdminOverrideSubscription() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ userId, newTier, adminNotes }: { userId: string, newTier: string, adminNotes?: string }) => {
            const res = await fetch(`/api/admin/subscriptions/${userId}/override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newTier, adminNotes })
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast({ title: "Subscription Overridden" });
        },
        onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
    });
}

// ==========================================
// PHASE 4 — MARKETING, COMMUNITY & SETTINGS
// ==========================================

export function useAdminSettings() {
    return useQuery({
        queryKey: ['admin-settings'],
        queryFn: () => fetchAdmin('/api/admin/settings'),
    });
}

export function useAdminUpdateSettings() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ key, value }: { key: string, value: any }) => {
            const res = await fetch(`/api/admin/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
            toast({ title: "Settings Updated" });
        },
        onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
    });
}

export function useAdminBroadcastNotification() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { title: string, message: string, type: string, targetRole: string }) => {
            const res = await fetch(`/api/admin/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: () => toast({ title: "Notification Broadcasted" }),
        onError: (e: Error) => toast({ title: "Broadcast failed", description: e.message, variant: "destructive" }),
    });
}

export function useAdminChatModeration() {
    return useQuery({
        queryKey: ['admin-chat-moderation'],
        queryFn: () => fetchAdmin('/api/admin/chat/moderation'),
    });
}

export function useAdminDeleteChatMessage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/chat/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-chat-moderation'] });
            toast({ title: "Message Deleted" });
        },
        onError: (e: Error) => toast({ title: "Deletion failed", description: e.message, variant: "destructive" }),
    });
}

// ==========================================
// VERIFICATION — BULK & REVIEW
// ==========================================

export function useAdminBulkVerify() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ userIds, isVerified, verificationNotes }: { userIds: string[]; isVerified: boolean; verificationNotes?: string }) => {
            const res = await fetch('/api/admin/users/bulk-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds, isVerified, verificationNotes })
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: (data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast({ title: vars.isVerified ? `Verified ${data.updated} users` : `Unverified ${data.updated} users` });
        },
        onError: (e: Error) => toast({ title: "Bulk action failed", description: e.message, variant: "destructive" }),
    });
}

export function useAdminWriterReviewData(writerId: string | null) {
    return useQuery({
        queryKey: ['admin-writer-review', writerId],
        queryFn: () => fetchAdmin(`/api/admin/writers/${writerId}/review-data`),
        enabled: !!writerId,
    });
}
