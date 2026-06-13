/**
 * useProductAccess(productId)
 *
 * Single shared hook for all content access decisions on the frontend.
 * Calls the server-side engine /api/access/product/:id which performs:
 *   - Direct purchase check
 *   - Active subscription check (with date validation)
 *   - Benefit-type-to-product-type mapping
 *
 * Returns an AccessResult with:
 *   hasAccess     → can the user read/listen to this product?
 *   reason        → 'owner' | 'free' | 'purchased' | 'subscription' | 'none'
 *   planName      → name of the subscription plan granting access (if applicable)
 *   subscriptionExpiry → ISO date string when subscription expires
 *   isExpiringSoon → true if subscription expires within 7 days
 *   creatorUsername → creator's username for store link
 *   isLoading     → loading state
 *
 * IMPORTANT: This hook returns `hasAccess: false` for unauthenticated users
 * and products with id=0. The server validates all access server-side.
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export interface ProductAccessResult {
  hasAccess: boolean;
  reason: "owner" | "free" | "purchased" | "subscription" | "none";
  subscriptionExpiry: string | null;
  planName: string | null;
  creatorUsername: string | null;
  isLoading: boolean;
  /** True if subscription expires within 7 days */
  isExpiringSoon: boolean;
  /** True if access is via subscription (not purchased/free/owner) */
  isSubscriptionAccess: boolean;
}

const EXPIRY_WARNING_DAYS = 7;

function checkExpiringSoon(expiryIso: string | null): boolean {
  if (!expiryIso) return false;
  const expiry = new Date(expiryIso);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= EXPIRY_WARNING_DAYS;
}

export function useProductAccess(productId: number | undefined | null): ProductAccessResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["product-access", productId, user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/access/product/${productId}`);
      return res.json();
    },
    enabled: !!productId && productId > 0 && !!user,
    staleTime: 30_000,  // Cache for 30 seconds — short enough to reflect expiry
    gcTime: 60_000,
  });

  if (!productId || productId <= 0 || !user) {
    return {
      hasAccess: false,
      reason: "none",
      subscriptionExpiry: null,
      planName: null,
      creatorUsername: null,
      isLoading: false,
      isExpiringSoon: false,
      isSubscriptionAccess: false,
    };
  }

  const result = data ?? { hasAccess: false, reason: "none", subscriptionExpiry: null, planName: null, creatorUsername: null };

  return {
    hasAccess: result.hasAccess ?? false,
    reason: result.reason ?? "none",
    subscriptionExpiry: result.subscriptionExpiry ?? null,
    planName: result.planName ?? null,
    creatorUsername: result.creatorUsername ?? null,
    isLoading,
    isExpiringSoon: checkExpiringSoon(result.subscriptionExpiry),
    isSubscriptionAccess: result.reason === "subscription",
  };
}
