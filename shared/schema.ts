import { pgTable, text, boolean, timestamp, jsonb, integer, serial, uuid, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === 1. USER & IDENTITY ===

export const users = pgTable("users", {
  id: text("id").primaryKey(), // UUID from Supabase Auth
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("reader"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  storeSettings: jsonb("store_settings").$type<{
    themeColor?: string;
    accentColor?: string;
    welcomeMessage?: string;
    font?: string;
    socialLinks?: { platform: string; url: string }[];
    headerLayout?: 'standard' | 'minimal' | 'hero';
  }>(),
  stripeAccountId: text("stripe_account_id"),
  subscriptionTier: text("subscription_tier").default("free"), // free, vip
  commissionRate: integer("commission_rate").default(20), // Percentage (e.g., 20)
  isActive: boolean("is_active").default(true),
  shippingPolicy: text("shipping_policy"),
  skills: text("skills"), // Comma-separated or short description
  // Admin & Security Fields
  status: text("status").default("active"), // active, suspended, banned
  banReason: text("ban_reason"),
  adminNotes: text("admin_notes"),
  // Admin-Curated Verification Fields
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"), // admin user_id who verified
  verificationNotes: text("verification_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === 2. PRODUCTS & COMMERCE ===

export const products = pgTable("products", {
  id: serial("id").primaryKey(), // SERIAL = number
  writerId: text("writer_id").notNull(), // UUID ref to users
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverUrl: text("cover_url").notNull(),
  fileUrl: text("file_url"),
  content: text("content"), // Extracted text for reader
  type: text("type").notNull().default("ebook"), // ebook, asset, bundle, physical, promotional, merchandise, audiobook
  genre: text("genre").notNull(),
  isPublished: boolean("is_published").default(false),
  rating: integer("rating").default(0),
  reviewCount: integer("review_count").default(0),
  price: integer("price").notNull(),
  salePrice: integer("sale_price"), // Discounted price
  discountPercentage: integer("discount_percentage").default(0), // Percentage (e.g., 50)
  saleEndsAt: timestamp("sale_ends_at"), // When the sale expires
  licenseType: text("license_type").default("personal"),
  // Physical Product Fields
  stockQuantity: integer("stock_quantity"), // Null for digital
  lowStockThreshold: integer("low_stock_threshold").default(5), // Notification threshold
  sku: text("sku"), // Optional Stock Keeping Unit
  weight: integer("weight"), // In grams
  requiresShipping: boolean("requires_shipping").default(false),
  salesCount: integer("sales_count").default(0),
  appearanceSettings: jsonb("appearance_settings").$type<{
    theme?: 'light' | 'dark' | 'sepia' | 'fantasy' | 'sci-fi' | 'romance';
    fontFamily?: 'serif' | 'sans';
    fontSize?: number;
    lineHeight?: number;
    backgroundColor?: string;
    textColor?: string;
  }>(),
  merchandiseCategory: text("merchandise_category"),
  customFields: jsonb("custom_fields").default([]),
  productImages: jsonb("product_images").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isSerialized: boolean("is_serialized").default(false),
  seriesStatus: text("series_status").default("ongoing"), // ongoing, completed
  lastChapterUpdatedAt: timestamp("last_chapter_updated_at").defaultNow(),
  // Audiobook specific fields
  audioDuration: integer("audio_duration"), // In seconds
  audioPreviewUrl: text("audio_preview_url"),
  audioParts: jsonb("audio_parts").$type<{ url: string; title: string; duration: number }[]>().default([]),
});

export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shippingRates = pgTable("shipping_rates", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  regionName: text("region_name").notNull(),
  amount: integer("amount").notNull().default(0),
  deliveryTimeMin: integer("delivery_time_min"),
  deliveryTimeMax: integer("delivery_time_max"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shippingAddresses = pgTable("shipping_addresses", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  city: text("city").notNull(),
  addressLine: text("address_line").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(), // ref to products.id (int)
  name: text("name").notNull(),
  type: text("type").notNull().default("digital"),
  price: integer("price").notNull(),
  licenseType: text("license_type").default("standard"),
  fileUrl: text("file_url"),
});

export const bundles = pgTable("bundles", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id").notNull(), // UUID ref to users
  title: text("title").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  coverUrl: text("cover_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bundleItems = pgTable("bundle_items", {
  id: serial("id").primaryKey(),
  bundleId: integer("bundle_id").notNull(), // ref to bundles.id (int)
  productId: integer("product_id").notNull(), // ref to products.id (int)
});

// === 3. STORY COLLECTIONS (BUNDLES V2) ===

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  writerId: text("writer_id").notNull(), // UUID ref to users
  title: text("title").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  price: numeric("price", { precision: 10, scale: 2 }),
  discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  isFree: boolean("is_free").default(false),
  isPublished: boolean("is_published").default(false),
  visibility: text("visibility").default("public"), // public, private
  totalSales: integer("total_sales").default(0),
  estimatedTotalParts: integer("estimated_total_parts"),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const collectionItems = pgTable("collection_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull(), // ref to collections.id
  storyId: integer("story_id").notNull(), // ref to products.id
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // ref to users.id
  productType: text("product_type").notNull(), // story, collection
  productId: text("product_id").notNull(), // UUID or Int as string
  createdAt: timestamp("created_at").defaultNow(),
});

// === 3.5 UNIVERSES & LORE ===
export const universes = pgTable("universes", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const universeCharacters = pgTable("universe_characters", {
  id: serial("id").primaryKey(),
  universeId: integer("universe_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  traits: jsonb("traits").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const universeLocations = pgTable("universe_locations", {
  id: serial("id").primaryKey(),
  universeId: integer("universe_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  mapUrl: text("map_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const universeFactions = pgTable("universe_factions", {
  id: serial("id").primaryKey(),
  universeId: integer("universe_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const universeTimelineEvents = pgTable("universe_timeline_events", {
  id: serial("id").primaryKey(),
  universeId: integer("universe_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: text("event_date"), // String to support fictional dates
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// === 3. SOCIAL LAYERS ===

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: text("follower_id").notNull(),
  creatorId: text("creator_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  writerId: text("writer_id").notNull(),
  readerId: text("reader_id").notNull(),
  tierId: integer("tier_id"), // Added for Memberships
  subscribedAt: timestamp("subscribed_at").defaultNow(),
});

export const membershipTiers = pgTable("membership_tiers", {
  id: serial("id").primaryKey(),
  writerId: text("writer_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // Monthly price in cents
  benefits: jsonb("benefits").default([]), // Array of strings
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// === 3.1 ADVANCED CREATOR MEMBERSHIPS V2 ===

export const membershipClubs = pgTable("membership_clubs", {
  id: serial("id").primaryKey(),
  storeId: text("store_id").notNull(), // UUID of the creator/store owner
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const membershipPlans = pgTable("membership_plans", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(), // ref to membership_clubs
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  fullDescription: text("full_description"),
  thumbnailUrl: text("thumbnail_url"),
  bannerUrl: text("banner_url"),
  badgeUrl: text("badge_url"),
  colorTheme: text("color_theme").default("#cca660"),
  status: text("status").default("draft"), // draft, active, archived
  visibility: text("visibility").default("public"), // public, private, invite
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const planPricing = pgTable("plan_pricing", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(), // ref to membership_plans
  billingCycle: text("billing_cycle").notNull(), // monthly, quarterly, semi_annual, annual
  priceInCents: integer("price_in_cents").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const planBenefits = pgTable("plan_benefits", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(), // ref to membership_plans
  type: text("type").notNull(), // digital_access, credit, discount, exclusive_content, community
  name: text("name").notNull(),
  value: text("value"), // e.g. "20" for 20% discount
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const benefitScopes = pgTable("benefit_scopes", {
  id: serial("id").primaryKey(),
  benefitId: integer("benefit_id").notNull(), // ref to plan_benefits
  scopeType: text("scope_type").notNull(), // store, category, collection, series, universe, product_type, product
  scopeTargetId: text("scope_target_id"), // The ID of the target (e.g. category name, or product ID)
  createdAt: timestamp("created_at").defaultNow(),
});

export const benefitLimits = pgTable("benefit_limits", {
  id: serial("id").primaryKey(),
  benefitId: integer("benefit_id").notNull(), // ref to plan_benefits
  limitType: text("limit_type").notNull(), // per_month, per_year, unlimited
  limitValue: integer("limit_value"), // e.g. 5
  createdAt: timestamp("created_at").defaultNow(),
});

export const creatorSubscriptions = pgTable("creator_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // the subscriber
  planId: integer("plan_id").notNull(), // ref to membership_plans
  pricingId: integer("pricing_id").notNull(), // ref to plan_pricing
  status: text("status").default("active"), // active, past_due, canceled
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const entitlements = pgTable("entitlements", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull(),
  userId: text("user_id").notNull(),
  storeId: text("store_id").notNull(), // Ensures isolation
  benefitType: text("benefit_type").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeTargetId: text("scope_target_id"),
  limitType: text("limit_type"),
  limitValue: integer("limit_value"),
  usageCount: integer("usage_count").default(0), // Tracks usage in the current period
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storeCredits = pgTable("store_credits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  storeId: text("store_id").notNull(), // Isolation
  planId: integer("plan_id"),
  totalAmount: integer("total_amount").notNull(),
  remainingAmount: integer("remaining_amount").notNull(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  creditId: integer("credit_id").notNull(),
  transactionType: text("transaction_type").notNull(), // grant, use, expire
  amount: integer("amount").notNull(),
  relatedEntityId: text("related_entity_id"), // e.g., order ID if used for a physical book
  createdAt: timestamp("created_at").defaultNow(),
});

export const benefitUsageLogs = pgTable("benefit_usage_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  storeId: text("store_id").notNull(),
  entitlementId: integer("entitlement_id"),
  usageType: text("usage_type").notNull(), // discount_applied, digital_access, physical_claim
  amountSaved: integer("amount_saved").default(0),
  relatedEntityId: text("related_entity_id"), // e.g. Order ID or Product ID
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  type: text("type").notNull().default("text"), // text, announcement, poll, image, video
  title: text("title"),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  isExclusive: boolean("is_exclusive").default(false), // For members only
  isPinned: boolean("is_pinned").default(false),
  pollOptions: jsonb("poll_options").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const communityComments = pgTable("community_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityLikes = pgTable("community_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedLibrary = pgTable("saved_library", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: integer("product_id").notNull(),
  savedAt: timestamp("saved_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(), // UUID from Supabase
  storeId: text("store_id").notNull(), // UUID of the store owner
  senderId: text("sender_id").notNull(), // UUID of the message sender
  content: text("content").notNull(),
  replyToId: text("reply_to_id"), // UUID of the message being replied to
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === 4. CART & ORDERS ===

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: integer("product_id"),
  collectionId: uuid("collection_id"),
  variantId: integer("variant_id"),
  quantity: integer("quantity").default(1),
  customizationData: jsonb("customization_data").default({}),
  addedAt: timestamp("added_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  totalAmount: integer("total_amount").notNull(),
  platformFee: integer("platform_fee").notNull(),
  creatorEarnings: integer("creator_earnings").notNull(),
  status: text("status").notNull().default("pending"),
  paymentIntentId: text("payment_intent_id"),
  // Local Payment Fields
  paymentMethod: text("payment_method").default("card"),
  paymentProofUrl: text("payment_proof_url"),
  paymentReference: text("payment_reference"),
  isVerified: boolean("is_verified").default(false),
  // Physical Order Fields
  shippingAddress: jsonb("shipping_address").$type<{
    fullName: string;
    phoneNumber: string;
    city: string;
    addressLine: string;
  }>(),
  shippingCost: integer("shipping_cost").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id"),
  collectionId: uuid("collection_id"),
  variantId: integer("variant_id"),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  licenseType: text("license_type"),
  creatorId: text("creator_id").notNull(),
  // Physical/Tracking Fields
  fulfillmentStatus: text("fulfillment_status").default("pending"), // pending, shipped, delivered, cancelled, returned
  returnStatus: text("return_status"), // pending_approval, approved, rejected, refunded
  returnReason: text("return_reason"),
  trackingNumber: text("tracking_number"),
  customizationData: jsonb("customization_data").default({}),
  shippedAt: timestamp("shipped_at"),
});

export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  orderId: integer("order_id"), // Optional: order link
  designRequestId: uuid("design_request_id"), // Optional: commission link
  amount: integer("amount").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").default("pending"), // pending, processed, rejected
  method: text("method").default("stripe"),
  methodDetails: text("method_details"), // e.g., Vodafone Cash number, InstaPay address
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// === 5. MARKETING ===

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  writerId: text("writer_id").notNull(),
  code: text("code").notNull(),
  discountType: text("discount_type").default("percentage"),
  discountValue: integer("discount_value").notNull(),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const couponUsage = pgTable("coupon_usage", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull(),
  userId: text("user_id").notNull(),
  orderId: integer("order_id").notNull(),
  usedAt: timestamp("used_at").defaultNow(),
});

// === 6. ADMIN SYSTEM ===

export const adminPrivateMessages = pgTable("admin_private_messages", {
  id: serial("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: text("admin_id").notNull(),
  action: text("action").notNull(), // e.g., 'verify_writer', 'suspend_user', 'update_settings'
  targetId: text("target_id"), // e.g., the user_id that was suspended
  details: text("details"), // JSON stringified or plain text explanation
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  userId: text("user_id"), // Might be null if user doesn't exist
  emailAttempted: text("email_attempted"),
  ipAddress: text("ip_address"),
  status: text("status").notNull(), // 'success', 'failed'
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminWriterAnnouncements = pgTable("admin_writer_announcements", {
  id: serial("id").primaryKey(),
  adminId: text("admin_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === 7. CREATIVE HUB (PORTFOLIO & COMMISSIONS) ===
export const designRequests = pgTable("design_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull(), // Adjusted to text to support MemStorage IDs
  artistId: text("artist_id").notNull(), // Adjusted to text to support MemStorage IDs
  title: text("title").notNull(),
  description: text("description").notNull(),
  budget: integer("budget").notNull(), // In EGP
  deadline: timestamp("deadline"),
  licenseType: text("license_type").default("personal"), // personal, commercial
  status: text("status").notNull().default("inquiry"), // inquiry, pending, awaiting_payment, payment_under_review, payment_confirmed, in_progress, delivered, completed, rejected
  paymentProofUrl: text("payment_proof_url"),
  paymentReference: text("payment_reference"),
  paymentVerifiedBy: text("payment_verified_by"),
  paymentVerifiedAt: timestamp("payment_verified_at"),
  escrowLocked: boolean("escrow_locked").default(false),
  referenceImages: jsonb("reference_images"), // Array of strings
  finalFileUrl: text("final_file_url"), // The actual delivery
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

});

export const privateChats = pgTable("private_chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // The client initiating the chat
  artistId: text("artist_id").notNull(), // The designer/artist receiving the chat
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const privateChatMessages = pgTable("private_chat_messages", {
  id: serial("id").primaryKey(),
  chatId: uuid("chat_id").notNull(), // References privateChats.id
  senderId: text("sender_id").notNull(), // User who sent the message
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: text("artist_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'Cover', 'Character', 'Map', 'UI', 'Branding', 'Other'
  imageUrl: text("image_url").notNull(),

  additionalImages: jsonb("additional_images"), // Array of strings (URLs)
  thumbnailUrl: text("thumbnail_url"),
  tags: text("tags"),
  orderIndex: integer("order_index").default(0),
  yearCreated: text("year_created"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const designMessages = pgTable("design_messages", {
  id: serial("id").primaryKey(),
  requestId: uuid("request_id").notNull(),
  senderId: text("sender_id").notNull(),
  message: text("message").notNull(),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Recipient
  actorId: text("actor_id"), // Triggerer (optional)
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // commerce, content, social, creator, engagement, store
  priority: text("priority").notNull().default("low"), // low, medium, high
  link: text("link"), // Deep link URL
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  categories: jsonb("categories").$type<{
    commerce: boolean;
    content: boolean;
    social: boolean;
    creator: boolean;
    engagement: boolean;
    store: boolean;
  }>().default({
    commerce: true,
    content: true,
    social: true,
    creator: true,
    engagement: true,
    store: true,
  }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mediaVideos = pgTable("media_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  youtubeUrl: text("youtube_url").notNull(),
  youtubeVideoId: text("youtube_video_id").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  category: text("category").notNull(), // 'trailer', 'song', 'announcement', 'universe'
  relatedStoryId: integer("related_story_id"), // Ref to products.id
  isFeatured: boolean("is_featured").default(false),
  createdBy: text("created_by").notNull(), // Admin user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storeAnalytics = pgTable("store_analytics", {
  id: serial("id").primaryKey(),
  storeId: text("store_id").notNull(), // The creator's user_id
  visitorId: text("visitor_id"), // Optional if logged in
  eventType: text("event_type").notNull(), // profile_view, product_click
  targetId: text("target_id"), // e.g., product_id if product_click
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS & TYPES ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const updateProfileSchema = insertUserSchema.pick({
  displayName: true,
  bio: true,
  avatarUrl: true,
  bannerUrl: true,
  storeSettings: true,
  shippingPolicy: true,
  skills: true
}).partial();
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, rating: true, reviewCount: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertVariantSchema = createInsertSchema(productVariants).omit({ id: true });
export const insertBundleSchema = createInsertSchema(bundles).omit({ id: true, createdAt: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, addedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true, totalSales: true });
export const insertCollectionItemSchema = createInsertSchema(collectionItems).omit({ id: true, createdAt: true });
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true, usageCount: true });
export const insertEarningSchema = createInsertSchema(earnings).omit({ id: true, createdAt: true });
export const insertPayoutSchema = createInsertSchema(payouts).omit({ id: true, requestedAt: true, processedAt: true });
export const insertShippingRateSchema = createInsertSchema(shippingRates).omit({ id: true, createdAt: true });
export const insertShippingAddressSchema = createInsertSchema(shippingAddresses).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertAdminPrivateMessageSchema = createInsertSchema(adminPrivateMessages).omit({ id: true, createdAt: true });
export const insertAdminAnnouncementSchema = createInsertSchema(adminWriterAnnouncements).omit({ id: true, createdAt: true });
export const insertPortfolioSchema = createInsertSchema(portfolios).omit({ id: true, createdAt: true, deletedAt: true });
export const insertDesignRequestSchema = createInsertSchema(designRequests, {
  deadline: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, clientId: true });
export const insertDesignMessageSchema = createInsertSchema(designMessages).omit({ id: true, createdAt: true });

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({ id: true, updatedAt: true });
export const insertMediaVideoSchema = createInsertSchema(mediaVideos, {
  relatedStoryId: z.number().nullable().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, youtubeVideoId: true, thumbnailUrl: true, createdBy: true });


export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export const insertChapterSchema = createInsertSchema(chapters).omit({ id: true, createdAt: true });
export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;

export type Variant = typeof productVariants.$inferSelect;
export type InsertVariant = z.infer<typeof insertVariantSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

export type Earning = typeof earnings.$inferSelect;
export type InsertEarning = z.infer<typeof insertEarningSchema>;

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;

export type ShippingRate = typeof shippingRates.$inferSelect;
export type InsertShippingRate = z.infer<typeof insertShippingRateSchema>;

export type ShippingAddress = typeof shippingAddresses.$inferSelect;
export type InsertShippingAddress = z.infer<typeof insertShippingAddressSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type AdminPrivateMessage = typeof adminPrivateMessages.$inferSelect;
export type InsertAdminPrivateMessage = z.infer<typeof insertAdminPrivateMessageSchema>;

export type AdminAnnouncement = typeof adminWriterAnnouncements.$inferSelect;
export type InsertAdminAnnouncement = z.infer<typeof insertAdminAnnouncementSchema>;

export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;

export type DesignRequest = typeof designRequests.$inferSelect;
export type InsertDesignRequest = z.infer<typeof insertDesignRequestSchema>;

export type DesignMessage = typeof designMessages.$inferSelect;
export type InsertDesignMessage = z.infer<typeof insertDesignMessageSchema>;

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type InsertCollectionItem = z.infer<typeof insertCollectionItemSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;

export type MediaVideo = typeof mediaVideos.$inferSelect;
export type InsertMediaVideo = z.infer<typeof insertMediaVideoSchema>;

// Request Types
export type CreateProductRequest = InsertProduct & { variants?: InsertVariant[] };
export type UpdateProductRequest = Partial<InsertProduct>;

// === NEW STORE SYSTEM TYPES ===
export const insertUniverseSchema = createInsertSchema(universes).omit({ id: true, createdAt: true, updatedAt: true });
export type Universe = typeof universes.$inferSelect;
export type InsertUniverse = z.infer<typeof insertUniverseSchema>;

export const insertUniverseCharacterSchema = createInsertSchema(universeCharacters).omit({ id: true, createdAt: true });
export type UniverseCharacter = typeof universeCharacters.$inferSelect;
export type InsertUniverseCharacter = z.infer<typeof insertUniverseCharacterSchema>;

export const insertUniverseLocationSchema = createInsertSchema(universeLocations).omit({ id: true, createdAt: true });
export type UniverseLocation = typeof universeLocations.$inferSelect;
export type InsertUniverseLocation = z.infer<typeof insertUniverseLocationSchema>;

export const insertUniverseFactionSchema = createInsertSchema(universeFactions).omit({ id: true, createdAt: true });
export type UniverseFaction = typeof universeFactions.$inferSelect;
export type InsertUniverseFaction = z.infer<typeof insertUniverseFactionSchema>;

export const insertUniverseTimelineEventSchema = createInsertSchema(universeTimelineEvents).omit({ id: true, createdAt: true });
export type UniverseTimelineEvent = typeof universeTimelineEvents.$inferSelect;
export type InsertUniverseTimelineEvent = z.infer<typeof insertUniverseTimelineEventSchema>;

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;

export const insertCommunityCommentSchema = createInsertSchema(communityComments).omit({ id: true, createdAt: true });
export type CommunityComment = typeof communityComments.$inferSelect;
export type InsertCommunityComment = z.infer<typeof insertCommunityCommentSchema>;

export const insertCommunityLikeSchema = createInsertSchema(communityLikes).omit({ id: true, createdAt: true });
export type CommunityLike = typeof communityLikes.$inferSelect;
export type InsertCommunityLike = z.infer<typeof insertCommunityLikeSchema>;

export const insertMembershipTierSchema = createInsertSchema(membershipTiers).omit({ id: true, createdAt: true });
export type MembershipTier = typeof membershipTiers.$inferSelect;
export type InsertMembershipTier = z.infer<typeof insertMembershipTierSchema>;

export const insertStoreAnalyticsSchema = createInsertSchema(storeAnalytics).omit({ id: true, createdAt: true });
export type StoreAnalytics = typeof storeAnalytics.$inferSelect;
export type InsertStoreAnalytics = z.infer<typeof insertStoreAnalyticsSchema>;

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({ id: true, createdAt: true });
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;

// === PHASE 2: CONTENT & CREATOR MODERATION ===

export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reporterId: text("reporter_id").notNull(),
  targetType: text("target_type").notNull(), // 'user', 'product', 'review', 'comment'
  targetId: text("target_id").notNull(), // string because user ids are text, product ids can be casted
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // 'pending', 'investigating', 'resolved', 'dismissed'
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
});

export const productModeration = pgTable("product_moderation", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'flagged'
  moderatedBy: text("moderated_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === PHASE 3: FINANCIALS ===
export const platformFinances = pgTable("platform_finances", {
  id: serial("id").primaryKey(),
  period: text("period").notNull(), // e.g. '2026-06'
  totalRevenue: integer("total_revenue").notNull().default(0),
  platformFees: integer("platform_fees").notNull().default(0),
  creatorPayouts: integer("creator_payouts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentReportSchema = createInsertSchema(contentReports).omit({ id: true, createdAt: true, resolvedAt: true, resolvedBy: true, adminNotes: true, status: true });
export type ContentReport = typeof contentReports.$inferSelect;
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;

export const insertProductModerationSchema = createInsertSchema(productModeration).omit({ id: true, createdAt: true, updatedAt: true, moderatedBy: true });
export type ProductModeration = typeof productModeration.$inferSelect;
export type InsertProductModeration = z.infer<typeof insertProductModerationSchema>;

// === PHASE 4: MARKETING, COMMUNITY & SETTINGS ===
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const globalNotifications = pgTable("global_notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // 'info', 'warning', 'success', 'marketing'
  targetRole: text("target_role").notNull().default("all"), // 'all', 'writer', 'reader'
  createdAt: timestamp("created_at").defaultNow(),
});

export const globalChatMessages = pgTable("global_chat_messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  isFlagged: boolean("is_flagged").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type GlobalNotification = typeof globalNotifications.$inferSelect;
export type GlobalChatMessage = typeof globalChatMessages.$inferSelect;
