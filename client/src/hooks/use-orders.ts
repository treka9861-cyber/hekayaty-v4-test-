import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callEdgeFunction } from "./use-edge-functions";
import { useTranslation } from "react-i18next";

/**
 * Fetches the current user's orders by querying Supabase directly.
 *
 * Previously used an Edge Function, but that caused persistent 401 errors
 * due to JWT verification at the Supabase gateway level.
 *
 * The direct query works now because migration 037 fixed the RLS type mismatch
 * (orders.user_id is TEXT, auth.uid() returns UUID — now cast with ::text).
 * We use the service role path for items via a manual join.
 */
export function useUserOrders() {
    const { t } = useTranslation();
    return useQuery({
        queryKey: ["/api/orders/user"],
        queryFn: async () => {
            // Step 1: Get the currently logged-in user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('[useUserOrders] Not authenticated:', userError?.message);
                return [];
            }

            // Step 2: Fetch user's orders directly — RLS is now fixed via migration 037
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('id, status, is_verified, created_at, total_amount, payment_method, shipping_address, shipping_cost')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (ordersError) {
                console.error('[useUserOrders] Orders fetch error:', ordersError.message);
                return [];
            }

            if (!orders || orders.length === 0) {
                return [];
            }

            // Step 3: Fetch order items with product/collection info
            const orderIds = orders.map((o: any) => o.id);

            const { data: items, error: itemsError } = await supabase
                .from('order_items')
                .select(`
                    id,
                    order_id,
                    product_id,
                    collection_id,
                    creator_id,
                    price,
                    quantity,
                    fulfillment_status,
                    tracking_number,
                    estimated_delivery_days,
                    shipped_at,
                    accepted_at,
                    product:products(id, title, cover_url, type),
                    collection:collections(id, title, cover_image_url)
                `)
                .in('order_id', orderIds);

            if (itemsError) {
                console.error('[useUserOrders] Items fetch error:', itemsError.message);
                // Return orders without items rather than failing entirely
            }

            const allItems = items || [];

            // Step 4: Fetch creator names for items
            const creatorIds = Array.from(new Set(allItems.map((i: any) => i.creator_id).filter(Boolean)));
            let creatorsMap: Record<string, string> = {};

            if (creatorIds.length > 0) {
                const { data: creators } = await supabase
                    .from('users')
                    .select('id, display_name')
                    .in('id', creatorIds);

                creators?.forEach((c: any) => {
                    creatorsMap[c.id] = c.display_name;
                });
            }

            // Step 5: Group items by order and build final result
            return orders.map((order: any) => {
                const orderItems = allItems
                    .filter((i: any) => i.order_id === order.id)
                    .map((item: any) => {
                        const isCollection = !!item.collection_id;
                        const isSubscription = !item.product_id && !item.collection_id;
                        return {
                            id: item.id,
                            orderId: order.id,
                            productId: item.product_id,
                            quantity: item.quantity || 1,
                            price: item.price,
                            fulfillmentStatus: item.fulfillment_status || 'pending',
                            trackingNumber: item.tracking_number || null,
                            estimatedDeliveryDays: item.estimated_delivery_days || null,
                            makerName: creatorsMap[item.creator_id] || null,
                            shippedAt: item.shipped_at || null,
                            acceptedAt: item.accepted_at || null,
                            isSubscription,
                            product: {
                                id: item.product_id,
                                collectionId: item.collection_id,
                                title: isSubscription
                                    ? t("writerStore.membershipPlanTitle", "👑 Membership Plan")
                                    : isCollection
                                    ? (item.collection?.title || 'Collection')
                                    : (item.product?.title || 'Unknown Product'),
                                coverUrl: isSubscription
                                    ? ''
                                    : isCollection
                                    ? (item.collection?.cover_image_url || '')
                                    : (item.product?.cover_url || ''),
                                type: isSubscription ? 'membership' : isCollection ? 'collection' : (item.product?.type || 'unknown'),
                                genre: null,
                                description: null
                            }
                        };

                    });

                return {
                    id: order.id,
                    userId: user.id,
                    totalAmount: order.total_amount,
                    status: order.status,
                    paymentMethod: order.payment_method,
                    paymentProofUrl: null,
                    paymentReference: null,
                    isVerified: order.is_verified,
                    shippingAddress: order.shipping_address,
                    shippingCost: order.shipping_cost,
                    createdAt: order.created_at,
                    order_items: orderItems
                };
            });
        },
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always'
    });
}

export function useUserSubscriptions() {
    return useQuery({
        queryKey: ['/api/edge/get-user-subscriptions'],
        queryFn: async () => {
            return callEdgeFunction('get-user-subscriptions', {});
        },
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always'
    });
}

