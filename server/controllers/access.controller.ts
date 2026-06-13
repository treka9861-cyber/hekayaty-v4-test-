/**
 * ============================================================
 * HEKAYATY UNIFIED ACCESS CONTROL ENGINE
 * ============================================================
 * canUserAccessProduct(userId, productId) is the single source
 * of truth for all content access decisions on the platform.
 *
 * Access tiers (in order of precedence):
 *   1. Creator/owner of the product → always allowed
 *   2. Product is free (price = 0) → always allowed
 *   3. Direct purchase (order_items for a verified order) → permanent
 *   4. Active subscription with matching benefit → time-bound
 *
 * Subscription access rules:
 *   - status must be 'active'
 *   - now() must be >= current_period_start
 *   - now() must be <= current_period_end + GRACE_PERIOD_DAYS
 *   - The subscription's plan must have a benefit matching the product type
 *
 * NOTE: Subscription access is NEVER stored as a fake purchase.
 *       Purchased products remain accessible forever regardless of subscription status.
 * ============================================================
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────

/** Grace period in days AFTER current_period_end before access is fully revoked */
const GRACE_PERIOD_DAYS = 0;

/**
 * Maps a Supabase product `type` to the benefit names that grant access.
 * Matching is case-insensitive substring — so "Unlimited Ebooks" matches "ebook".
 */
const PRODUCT_TYPE_BENEFIT_KEYWORDS: Record<string, string[]> = {
  ebook:      ["ebook", "unlimited ebook", "all digital", "premium content", "exclusive", "early release", "advance chapter", "beta", "bonus"],
  audiobook:  ["audiobook", "unlimited audiobook", "all digital", "premium content", "beta", "bonus"],
  comic:      ["comic", "unlimited comic", "exclusive comic", "all digital", "premium content", "exclusive", "beta", "bonus"],
  physical:   [], // Physical books are NEVER subscription-accessed
  merchandise:[], // Merchandise is NEVER subscription-accessed
  asset:      [], // Assets require direct purchase
  promotional:[], // Promotional items are always free
};

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

export type AccessReason =
  | "owner"         // User is the creator of the product
  | "free"          // Product has price = 0
  | "purchased"     // User has a verified direct purchase
  | "subscription"  // User has an active subscription with matching benefits
  | "none";         // No access

export interface AccessResult {
  hasAccess: boolean;
  reason: AccessReason;
  /** ISO string of when subscription access expires (null if not via subscription) */
  subscriptionExpiry: string | null;
  /** Name of the plan granting access (null if not via subscription) */
  planName: string | null;
  /** Creator username for linking to store (null if not via subscription) */
  creatorUsername: string | null;
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

function benefitMatchesProductType(benefitName: string, productType: string): boolean {
  const keywords = PRODUCT_TYPE_BENEFIT_KEYWORDS[productType] ?? [];
  if (keywords.length === 0) return false;
  const lower = benefitName.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function isSubscriptionActive(sub: any): boolean {
  const now = new Date();
  const start = new Date(sub.current_period_start);
  const end = new Date(sub.current_period_end);
  const gracedEnd = new Date(end.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  return (
    sub.status === "active" &&
    now >= start &&
    now <= gracedEnd
  );
}

// ──────────────────────────────────────────────
// MAIN ACCESS ENGINE
// ──────────────────────────────────────────────

export async function canUserAccessProduct(
  userId: string,
  productId: number
): Promise<AccessResult> {
  const NONE: AccessResult = {
    hasAccess: false,
    reason: "none",
    subscriptionExpiry: null,
    planName: null,
    creatorUsername: null,
  };

  // ── Step 1: Fetch the product ──────────────────────────────────────────────
  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, writer_id, price, type, is_published")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) return NONE;

  // ── Step 2: Owner check ───────────────────────────────────────────────────
  if (product.writer_id === userId) {
    return {
      hasAccess: true,
      reason: "owner",
      subscriptionExpiry: null,
      planName: null,
      creatorUsername: null,
    };
  }

  // ── Step 3: Free product check ────────────────────────────────────────────
  if (!product.price || product.price === 0) {
    return {
      hasAccess: true,
      reason: "free",
      subscriptionExpiry: null,
      planName: null,
      creatorUsername: null,
    };
  }

  // ── Step 4: Direct purchase check ─────────────────────────────────────────
  // Check if user has a verified order containing this product
  const { data: purchasedItems } = await supabaseAdmin
    .from("order_items")
    .select("id, order:order_id(id, is_verified, user_id)")
    .eq("product_id", productId)
    .limit(20);

  const hasPurchased = (purchasedItems || []).some((item: any) => {
    const order = item.order;
    return order && order.is_verified === true && order.user_id === userId;
  });

  if (hasPurchased) {
    return {
      hasAccess: true,
      reason: "purchased",
      subscriptionExpiry: null,
      planName: null,
      creatorUsername: null,
    };
  }

  // ── Step 5: Also check the `purchases` table (legacy) ────────────────────
  const { data: legacyPurchase } = await supabaseAdmin
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", String(productId))
    .limit(1)
    .maybeSingle();

  if (legacyPurchase) {
    return {
      hasAccess: true,
      reason: "purchased",
      subscriptionExpiry: null,
      planName: null,
      creatorUsername: null,
    };
  }

  // ── Step 6: Subscription check ────────────────────────────────────────────
  // Subscriptions are only checked for digital product types
  const digitalTypes = ["ebook", "audiobook", "comic"];
  if (!digitalTypes.includes(product.type)) return NONE;

  // Get all of the user's active subscriptions (we'll validate dates below)
  const { data: subscriptions } = await supabaseAdmin
    .from("creator_subscriptions")
    .select(`
      id,
      status,
      current_period_start,
      current_period_end,
      plan_id,
      plan:membership_plans!inner(
        id,
        name,
        club_id,
        club:membership_clubs!inner(
          id,
          store_id
        )
      )
    `)
    .eq("user_id", userId)
    .eq("status", "active");

  if (!subscriptions || subscriptions.length === 0) return NONE;

  // Filter subscriptions that are truly active (date check)
  const activeSubscriptions = subscriptions.filter(isSubscriptionActive);
  if (activeSubscriptions.length === 0) return NONE;

  // For each active subscription, check if the product's creator matches
  // and if the plan benefits cover the product type
  for (const sub of activeSubscriptions) {
    const plan = (sub as any).plan;
    const club = plan?.club;
    if (!club) continue;

    // The subscription must be for the same store that owns the product
    if (club.store_id !== product.writer_id) continue;

    // Fetch the plan's benefits
    const { data: benefits } = await supabaseAdmin
      .from("plan_benefits")
      .select("id, type, name, value, status")
      .eq("plan_id", plan.id)
      .eq("status", "active");

    if (!benefits || benefits.length === 0) {
      // Fallback: if a plan has NO benefits defined, a stored entitlement acts as grant
      const { data: ent } = await supabaseAdmin
        .from("entitlements")
        .select("id")
        .eq("user_id", userId)
        .eq("store_id", club.store_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (ent) {
        // Fetch creator username for linking
        const { data: creator } = await supabaseAdmin
          .from("users")
          .select("username")
          .eq("id", club.store_id)
          .maybeSingle();

        return {
          hasAccess: true,
          reason: "subscription",
          subscriptionExpiry: (sub as any).current_period_end,
          planName: plan.name,
          creatorUsername: creator?.username ?? null,
        };
      }
      continue;
    }

    // Check if any benefit matches the product type
    const matchingBenefit = benefits.find(b =>
      benefitMatchesProductType(b.name, product.type)
    );

    if (matchingBenefit) {
      // Fetch creator username for linking
      const { data: creator } = await supabaseAdmin
        .from("users")
        .select("username")
        .eq("id", club.store_id)
        .maybeSingle();

      return {
        hasAccess: true,
        reason: "subscription",
        subscriptionExpiry: (sub as any).current_period_end,
        planName: plan.name,
        creatorUsername: creator?.username ?? null,
      };
    }
  }

  // No access granted
  return NONE;
}

// ──────────────────────────────────────────────
// LIBRARY ENGINE
// ──────────────────────────────────────────────

/**
 * Returns all products accessible via the user's active subscriptions.
 * Does NOT include purchased products (those are shown separately).
 * Results are paginated.
 */
export async function getSubscriptionLibrary(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ products: any[]; storeId: string; planName: string; expiresAt: string }[]> {
  // Get all active subscriptions
  const { data: subscriptions } = await supabaseAdmin
    .from("creator_subscriptions")
    .select(`
      id,
      status,
      current_period_start,
      current_period_end,
      plan:membership_plans!inner(
        id,
        name,
        club:membership_clubs!inner(
          id,
          store_id
        )
      )
    `)
    .eq("user_id", userId)
    .eq("status", "active");

  if (!subscriptions) return [];

  const activeSubscriptions = subscriptions.filter(isSubscriptionActive);
  if (activeSubscriptions.length === 0) return [];

  const results: any[] = [];

  for (const sub of activeSubscriptions) {
    const plan = (sub as any).plan;
    const club = plan?.club;
    if (!club) continue;

    // Determine what product types this subscription covers
    const { data: benefits } = await supabaseAdmin
      .from("plan_benefits")
      .select("id, name, type, status")
      .eq("plan_id", plan.id)
      .eq("status", "active");

    const coveredTypes: string[] = [];
    for (const type of ["ebook", "audiobook", "comic"]) {
      const hasBenefit = !benefits || benefits.length === 0 ||
        (benefits || []).some(b => benefitMatchesProductType(b.name, type));
      if (hasBenefit) coveredTypes.push(type);
    }

    if (coveredTypes.length === 0) continue;

    // Fetch products from this creator matching covered types
    const { data: storeProducts } = await supabaseAdmin
      .from("products")
      .select("id, title, cover_url, type, price, writer_id, genre, is_published")
      .eq("writer_id", club.store_id)
      .eq("is_published", true)
      .in("type", coveredTypes)
      .range(offset, offset + limit - 1);

    if (storeProducts && storeProducts.length > 0) {
      results.push({
        products: storeProducts,
        storeId: club.store_id,
        planName: plan.name,
        expiresAt: (sub as any).current_period_end,
      });
    }
  }

  return results;
}
