import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type InsertCartItem, type CartItem, type Product, type Variant, type Collection } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase"; // Direct supabase usage
import { apiRequest } from "@/lib/queryClient";

type CartItemWithDetails = CartItem & {
    product: Product | null;
    collection: {
        id: string;
        writerId: string;
        title: string;
        description: string | null;
        coverUrl: string | null;
        price: number;
        isCollection: boolean;
    } | null;
    variant?: Variant
};

import { persistence } from "@/lib/persistence";

export function useCart() {
    return useQuery<CartItemWithDetails[]>({
        queryKey: ["/api/cart"],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) return [];

            const { data: cartItems, error: cartError } = await supabase
                .from('cart_items')
                .select('*, product:products(*), collection:collections(*)')
                .eq('user_id', user.id);

            if (cartError) throw cartError;
            if (!cartItems) return [];

            // Map data from snake_case to camelCase
            const mappedItems = cartItems.map(item => {
                const p = item.product;
                const c = item.collection;

                if (!p && !c) return null;

                return {
                    id: item.id,
                    userId: item.user_id,
                    productId: item.product_id,
                    collectionId: item.collection_id,
                    variantId: item.variant_id,
                    quantity: item.quantity,
                    customizationData: item.customization_data,
                    addedAt: item.added_at,
                    product: p ? {
                        id: p.id,
                        writerId: p.writer_id,
                        title: p.title,
                        description: p.description,
                        coverUrl: p.cover_url,
                        fileUrl: p.file_url,
                        type: p.type,
                        genre: p.genre,
                        isPublished: p.is_published,
                        rating: p.rating,
                        reviewCount: p.review_count,
                        price: p.price,
                        salePrice: p.sale_price,
                        discountPercentage: p.discount_percentage,
                        licenseType: p.license_type,
                        content: p.content,
                        stockQuantity: p.stock_quantity,
                        weight: p.weight,
                        requiresShipping: p.requires_shipping,
                        createdAt: p.created_at,
                        updatedAt: p.updated_at
                    } : null,
                    collection: c ? {
                        id: c.id,
                        writerId: c.writer_id,
                        title: c.title,
                        description: c.description,
                        coverUrl: c.cover_image_url,
                        price: Number(c.price) || 0,
                        isCollection: true
                    } : null
                };
            }).filter(Boolean) as any[];

            // Persist the mapped items
            persistence.set("/api/cart", mappedItems).catch(console.error);

            return mappedItems;
        }
    });
}

// Utility to call Edge Functions with better error handling & session awareness
async function callEdgeFunction(
    functionName: string,
    data?: any,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'POST'
) {
    try {
        const url = `/api/edge/${functionName}`;
        const res = await apiRequest(method, url, method === 'GET' ? undefined : data);
        return await res.json();
    } catch (err: any) {
        throw err;
    }
}

export function useCalculateShipping() {
    return useMutation({
        mutationFn: async (data: { items: any[], city: string }) => {
            return callEdgeFunction('calculate-shipping', data);
        }
    });
}

export function useAddToCart() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (item: InsertCartItem) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Must be logged in");

            // Check if item already exists
            const query = supabase
                .from('cart_items')
                .select('*')
                .eq('user_id', user.id);

            if (item.productId) query.eq('product_id', item.productId);
            else if (item.collectionId) query.eq('collection_id', item.collectionId);

            const { data: existing } = await query.maybeSingle();

            if (existing) {
                const { data, error } = await supabase
                    .from('cart_items')
                    .update({ quantity: (existing.quantity || 1) + (item.quantity || 1) })
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabase
                    .from('cart_items')
                    .insert({
                        user_id: user.id,
                        product_id: item.productId || null,
                        collection_id: item.collectionId || null,
                        variant_id: item.variantId || null,
                        quantity: item.quantity || 1,
                        customization_data: (item as any).customizationData || {}
                    })
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
            toast({ title: "Added to Cart", description: "Item added successfully." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });
}

export function useRemoveFromCart() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
            toast({ title: "Removed", description: "Item removed from cart." });
        }
    });
}

export function useUpdateCartQuantity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, quantity }: { id: number, quantity: number }) => {
            const { data, error } = await supabase
                .from('cart_items')
                .update({ quantity })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        }
    });
}

export function useCheckout() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    return useMutation({
        mutationFn: async (data: any) => {
            return callEdgeFunction('checkout', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
            queryClient.invalidateQueries({ queryKey: ["/api/orders/user"] });
            toast({ title: "Order Successful", description: "Thank you for your purchase!" });
            setLocation("/dashboard");
        },
        onError: (error: Error) => {
            toast({ title: "Checkout Failed", description: error.message, variant: "destructive" });
        }
    });
}
