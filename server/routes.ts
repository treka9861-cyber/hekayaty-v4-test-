import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertOrderSchema, insertCartItemSchema, insertVariantSchema, insertShippingRateSchema, insertShippingAddressSchema, insertMediaVideoSchema } from "@shared/schema";
import { setupAuth, hashPassword } from "./auth";
import multer from "multer";
import { processAudiobook, generateSignedUrl } from "./audio-processor";
import path from "path";
import fs from "fs";
import edgeRoutes from "./routes/edge.index";
import { calculateCommission } from "./utils/financial";
import { enqueueOrRun, payoutQueue, notificationQueue } from "./queue";
import { canUserAccessProduct, getSubscriptionLibrary } from "./controllers/access.controller";

import os from "os";

const upload = multer({ dest: os.tmpdir() });

function extractYoutubeVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'dummy';

  if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ Supabase credentials missing from environment variables.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Setup Real Auth
  setupAuth(app);

  // Helper function for creating notifications
  const notify = async (userId: string, title: string, content: string, type: string, priority: string = 'low', link?: string, metadata: any = {}, actorId?: string) => {
    try {
      await storage.createNotification({
        userId,
        actorId: actorId || null,
        title,
        content,
        type,
        priority,
        link: link || null,
        metadata,
        isRead: false
      });

      // Handle Email Alerts based on user settings
      const settings = await storage.getNotificationSettings(userId);
      const isEnabledForCategory = (settings?.categories as any)?.[type] !== false;

      if (settings?.emailNotifications && isEnabledForCategory) {
        // Integration point for email service (e.g. Resend, SendGrid)
        // For now logging to console to demonstrate the flow
        console.log(`[NOTIFY][EMAIL] Alerting user ${userId} about: ${title}`);
      }
    } catch (e) {
      console.error("[NotificationError]", e);
    }
  };

  // DEV AUTH OVERRIDE: Trust X-User-ID header for prototyping compatibility between Supabase frontend and Express backend
  app.use((req, res, next) => {
    // Skip static files or if already authenticated
    if (req.path.startsWith('/api')) {
      const devUserId = req.headers['x-user-id'];
      if (devUserId) {
        // Mock the passport user object
        req.user = { id: devUserId as string, username: 'dev_user', role: 'admin' } as any;
        req.isAuthenticated = (() => true) as any;
      }
    }
    next();
  });

  // Mount migrated edge functions
  app.use("/api/edge", edgeRoutes);

  // === USERS & SOCIAL ===

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user || user.role === 'admin') return res.status(404).json({ message: "User not found" });

    try {
      // Run queries in parallel
      const [productsRes, followersRes, followingRes] = await Promise.all([
        supabase.from('products').select('sales_count').eq('writer_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('creator_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
      ]);

      const totalSales = productsRes.data?.reduce((acc, p) => acc + (p.sales_count || 0), 0) || 0;
      const followersCount = followersRes.count || 0;
      const followingCount = followingRes.count || 0;

      res.json({
        ...user,
        followersCount,
        followingCount,
        totalSales
      });
    } catch (error) {
      console.error("Error fetching social/sales stats:", error);
      // Fallback to storage values if Supabase fails
      const followers = await storage.getFollowers(user.id);
      const following = await storage.getFollowing(user.id);
      const creatorOrders = await storage.getCreatorOrders(user.id);
      res.json({ ...user, followersCount: followers, followingCount: following.length, totalSales: creatorOrders.length });
    }
  });

  app.get(api.users.listWriters.path, async (req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    try {
      const { sort, verified } = req.query as { sort?: string; verified?: string };
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

      let query = supabase
        .from('users')
        .select('id, username, display_name, avatar_url, banner_url, bio, role, is_verified, created_at, subscription_tier')
        .in('role', ['writer', 'artist']);

      // Apply verified filter
      if (verified === 'true') query = query.eq('is_verified', true);
      if (verified === 'false') query = query.eq('is_verified', false);

      const { data: writers, error } = await query;
      if (error) throw error;

      // Enrich with product counts and followers
      const enriched = await Promise.all((writers || []).map(async (writer: any) => {
        const [productsRes, followersRes] = await Promise.all([
          supabase.from('products').select('id, rating, sales_count', { count: 'exact' }).eq('writer_id', writer.id).eq('is_published', true),
          supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', writer.id)
        ]);
        const products = productsRes.data || [];
        const avgRating = products.length > 0
          ? products.reduce((s: number, p: any) => s + (p.rating || 0), 0) / products.length
          : 0;
        return {
          ...writer,
          displayName: writer.display_name,
          avatarUrl: writer.avatar_url,
          isVerified: writer.is_verified,
          productCount: productsRes.count || 0,
          followersCount: followersRes.count || 0,
          totalSales: products.reduce((s: number, p: any) => s + (p.sales_count || 0), 0),
          avgRating: Math.round(avgRating * 10) / 10,
        };
      }));

      // Apply sort
      if (sort === 'followers') enriched.sort((a: any, b: any) => b.followersCount - a.followersCount);
      else if (sort === 'rating') enriched.sort((a: any, b: any) => b.avgRating - a.avgRating);
      else if (sort === 'sales') enriched.sort((a: any, b: any) => b.totalSales - a.totalSales);
      else enriched.sort((a: any, b: any) => (b.productCount || 0) - (a.productCount || 0)); // default: by story count

      res.json(enriched);
    } catch (e: any) {
      // Fallback to storage
      const writers = await storage.listWriters();
      res.json(writers);
    }
  });


  app.patch("/api/users/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const { updateProfileSchema } = await import('../shared/schema');
      const safeUpdates = updateProfileSchema.parse(req.body);
      const updated = await storage.updateUser(userId, safeUpdates);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Update failed", details: err });
    }
  });

  app.post("/api/social/follow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { creatorId } = req.body;
    await storage.followUser(userId, creatorId);

    // Notify Creator
    const user = await storage.getUser(userId);
    await notify(
      creatorId,
      "New Follower!",
      `${user?.displayName || user?.username} started following you.`,
      'social',
      'medium',
      `/profile/${user?.username}`,
      { followerId: userId },
      userId
    );

    res.sendStatus(200);
  });

  // --- PRIVATE CHATS & STORE MESSAGES ---
  app.post("/api/chat/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { artistId } = req.body;

    try {

      // 1. Check existing
      const { data: existing } = await supabase
        .from('private_chats')
        .select('id')
        .eq('user_id', userId)
        .eq('artist_id', artistId)
        .single();

      if (existing) return res.json(existing);

      // 2. Create new
      const { data: newChat, error } = await supabase
        .from('private_chats')
        .insert({ user_id: userId, artist_id: artistId })
        .select()
        .single();

      if (error) throw error;
      res.json(newChat);
    } catch (err) {
      res.status(500).json({ message: "Failed to start chat" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const senderId = (req.user as any).id;
    const senderName = (req.user as any).display_name || (req.user as any).username;
    const { chatId, content } = req.body;

    try {

      // 1. Get chat info to find recipient
      const { data: chat } = await supabase
        .from('private_chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (!chat) return res.status(404).json({ message: "Chat not found" });

      const recipientId = senderId === chat.user_id ? chat.artist_id : chat.user_id;

      // 2. Insert message
      const { data: msg, error } = await supabase
        .from('private_chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          content
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Update chat timestamp
      await supabase.from('private_chats').update({ updated_at: new Date() }).eq('id', chatId);

      // 4. Notify Recipient
      await notify(
        recipientId,
        "New Store Message",
        `You have a new message from ${senderName}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        'store',
        'high',
        `/dashboard?tab=messages&chatId=${chatId}`,
        { chatId, messageId: msg.id },
        senderId
      );

      res.json(msg);
    } catch (err) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/social/unfollow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { creatorId } = req.body;
    await storage.unfollowUser(userId, creatorId);
    res.sendStatus(200);
  });

  app.get("/api/social/library", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const library = await storage.getLibrary(userId);

    // Sign Audiobook URLs for security
    const signedLibrary = library.map((item: any) => {
      if (item.type === 'audiobook' && (item as any).audioParts?.length > 0) {
        return {
          ...item,
          audioParts: (item as any).audioParts.map((p: any) => ({
            ...p,
            url: generateSignedUrl(p.url)
          }))
        };
      }
      return item;
    });

    res.json(signedLibrary);
  });

  app.post("/api/social/library", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { productId } = req.body;
    await storage.addToLibrary(userId, productId);
    res.sendStatus(200);
  });

  app.post("/api/social/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { productId } = req.body;
    const isLiked = await storage.toggleLike(userId, productId);
    res.json({ isLiked });
  });

  // === PRODUCTS & VARIANTS ===

  app.get(api.products.list.path, async (req, res) => {
    const filters = {
      writerId: req.query.writerId as string,
      genre: req.query.genre as string,
      search: req.query.search as string,
      type: req.query.type as string,
      // If writerId is provided (Dashboard), allow fetching all including drafts (undefined filter).
      // If writerId is NOT provided (Marketplace), FORCE isPublished=true to hide drafts.
      isPublished: req.query.writerId ? undefined : true,
    };
    const products = await storage.getProducts(filters);
    // Edge CDN: Cache public catalog for 60s, allow stale for 5 mins
    if (!req.query.writerId) {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    const variants = await storage.getVariants(product.id);

    // Deep copy to modify
    const processedProduct = JSON.parse(JSON.stringify(product));

    if (processedProduct.type === 'audiobook' && processedProduct.audioParts?.length > 0) {
      const userId = (req.user as any)?.id;
      let hasPurchased = false;

      if (userId) {
        const library = await storage.getLibrary(userId);
        hasPurchased = library.some((item: any) => item.id === product.id);
      }

      // If purchased, sign all. If not, only sign the first part as a preview.
      processedProduct.audioParts = processedProduct.audioParts.map((p: any, idx: number) => {
        if (hasPurchased || idx === 0) {
          return { ...p, url: generateSignedUrl(p.url) };
        }
        return { ...p, url: "" }; // Hide URL for other parts
      });
    }

    res.json({ ...processedProduct, variants });
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      throw err;
    }
  });

  app.post("/api/products/:id/variants", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const product = await storage.getProduct(Number(req.params.id));
      if (!product) return res.status(404).json({ message: "Product not found" });
      if (product.writerId !== userId && (req.user as any).role !== 'admin') return res.sendStatus(403);

      const input = insertVariantSchema.parse({ ...req.body, productId: Number(req.params.id) });
      const variant = await storage.createVariant(input);
      res.status(201).json(variant);
    } catch (err) {
      res.status(400).json({ message: "Invalid variant data" });
    }
  });

  app.patch(api.products.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const existingProduct = await storage.getProduct(Number(req.params.id));
      if (!existingProduct) return res.status(404).json({ message: "Product not found" });
      if (existingProduct.writerId !== userId && (req.user as any).role !== 'admin') return res.sendStatus(403);

      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      res.json(product);
    } catch (err) {
      res.status(400).json({ message: "Update failed" });
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    
    const existingProduct = await storage.getProduct(Number(req.params.id));
    if (!existingProduct) return res.status(404).json({ message: "Product not found" });
    if (existingProduct.writerId !== userId && (req.user as any).role !== 'admin') return res.sendStatus(403);

    await storage.deleteProduct(Number(req.params.id));
    res.status(204).send();
  });

  // --- AUDIOBOOK PROCESSING ---
  app.post("/api/audio/process", upload.single("audio"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const multerReq = req as any;
    if (!multerReq.file) return res.status(400).json({ message: "No audio file uploaded" });

    try {
      const parts = await processAudiobook(multerReq.file.path);

      // Calculate total duration
      const totalDuration = parts.reduce((acc, p) => acc + p.duration, 0);

      // Clean up the uploaded file
      fs.unlinkSync(multerReq.file.path);

      res.json({
        parts,
        totalDuration,
      });
    } catch (error) {
      console.error("[AudioProcessError]", error);
      // Try to clean up if it exists
      if (multerReq.file && fs.existsSync(multerReq.file.path)) {
        fs.unlinkSync(multerReq.file.path);
      }
      res.status(500).json({ message: "Failed to process audiobook", error: String(error) });
    }
  });

  // === STORE SYSTEM: UNIVERSES ===
  app.get("/api/universes", async (req, res) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const creatorId = req.query.creatorId;
      let query = supabase.from('universes').select('*');
      if (creatorId) query = query.eq('creator_id', creatorId);
      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/universes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { name, description, coverUrl, isPublic } = req.body;
      const { data, error } = await supabase.from('universes').insert({
        creator_id: (req.user as any).id,
        name, description, cover_url: coverUrl, is_public: isPublic
      }).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // === STORE SYSTEM: COMMUNITY ===
  app.get("/api/community", async (req, res) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const creatorId = req.query.creatorId;
      let query = supabase.from('community_posts').select('*').order('created_at', { ascending: false });
      if (creatorId) query = query.eq('creator_id', creatorId);
      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/community", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { title, content, type, isExclusive, mediaUrl } = req.body;
      const { data, error } = await supabase.from('community_posts').insert({
        creator_id: (req.user as any).id,
        title, content, type, is_exclusive: isExclusive, media_url: mediaUrl
      }).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // === STORE SYSTEM: ANALYTICS ===
  app.post("/api/analytics/track", async (req, res) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { storeId, eventType, targetId } = req.body;
      const visitorId = req.isAuthenticated() ? (req.user as any).id : null;
      const { error } = await supabase.from('store_analytics').insert({
        store_id: storeId,
        visitor_id: visitorId,
        event_type: eventType,
        target_id: targetId
      });
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      // Analytics should never crash the client, return 200 silently
      res.json({ success: false });
    }
  });

  // === STORE SYSTEM: MEMBERSHIPS ===
  app.get("/api/memberships", async (req, res) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const writerId = req.query.writerId;
      let query = supabase.from('membership_tiers').select('*').eq('is_active', true);
      if (writerId) query = query.eq('writer_id', writerId);
      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // === DEBUG TOOLS ===

  app.get("/api/debug/dump-tables", async (req, res) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: products } = await supabase.from('products').select('id, title, writer_id').limit(5);
      const { data: earnings } = await supabase.from('earnings').select('*').limit(10);
      const { data: users } = await supabase.from('users').select('id, username').limit(5);
      const { data: orderItems } = await supabase.from('order_items').select('*').limit(5);

      res.json({
        products,
        earnings,
        users,
        orderItems,
        currentUser: req.headers['x-user-id']
      });
    } catch (error) {
      res.status(500).json({ error });
    }
  });


  // === CART ===

  app.get("/api/cart", async (req, res) => {
    if (!req.isAuthenticated()) {
      // Return empty cart for guests or handle session cart later, for now empty
      return res.json([]);
    }
    const userId = (req.user as any).id;
    const items = await storage.getCart(userId);
    res.json(items);
  });

  app.post("/api/cart", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const input = insertCartItemSchema.parse({ ...req.body, userId });
      const item = await storage.addToCart(input);
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: item } = await supabase.from('cart_items').select('user_id').eq('id', req.params.id).single();
      if (!item) return res.status(404).json({ message: "Not found" });
      if (item.user_id !== userId) return res.sendStatus(403);

      await storage.removeFromCart(Number(req.params.id));
      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
    }
  });

  app.patch("/api/cart/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { quantity } = req.body;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: cartItem } = await supabase.from('cart_items').select('user_id').eq('id', req.params.id).single();
      if (!cartItem) return res.status(404).json({ message: "Cart item not found" });
      if (cartItem.user_id !== userId) return res.sendStatus(403);

      const item = await storage.updateCartItem(Number(req.params.id), Number(quantity));
      res.json(item);
    } catch (err) {
      res.status(404).json({ message: "Cart item not found" });
    }
  });

  // === ORDERS & CHECKOUT ===

  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { items, totalAmount, paymentMethod, paymentProofUrl, paymentReference, shippingAddress, shippingCost, shippingBreakdown } = req.body;

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Group items by creator to calculate fees
      // 1. Fetch product details to determine commission rates
      const productIds = items.map((i: any) => i.productId);
      const { data: productsData } = await supabase
        .from('products')
        .select('id, type, writer_id, stock_quantity, title, price, sale_price');

      const productMap = new Map(productsData?.map((p: any) => [p.id, p]) || []);

      let totalPlatformFee = 0;
      let totalCreatorEarnings = 0;
      let calculatedTotalAmount = 0;
      const earningsByCreator = new Map<string, number>();

      // 2. Calculate fees per item based on creator's commission rate
      for (const item of items) {
        const product = productMap.get(item.productId);

        // Stock Check
        if (product?.type === 'physical') {
          const stock = product.stock_quantity ?? 0;
          const requested = item.quantity || 1;
          if (stock < requested) {
            return res.status(400).json({ message: `Insufficient stock for "${product.title}". Only ${stock} left.` });
          }
        }

        // Pricing Check: Use server-side price
        const realPrice = product?.sale_price != null ? product.sale_price : (product?.price || 0);
        const quantity = item.quantity || 1;
        const totalPrice = realPrice * quantity;

        calculatedTotalAmount += totalPrice;

        const { fee, earning } = calculateCommission(totalPrice);

        totalPlatformFee += fee;
        totalCreatorEarnings += earning;

        // Aggregate per creator using secure database writer_id
        const secureCreatorId = product?.writer_id;
        if (secureCreatorId) {
          const currentEarning = earningsByCreator.get(secureCreatorId) || 0;
          earningsByCreator.set(secureCreatorId, currentEarning + earning);
          
          // Re-assign secure values back to item for Order Items insertion later
          item.securePrice = realPrice;
          item.secureCreatorId = secureCreatorId;
        }
      }

      // 2.1 Add Shipping to Earnings
      // 2.1 Add Shipping to Earnings and Total Amount
      const validatedShippingCost = Number(shippingCost) || 0;
      calculatedTotalAmount += validatedShippingCost;
      
      if (shippingBreakdown && Array.isArray(shippingBreakdown)) {
        for (const ship of shippingBreakdown) {
          // Ideally validate ship.creatorId against the DB, but assuming frontend passes correct ones for shipping for now
          const current = earningsByCreator.get(ship.creatorId) || 0;
          earningsByCreator.set(ship.creatorId, current + (ship.amount || 0));
          totalCreatorEarnings += (ship.amount || 0);
        }
      }

      // 3. Determine initial status
      const isManualPayment = ["instapay", "vodafone_cash", "orange_cash", "etisalat_cash", "bank_transfer"].includes(paymentMethod.toLowerCase());
      const initialStatus = isManualPayment ? "pending" : "paid"; // Use 'pending' for manual payments

      // 4. Create Order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: calculatedTotalAmount, // SECURED
          platform_fee: totalPlatformFee,
          creator_earnings: totalCreatorEarnings,
          status: initialStatus,
          payment_method: paymentMethod || "card",
          payment_proof_url: paymentProofUrl || null,
          payment_reference: paymentReference || null,
          is_verified: !isManualPayment,
          payment_intent_id: isManualPayment ? `local_${Date.now()}` : `pi_simulated_${Date.now()}`,
          shipping_address: shippingAddress || null,
          shipping_cost: shippingCost || 0
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error("Order creation error:", orderError);
        return res.status(500).json({ message: "Failed to create order" });
      }

      // 5. Create Order Items
      const orderItemsToInsert = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId || null,
        price: item.securePrice || item.price, // Use secured price
        quantity: item.quantity || 1,
        license_type: "standard",
        creator_id: item.secureCreatorId || item.creatorId // Use secured creator

      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsError) {
        console.error("Order items creation error:", itemsError);
        // Rollback: delete the order
        await supabase.from('orders').delete().eq('id', order.id);
        return res.status(500).json({ message: "Failed to create order items" });
      }

      // 6. Create Earning Records asynchronously via BullMQ (non-blocking)
      if (initialStatus === "paid") {
        // Convert map to plain object for serialization
        const earningsObj: Record<string, number> = {};
        earningsByCreator.forEach((amount, creatorId) => { earningsObj[creatorId] = amount; });

        await enqueueOrRun(
          payoutQueue,
          'process-order-payout',
          { orderId: order.id, earningsByCreator: earningsObj },
          async () => {
            // Synchronous fallback (used in dev without Redis)
            for (const [creatorId, amount] of Object.entries(earningsObj)) {
              await supabase.from('earnings').insert({
                creator_id: creatorId,
                order_id: order.id,
                amount,
                status: 'pending'
              });
            }
          }
        );

        // INCREMENT SALES COUNT & DECREMENT STOCK (still inline — fast DB call)
        for (const item of items) {
          try {
            await supabase.rpc('increment_sales_count', { product_id: item.productId });

            // Decrement Stock for physical items
            const product = productMap.get(item.productId);
            if (product?.type === 'physical') {
              await supabase.rpc('decrement_stock_quantity', {
                product_id: item.productId,
                amount: item.quantity || 1
              });
            }
          } catch (e) { console.warn("Could not update counts/stock", e); }
        }
      }

      // Auto-decrement stock for PENDING manual orders too (reservation)
      if (initialStatus === "pending") {
        for (const item of items) {
          const product = productMap.get(item.productId);
          if (product?.type === 'physical') {
            try {
              await supabase.rpc('decrement_stock_quantity', {
                product_id: item.productId,
                amount: item.quantity || 1
              });
            } catch (e) { console.warn("Could not reserve stock", e); }
          }
        }
      }


      // 7. Clear cart in Supabase
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      // 8. Notifications
      // To Buyer
      await notify(
        userId,
        "Order Placed",
        `Your order #${order.id} for ${items.length} item(s) has been placed successfully.`,
        'commerce',
        'high',
        `/orders/${order.id}`,
        { orderId: order.id }
      );

      // To Sellers
      for (const [creatorId, amount] of Array.from(earningsByCreator.entries())) {
        await notify(
          creatorId,
          "New Sale!",
          `You have a new sale worth EGP ${amount}. Check your creator dashboard.`,
          'creator',
          'high',
          '/dashboard/orders',
          { orderId: order.id, amount }
        );
      }

      res.status(201).json(order);
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Verify Payment & Trigger Earnings
  app.post("/api/admin/orders/:id/verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    const orderId = parseInt(req.params.id);

    try {
      // 1. Get order from Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status === 'paid') {
        return res.status(400).json({ message: "Order already paid" });
      }

      // 2. Get order items with product and creator info
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(writer_id)
        `)
        .eq('order_id', orderId);

      if (itemsError || !orderItems) {
        console.error("Order items fetch error:", itemsError);
        return res.status(500).json({ message: "Failed to fetch order items" });
      }

      // 3. Group items by creator to calculate earnings
      const itemsByCreator = new Map<string, number>();
      orderItems.forEach((item: any) => {
        const creatorId = item.product?.writer_id || item.creator_id;
        const quantity = item.quantity || 1;
        const current = itemsByCreator.get(creatorId) || 0;
        itemsByCreator.set(creatorId, current + (item.price * quantity));
      });

      // 4. Create earnings for each creator
      for (const [creatorId, totalAmount] of Array.from(itemsByCreator.entries())) {
        // Unified 20% platform fee rule
        const { fee: platformFee, earning } = calculateCommission(totalAmount);

        // Insert earning record
        await supabase
          .from('earnings')
          .insert({
            creator_id: creatorId,
            order_id: orderId,
            amount: earning,
            status: 'pending'
          });
      }

      // INCREMENT SALES COUNT for verified items
      // We need to loop orderItems again or map them
      for (const item of orderItems) {
        // Using RPC is safer for atomic increments
        try {
          await supabase.rpc('increment_sales_count', { product_id: item.product_id });
        } catch (e) { console.warn("Could not increment sales count", e); }
      }

      // 5. Update order status to 'paid'
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          is_verified: true
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        console.error("Order update error:", updateError);
        return res.status(500).json({ message: "Failed to update order" });
      }

      // 6. Notifications
      // To Buyer
      await notify(
        order.user_id,
        "Payment Verified",
        `Payment for order #${orderId} has been verified. You can now access your digital items.`,
        'commerce',
        'high',
        `/orders/${orderId}`,
        { orderId }
      );

      // To Sellers (Payment confirmed)
      for (const creatorId of Array.from(itemsByCreator.keys())) {
        await notify(
          creatorId,
          "Payment Confirmed",
          `Payment for order #${orderId} has been confirmed. You will receive your earnings soon.`,
          'creator',
          'high',
          '/dashboard/orders',
          { orderId }
        );
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Admin verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/orders/pending", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending') // Pending status
        .eq('is_verified', false) // Not yet verified by admin
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ message: "Failed to fetch orders" });
      }

      res.json(orders);
    } catch (error) {
      console.error("Pending orders error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const orders = await storage.getUserOrders(userId);
    res.json(orders);
  });

  app.get("/api/orders/creator", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // In reality, check if user is creator
    const creatorId = (req.user as any).id;
    const orders = await storage.getCreatorOrders(creatorId);
    res.json(orders);
  });

  // === CREATOR ECONOMY ===

  app.get("/api/creator/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get earnings from Supabase
      console.log(`Fetching stats for creator: ${userId}`);
      let { data: earnings, error: earningsError } = await supabase
        .from('earnings')
        .select('*')
        .eq('creator_id', userId);

      console.log(`Found ${earnings?.length || 0} earnings for ${userId}`);

      // AUTO-FIX: Check if earnings exist for placeholder 'user_1' and transfer them
      if (!earnings || earnings.length === 0) {
        console.log("Checking for orphaned 'user_1' earnings...");
        const { data: demoEarnings } = await supabase
          .from('earnings')
          .select('*')
          .eq('creator_id', 'user_1');

        if (demoEarnings && demoEarnings.length > 0) {
          console.log(`Found ${demoEarnings.length} demo earnings. Transferring to ${userId}...`);

          // Transfer earnings
          await supabase
            .from('earnings')
            .update({ creator_id: userId })
            .eq('creator_id', 'user_1');

          // Transfer products
          await supabase
            .from('products')
            .update({ writer_id: userId })
            .eq('writer_id', 'user_1');

          // Refetch earnings for current user
          const { data: newEarnings } = await supabase
            .from('earnings')
            .select('*')
            .eq('creator_id', userId);

          earnings = newEarnings || [];
        }
      }

      const earningsList = earnings || [];

      if (earningsError) {
        console.error("Earnings fetch error:", earningsError);
        return res.json({
          totalEarnings: 0,
          totalPaid: 0,
          currentBalance: 0,
          recentEarnings: []
        });
      }

      // Get payouts from Supabase
      const { data: payouts, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('user_id', userId);

      if (payoutsError) {
        console.error("Payouts fetch error:", payoutsError);
      }

      const totalEarnings = earningsList.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalPaid = (payouts || [])
        .filter(p => p.status === 'processed')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const payoutRequests = (payouts || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const currentBalance = totalEarnings - payoutRequests;

      res.json({
        totalEarnings,
        totalPaid,
        currentBalance,
        recentEarnings: earningsList.slice(-5)
      });
    } catch (error) {
      console.error("Creator stats error:", error);
      res.json({
        totalEarnings: 0,
        totalPaid: 0,
        currentBalance: 0,
        recentEarnings: []
      });
    }
  });

  app.post("/api/creator/payouts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { amount, method } = req.body;

    // Validate balance (re-calculate to be safe)
    const earnings = await storage.getEarnings(userId);
    const payouts = await storage.getPayouts(userId);
    const totalEarnings = earnings.reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalPayouts = payouts.reduce((sum: number, p: any) => sum + p.amount, 0);
    const balance = totalEarnings - totalPayouts;

    if (amount > balance) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    if (amount < 2000) { // e.g. $20 minimum
      return res.status(400).json({ message: "Minimum payout is $20" });
    }

    const payout = await storage.createPayout({
      userId,
      amount,
      status: "pending",
      method: method || "stripe"
    });

    res.status(201).json(payout);
  });

  app.get("/api/creator/payouts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const payouts = await storage.getPayouts(userId);
    res.json(payouts);
  });

  // === REVIEWS & COUPONS ===

  app.get(api.reviews.list.path, async (req, res) => {
    const reviews = await storage.getReviews(Number(req.params.productId));
    res.json(reviews);
  });

  app.get(api.coupons.list.path, async (req, res) => {
    const coupons = await storage.getCoupons(req.params.writerId);
    res.json(coupons);
  });

  app.post(api.coupons.create.path, async (req, res) => {
    const coupon = await storage.createCoupon(req.body);
    res.status(201).json(coupon);
  });

  app.post("/api/coupons/validate", async (req, res) => {
    const { code, writerId } = req.body;
    const coupon = await storage.validateCoupon(code, writerId);
    if (!coupon) return res.status(404).json({ message: "Invalid coupon" });
    res.json(coupon);
  });

  app.post(api.reviews.create.path, async (req, res) => {
    try {
      const input = api.reviews.create.input.parse(req.body);
      const review = await storage.createReview(input);

      // Notify Content Creator
      const product = await storage.getProduct(input.productId);
      if (product) {
        const reviewer = await storage.getUser(input.userId);
        await notify(
          product.writerId,
          "New Review",
          `${reviewer?.displayName || 'A reader'} left a ${input.rating}-star review on your story "${product.title}".`,
          'content',
          'medium',
          `/story/${product.id}`,
          { productId: product.id, rating: input.rating },
          input.userId
        );
      }

      res.status(201).json(review);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      throw err;
    }
  });

  // === PHYSICAL PRODUCTS & SHIPPING ===

  // 1. Manage Shipping Rates (Creator)
  app.get("/api/shipping/rates/:creatorId", async (req, res) => {
    const rates = await storage.getShippingRates(req.params.creatorId);
    res.json(rates);
  });

  app.post("/api/shipping/rates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = insertShippingRateSchema.parse({
        ...req.body,
        creatorId: (req.user as any).id
      });
      const rate = await storage.createShippingRate(input);
      res.status(201).json(rate);
    } catch (err) {
      res.status(400).json({ message: "Invalid shipping rate data" });
    }
  });

  app.delete("/api/shipping/rates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Ideally check ownership
    await storage.deleteShippingRate(Number(req.params.id));
    res.sendStatus(204);
  });

  // 2. Calculate Shipping Cost (For Checkout)
  app.post("/api/shipping/calculate", async (req, res) => {
    const { items, address, city: directCity } = req.body;

    // Support both formats: { items, address: { city: '...' } } and { items, city: '...' }
    const targetCity = directCity || address?.city;

    if (!items || !targetCity) return res.status(400).json({ message: "Items and city required" });

    try {
      let totalShipping = 0;
      const breakdown: any[] = [];
      const city = String(targetCity).toLowerCase().trim();

      // Group by creator
      const itemsByCreator = new Map<string, any[]>();
      items.forEach((item: any) => {
        const list = itemsByCreator.get(item.creatorId) || [];
        list.push(item);
        itemsByCreator.set(item.creatorId, list);
      });

      // Calculate per creator
      for (const [creatorId, creatorItems] of Array.from(itemsByCreator.entries())) {
        const rates = await storage.getShippingRates(creatorId);

        // Find matching rate for city
        const cityRate = rates.find((r: any) => r.regionName.toLowerCase() === city);
        const defaultRate = rates.find((r: any) =>
          r.regionName.toLowerCase() === 'all' ||
          r.regionName.toLowerCase() === 'default' ||
          r.regionName.toLowerCase() === 'all over egypt'
        );

        const rateToUse = cityRate || defaultRate;

        if (rateToUse) {
          totalShipping += rateToUse.amount;
          breakdown.push({ creatorId, amount: rateToUse.amount, region: rateToUse.regionName });
        } else {
          breakdown.push({ creatorId, amount: 0, region: "Not Covered" });
        }
      }

      res.json({
        total: totalShipping, // Match frontend expectation
        totalShipping,        // Kept for backward compatibility
        breakdown
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Calculation failed" });
    }
  });

  // 3. Fulfillment Endpoints (Creator Dashboard)
  app.get("/api/orders/seller", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders (
            id, created_at, status, shipping_address, user:users(display_name, email)
          ),
          product:products (
            title, cover_url, type
          )
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Fetch seller orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/orders/:orderId/items/fulfill", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { itemIds, trackingNumber, status } = req.body; // status: shipped

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verify ownership (items must belong to creator)
      // Update items
      const { error } = await supabase
        .from('order_items')
        .update({
          fulfillment_status: status || 'shipped',
          tracking_number: trackingNumber,
          shipped_at: new Date().toISOString()
        })
        .in('id', itemIds)
        .eq('creator_id', userId);

      if (error) throw error;
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Update failed" });
    }
  });
  // === ADMIN ROUTES ===

  // === PHASE 2: CONTENT & CREATOR MODERATION ROUTES ===
  
  app.post("/api/reports", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const user = req.user as any;
      const { targetType, targetId, reason, description } = req.body;
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      const { data, error } = await supabase.from('content_reports').insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: String(targetId),
        reason,
        description,
        status: 'pending'
      }).select().single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("[API] Error submitting report:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/reports", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      const { data: reports, error } = await supabase.from('content_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      const userIds = [...new Set(reports.map((r: any) => r.reporter_id))];
      const { data: usersData } = await supabase.from('users').select('id, display_name, email, avatar_url').in('id', userIds);
      const userMap = new Map((usersData || []).map((u: any) => [u.id, u]));
      
      const enrichedReports = reports.map((r: any) => ({
        ...r,
        reporter: userMap.get(r.reporter_id) || null
      }));
      
      res.json(enrichedReports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/reports/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const admin = req.user as any;
    try {
      const { status, adminNotes } = req.body;
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      const updateData: any = { status };
      if (adminNotes !== undefined) updateData.admin_notes = adminNotes;
      if (status === 'resolved' || status === 'dismissed') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = admin.id;
      }
      
      const { data, error } = await supabase.from('content_reports')
        .update(updateData)
        .eq('id', req.params.id)
        .select()
        .single();
        
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/moderation/stories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      const { data: products, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      const { data: modData } = await supabase.from('product_moderation').select('*');
      const modMap = new Map((modData || []).map((m: any) => [m.product_id, m]));
      
      const enrichedProducts = products.map((p: any) => ({
        ...p,
        moderation_status: modMap.get(p.id)?.status || 'approved', 
        moderation_notes: modMap.get(p.id)?.notes
      }));
      
      res.json(enrichedProducts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/moderation/stories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const admin = req.user as any;
    try {
      const { status, notes } = req.body;
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      const { data: existing } = await supabase.from('product_moderation').select('id').eq('product_id', req.params.id).maybeSingle();
      
      let error;
      let data;
      if (existing) {
        const resMod = await supabase.from('product_moderation').update({
          status, notes, moderated_by: admin.id, updated_at: new Date().toISOString()
        }).eq('id', existing.id).select().single();
        error = resMod.error;
        data = resMod.data;
      } else {
        const resMod = await supabase.from('product_moderation').insert({
          product_id: parseInt(req.params.id),
          status, notes, moderated_by: admin.id
        }).select().single();
        error = resMod.error;
        data = resMod.data;
      }
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === ADMIN CORE & SECURITY ROUTES ===
  app.get("/api/admin/overview-stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const [usersRes, productsRes, ordersRes, earningsRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('earnings').select('amount')
      ]);

      const writersRes = await supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['writer', 'verified_writer']);

      const totalUsers = usersRes.count || 0;
      const totalWriters = writersRes.count || 0;
      const totalProducts = productsRes.count || 0;
      const totalOrders = ordersRes.count || 0;
      const totalRevenue = (earningsRes.data || []).reduce((sum, e) => sum + e.amount, 0);

      res.json({
        totalUsers,
        totalWriters,
        totalProducts,
        totalOrders,
        totalRevenue
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to fetch overview stats" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let query = supabase.from('users').select('*').order('created_at', { ascending: false });
      
      if (req.query.role) query = query.eq('role', req.query.role);
      if (req.query.status) query = query.eq('status', req.query.status);
      if (req.query.isVerified !== undefined) query = query.eq('is_verified', req.query.isVerified === 'true');

      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { status, banReason, adminNotes } = req.body;

      const { error } = await supabase.from('users').update({
        status,
        ban_reason: banReason,
        admin_notes: adminNotes
      }).eq('id', req.params.id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: (req.user as any).id,
        action: 'update_user_status',
        target_id: req.params.id,
        details: JSON.stringify({ status, banReason }),
        ip_address: req.ip
      });

      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.post("/api/admin/users/:id/verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const callerRole = (req.user as any)?.role;
    if (callerRole !== 'admin' && callerRole !== 'superadmin') return res.status(403).json({ message: "Admin access required" });
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { isVerified, verificationNotes } = req.body;

      const { error } = await supabase.from('users').update({
        is_verified: isVerified,
        verified_at: isVerified ? new Date().toISOString() : null,
        verified_by: isVerified ? (req.user as any).id : null,
        verification_notes: verificationNotes
      }).eq('id', req.params.id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: (req.user as any).id,
        action: isVerified ? 'verify_writer' : 'unverify_writer',
        target_id: req.params.id,
        details: verificationNotes || '',
        ip_address: req.ip
      });

      res.sendStatus(200);
    } catch (e: any) {
      console.error("Verification error:", e);
      res.status(500).json({ message: "Failed to verify user", error: e.message });
    }
  });

  // Bulk verify writers
  app.post("/api/admin/users/bulk-verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const callerRole = (req.user as any)?.role;
    if (callerRole !== 'admin' && callerRole !== 'superadmin') return res.status(403).json({ message: "Admin access required" });
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { userIds, isVerified, verificationNotes } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: "userIds required" });

      const { error } = await supabase.from('users').update({
        is_verified: isVerified,
        verified_at: isVerified ? new Date().toISOString() : null,
        verified_by: isVerified ? (req.user as any).id : null,
        verification_notes: verificationNotes || null
      }).in('id', userIds);

      if (error) throw error;

      const auditRows = userIds.map((uid: string) => ({
        admin_id: (req.user as any).id,
        action: isVerified ? 'verify_writer' : 'unverify_writer',
        target_id: uid,
        details: `Bulk action. ${verificationNotes || ''}`,
        ip_address: req.ip
      }));
      await supabase.from('audit_logs').insert(auditRows);

      res.json({ updated: userIds.length });
    } catch (e) {
      res.status(500).json({ message: "Failed to bulk update verification" });
    }
  });

  // Get aggregated writer review data for Admin
  app.get("/api/admin/writers/:id/review-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const callerRole = (req.user as any)?.role;
    if (callerRole !== 'admin' && callerRole !== 'superadmin') return res.status(403).json({ message: "Admin access required" });
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const writerId = req.params.id;

      const [
        userRes,
        productsRes,
        chaptersRes,
        followersRes,
        reviewsRes,
        earningsRes,
        reportsRes,
        auditRes
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', writerId).single(),
        supabase.from('products').select('id, title, created_at, rating, review_count, sales_count, is_published').eq('writer_id', writerId),
        supabase.from('chapters').select('id, product_id').in('product_id',
          (await supabase.from('products').select('id').eq('writer_id', writerId)).data?.map((p: any) => p.id) || []
        ),
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', writerId),
        supabase.from('reviews').select('id, rating, comment, created_at').in('product_id',
          (await supabase.from('products').select('id').eq('writer_id', writerId)).data?.map((p: any) => p.id) || []
        ),
        supabase.from('earnings').select('amount').eq('writer_id', writerId),
        supabase.from('content_reports').select('id, reason, status, created_at').eq('target_type', 'user').eq('target_id', writerId),
        supabase.from('audit_logs').select('action, created_at, details').eq('target_id', writerId).order('created_at', { ascending: false }).limit(20)
      ]);

      if (userRes.error) throw userRes.error;

      const products = productsRes.data || [];
      const totalEarnings = (earningsRes.data || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const avgRating = products.length > 0
        ? products.reduce((sum: number, p: any) => sum + (p.rating || 0), 0) / products.length
        : 0;

      res.json({
        user: userRes.data,
        stats: {
          storyCount: products.length,
          publishedCount: products.filter((p: any) => p.is_published).length,
          chapterCount: chaptersRes.data?.length || 0,
          followersCount: followersRes.count || 0,
          totalSales: products.reduce((sum: number, p: any) => sum + (p.sales_count || 0), 0),
          totalEarnings,
          avgRating: Math.round(avgRating * 10) / 10,
          totalReviews: reviewsRes.data?.length || 0,
          reportsCount: reportsRes.data?.length || 0,
        },
        recentReviews: (reviewsRes.data || []).slice(0, 5),
        reports: reportsRes.data || [],
        auditHistory: auditRes.data || [],
        products: products.slice(0, 10),
      });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch writer review data", error: e.message });
    }
  });

  app.get("/api/admin/audit-logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: logs, error } = await supabase.from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (error) throw error;

      if (!logs || logs.length === 0) {
        return res.json([]);
      }

      // Fetch admin details
      const adminIds = [...new Set(logs.map(l => l.admin_id))];
      const { data: admins } = await supabase.from('users').select('id, display_name, email').in('id', adminIds);
      const adminMap = new Map(admins?.map(a => [a.id, a]) || []);

      const populatedLogs = logs.map(l => ({
        ...l,
        admin: adminMap.get(l.admin_id) || { display_name: 'Unknown', email: '' }
      }));

      res.json(populatedLogs);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });
  // === PHASE 2: MODERATION ROUTES ===
  app.get("/api/admin/reports", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await supabase.from('content_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/admin/reports/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { status, adminNotes } = req.body;
      const { error } = await supabase.from('content_reports').update({ status, admin_notes: adminNotes, resolved_at: status === 'resolved' ? new Date().toISOString() : null, resolved_by: status === 'resolved' ? (req.user as any).id : null }).eq('id', req.params.id);
      if (error) throw error;
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Failed to update report status" });
    }
  });

  app.get("/api/admin/moderation/stories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await supabase.from('products').select('*, product_moderation(*)');
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.post("/api/admin/moderation/stories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { status, notes } = req.body;
      const { error } = await supabase.from('product_moderation').upsert({ product_id: req.params.id, status, notes, moderated_by: (req.user as any).id, updated_at: new Date().toISOString() });
      if (error) throw error;
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Failed to moderate story" });
    }
  });

  // === PHASE 3: FINANCIALS & LOGISTICS ROUTES ===
  app.get("/api/admin/finances", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await supabase.from('platform_finances').select('*').order('period', { ascending: false });
      if (error) throw error;
      
      const [revRes, payoutsRes] = await Promise.all([
        supabase.from('earnings').select('amount'),
        supabase.from('payouts').select('amount').eq('status', 'paid')
      ]);
      const totalRev = (revRes.data || []).reduce((acc, curr) => acc + curr.amount, 0);
      const totalPayouts = (payoutsRes.data || []).reduce((acc, curr) => acc + curr.amount, 0);
      
      res.json({ periods: data, currentSnapshot: { totalRev, totalPayouts } });
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch finances" });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await supabase.from('order_items').select('*, order:orders(*), product:products(title)');
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch all orders" });
    }
  });

  app.post("/api/admin/orders/:id/return", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { returnStatus, returnReason } = req.body;
      const { error } = await supabase.from('order_items').update({
        return_status: returnStatus,
        return_reason: returnReason,
        fulfillment_status: returnStatus === 'approved' ? 'returned' : undefined
      }).eq('id', req.params.id);
      if (error) throw error;
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Failed to update return status" });
    }
  });

  app.post("/api/admin/subscriptions/:userId/override", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { newTier, adminNotes } = req.body;
      
      const { error } = await supabase.from('users').update({
        subscription_tier: newTier,
        admin_notes: adminNotes
      }).eq('id', req.params.userId);
      
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        admin_id: (req.user as any).id,
        action: 'override_subscription',
        target_id: req.params.userId,
        details: JSON.stringify({ newTier, adminNotes }),
        ip_address: req.ip
      });
      
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Failed to override subscription" });
    }
  });

  // === PHASE 4: MARKETING, COMMUNITY & SETTINGS ROUTES ===
  app.get("/api/admin/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await supabase.from('platform_settings').select('*');
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { key, value } = req.body;
      
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      
      if (error) throw error;
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.post("/api/admin/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { title, message, type, targetRole } = req.body;
      
      const { error } = await supabase.from('global_notifications').insert({
        title, message, type, target_role: targetRole
      });
      if (error) throw error;
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.get("/api/admin/chat/moderation", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await supabase
        .from('global_chat_messages')
        .select('*')
        .eq('is_flagged', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch flagged chat messages" });
    }
  });

  app.delete("/api/admin/chat/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { error } = await supabase.from('global_chat_messages').delete().eq('id', req.params.id);
      if (error) throw error;
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ message: "Failed to delete chat message" });
    }
  });

  app.get("/api/admin/orders/pending", async (req, res) => {
    // Basic role check
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // For dev, trust the role in headers/mock, or check DB if strict
    // const role = (req.user as any).role;
    // if (role !== 'admin') return res.status(403).json({message: "Admin access only"});

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('orders')
        .select(`
                *,
                user:users(id, display_name, email)
            `)
        .eq('status', 'pending')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error("Admin fetch error:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // 2. Verify Order
  app.post("/api/admin/orders/:id/verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const orderId = Number(req.params.id);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Fetch Order & Items
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (!order) return res.status(404).json({ message: "Order not found" });

      const { data: items } = await supabase
        .from('order_items')
        .select('*, product:products(writer_id, type)')
        .eq('order_id', orderId);

      if (!items) return res.status(400).json({ message: "No items found" });

      // 2. Update Order Status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          is_verified: true
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 3. Create Earnings
      const earningsByCreator = new Map<string, number>();

      // 3a. Product Sales
      for (const item of items) {
        const product = (item as any).product;
        if (!product) continue;

        const quantity = item.quantity || 1;
        const totalPrice = item.price * quantity;
        
        // Unified 20% platform fee rule
        const { fee, earning } = calculateCommission(totalPrice);

        const current = earningsByCreator.get(product.writer_id) || 0;
        earningsByCreator.set(product.writer_id, current + earning);

        // Increment Sales Count
        await supabase.rpc('increment_sales_count', { product_id: item.product_id });
      }

      // 3b. Shipping (Re-calculate distribution)
      // Only if shipping cost exists
      if (order.shipping_cost > 0 && order.shipping_address) {
        const city = (order.shipping_address as any).city?.toLowerCase().trim();
        const creatorIds = Array.from(earningsByCreator.keys()); // Creators involved

        // Ideally we loop creators and find their rate for this city
        // For MVP simplification: We give the shipping cost to the physical product owner(s)
        // Or we fetch rates again.
        // Let's try to fetch rates for involved creators.
        for (const creatorId of creatorIds) {
          const { data: rates } = await supabase.from('shipping_rates').select('*').eq('creator_id', creatorId);
          if (rates && rates.length > 0) {
            const cityRate = rates.find(r => r.region_name.toLowerCase() === city) ||
              rates.find(r => r.region_name.toLowerCase() === 'all');
            if (cityRate) {
              // Add to earnings
              const current = earningsByCreator.get(creatorId) || 0;
              earningsByCreator.set(creatorId, current + cityRate.amount);
            }
          }
        }
      }

      // 4. Insert Earnings Records
      for (const [creatorId, amount] of Array.from(earningsByCreator.entries())) {
        await supabase.from('earnings').insert({
          creator_id: creatorId,
          order_id: orderId,
          amount: amount,
          status: 'pending' // Earnings are pending until payout
        });
      }

      res.json({ success: true });

    } catch (err) {
      console.error("Verification error:", err);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // 3. Reject Order
  app.post("/api/admin/orders/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const orderId = Number(req.params.id);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error } = await supabase
        .from('orders')
        .update({ status: 'rejected' })
        .eq('id', orderId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Reject failed" });
    }
  });

  // 4. Get Sellers
  app.get("/api/admin/sellers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['writer', 'artist'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Fetch failed" });
    }
  });

  // 5. Freeze/Unfreeze User
  app.post("/api/admin/users/:id/freeze", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.params.id;
    const { isActive } = req.body;

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  await seedDatabase();

  // === CREATIVE HUB (PORTFOLIO & COMMISSIONS) ===

  // Portfolios
  app.get("/api/portfolios", async (req, res) => {
    const { artistId, category, page = 1, limit = 12 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase.from('portfolios').select('*', { count: 'exact' }).is('deleted_at', null);

    if (artistId) query = query.eq('artist_id', artistId);
    if (category && category !== 'All') query = query.eq('category', category);

    const { data, error, count } = await query
      .order('order_index', { ascending: true })
      .range(from, to);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ data, total: count, page: Number(page) });
  });

  app.post("/api/portfolios", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;

    const { title, description, category, imageUrl, additionalImages, thumbnailUrl, tags, orderIndex, yearCreated } = req.body;

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.from('portfolios').insert({
      artist_id: userId,
      title,
      description,
      category,
      image_url: imageUrl,
      additional_images: additionalImages,
      thumbnail_url: thumbnailUrl,
      tags,
      order_index: orderIndex || 0,
      year_created: yearCreated
    }).select().single();

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  });

  app.delete("/api/portfolios/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { id } = req.params;

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify ownership before delete or just use RLS (if configured)
    // Here we do a soft delete or hard delete. Let's do a hard delete for simplicity or soft delete if 'deleted_at' column exists.
    // Based on schema, 'deletedAt' exists.
    const { error } = await supabase
      .from('portfolios')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('artist_id', userId);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ success: true });
  });

  // Design Requests
  app.get("/api/design-requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const userId = (req.user as any).id;
      const { artistId, clientId, status, page = 1, limit = 10 } = req.query;
      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let query = supabase.from('design_requests').select('*, client:users!client_id(display_name, avatar_url), artist:users!artist_id(display_name, avatar_url)', { count: 'exact' });

      // Security: Only participants or admin can see
      const isAdmin = (req.user as any).role === 'admin';
      if (!isAdmin) {
        query = query.or(`client_id.eq.${userId},artist_id.eq.${userId}`);
      }

      if (artistId) query = query.eq('artist_id', artistId);
      if (clientId) query = query.eq('client_id', clientId);
      if (status) query = query.eq('status', status);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error("[API] Supabase error in GET /api/design-requests:", error);
        return res.status(500).json({ message: error.message });
      }
      res.json({ data, total: count, page: Number(page) });
    } catch (err: any) {
      console.error("[API] Exception in GET /api/design-requests:", err);
      res.status(500).json({ message: err.message || "An unexpected error occurred" });
    }
  });

  app.get("/api/design-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const isAdmin = (req.user as any).role === 'admin';

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: request, error: reqError } = await supabase
      .from('design_requests')
      .select('*, client:users!client_id(*), artist:users!artist_id(*)')
      .eq('id', req.params.id)
      .single();

    if (reqError || !request) return res.status(404).json({ message: "Request not found" });

    // Auth check
    if (!isAdmin && request.client_id !== userId && request.artist_id !== userId) {
      return res.sendStatus(403);
    }

    const { data: messages, error: msgError } = await supabase
      .from('design_messages')
      .select('*, sender:users!sender_id(display_name, avatar_url)')
      .eq('request_id', req.params.id)
      .order('created_at', { ascending: true });

    res.json({ ...request, messages: messages || [] });
  });

  app.post("/api/design-requests", async (req, res) => {
    try {
      const { artistId, clientId: bodyClientId, title, description, budget, deadline, licenseType, referenceImages, status } = req.body;

      const clientId = (req.user as any)?.id || bodyClientId;

      console.log("[DesignRequests] Request Payload:", {
        sessionUserId: (req.user as any)?.id,
        bodyClientId,
        artistId,
        isAuth: req.isAuthenticated()
      });

      if (!clientId) {
        return res.status(401).json({ message: "Not authenticated. User ID missing." });
      }

      if (!artistId) {
        return res.status(400).json({ message: "Artist ID is required" });
      }

      const { data, error } = await supabase.from('design_requests').insert({
        client_id: String(clientId),
        artist_id: String(artistId),
        title: title || "New Design Inquiry",
        description: description || "Initial chat phase",
        budget: Number(budget || 0),
        deadline: deadline || null,
        license_type: licenseType || 'personal',
        reference_images: referenceImages || [],
        status: status || 'inquiry'
      }).select().single();

      if (error) {
        console.error("[DesignRequests] Supabase Error:", error);
        return res.status(500).json({ message: error.message, detail: error.details, code: error.code });
      }

      // Notify Artist
      const client = await storage.getUser(clientId);
      await notify(
        artistId,
        "New Design Inquiry",
        `${client?.displayName || 'A client'} sent you a new design inquiry: "${title}"`,
        'store',
        'high',
        `/creative-hub/requests/${data.id}`,
        { requestId: data.id },
        clientId
      );

      res.json(data);
    } catch (err: any) {
      console.error("[DesignRequests] Crash:", err);
      res.status(500).json({ message: "Internal server error during request creation", error: err.message });
    }
  });

  app.patch("/api/design-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { status, escrowLocked, finalFileUrl } = req.body;

    const { data: request, error: fetchError } = await supabase
      .from('design_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !request) return res.status(404).json({ message: "Request not found" });

    const isArtist = request.artist_id === userId;
    const isClient = request.client_id === userId;
    const isAdmin = (req.user as any).role === 'admin';

    if (!isArtist && !isClient && !isAdmin) return res.sendStatus(403);

    // --- Manual Payment Logic ---
    if (status === 'payment_under_review' && !isClient) {
      return res.status(403).json({ message: "Only clients can submit payment proof." });
    }

    if (status === 'payment_confirmed' && !isAdmin) {
      return res.status(403).json({ message: "Only admins can verify payments." });
    }

    if (status === 'payment_confirmed' && isAdmin) {
      req.body.payment_verified_by = userId;
      req.body.payment_verified_at = new Date();
      req.body.escrow_locked = true; // Mark as secured
    }

    // Artist can only start project if payment is confirmed
    if (status === 'in_progress' && isArtist && request.status !== 'payment_confirmed') {
      return res.status(400).json({ message: "Wait for payment verification before starting." });
    }

    // Deliver Work
    if (status === 'delivered' && isArtist) {
      if (!finalFileUrl) return res.status(400).json({ message: "Delivery requires final file URL" });
    }

    // Handle Revision
    if (status === 'in_progress' && isClient && request.status === 'delivered') {
      // Reverting from delivered to in_progress means revision requested
      // We can also track revision counts if needed
    }

    // Payment Release on Completion
    if (status === 'completed' && isClient) {
      await supabase.from('earnings').insert({
        creator_id: request.artist_id,
        design_request_id: request.id,
        amount: Math.floor(request.budget * 0.8), // 20% platform fee
        status: 'paid'
      });
      // Optionally update artist creator_wallet in real-time
      const { data: artist } = await supabase.from('users').select('creator_wallet').eq('id', request.artist_id).single();
      await supabase.from('users').update({
        creator_wallet: (artist?.creator_wallet || 0) + Math.floor(request.budget * 0.8)
      }).eq('id', request.artist_id);
    }

    // Use the variables destructured at the start of the function
    const { title, description, budget, deadline, licenseType, paymentProofUrl, paymentReference, paymentVerifiedBy, paymentVerifiedAt } = req.body;
    const updateData: any = { updated_at: new Date() };

    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.escrow_locked !== undefined) updateData.escrow_locked = req.body.escrow_locked;
    if (req.body.final_file_url !== undefined) updateData.final_file_url = req.body.final_file_url;

    // Manual Payment Fields
    if (paymentProofUrl) updateData.payment_proof_url = paymentProofUrl;
    if (paymentReference) updateData.payment_reference = paymentReference;
    if (paymentVerifiedBy && isAdmin) updateData.payment_verified_by = paymentVerifiedBy;
    if (paymentVerifiedAt && isAdmin) updateData.payment_verified_at = paymentVerifiedAt;

    // Allow updating core details during negotiation
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (budget !== undefined) updateData.budget = budget;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (licenseType) updateData.license_type = licenseType;

    // Also handle camelCase
    if (status !== undefined && updateData.status === undefined) updateData.status = status;
    if (escrowLocked !== undefined && updateData.escrow_locked === undefined) updateData.escrow_locked = escrowLocked;
    if (finalFileUrl !== undefined && updateData.final_file_url === undefined) updateData.final_file_url = finalFileUrl;
    if (req.body.paymentProofUrl && !updateData.payment_proof_url) updateData.payment_proof_url = req.body.paymentProofUrl;
    if (req.body.paymentReference && !updateData.payment_reference) updateData.payment_reference = req.body.paymentReference;

    const { data, error } = await supabase
      .from('design_requests')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });

    // Notify Other Party of update
    const notificationRecipient = isArtist ? request.client_id : request.artist_id;
    const actorName = (req.user as any).display_name || (req.user as any).username;

    let notificationTitle = "Project Updated";
    let notificationContent = `${actorName} updated the project "${request.title}"`;

    if (status && status !== request.status) {
      notificationTitle = "Project Status Changed";
      notificationContent = `${actorName} changed the status of "${request.title}" to ${status}`;
    }

    await notify(
      notificationRecipient,
      notificationTitle,
      notificationContent,
      'store',
      'high',
      `/creative-hub/requests/${request.id}`,
      { requestId: request.id, status },
      userId
    );

    res.json(data);
  });

  // Artist Analytics
  app.get("/api/artist/analytics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    if ((req.user as any).role !== 'artist' && (req.user as any).role !== 'admin') return res.sendStatus(403);

    const { data: requests, error } = await supabase
      .from('design_requests')
      .select('*')
      .eq('artist_id', userId);

    if (error) return res.status(500).json({ message: error.message });

    const completed = requests.filter(r => r.status === 'completed');
    const totalRev = completed.reduce((sum, r) => sum + r.budget, 0);
    const completionRate = requests.length > 0 ? (completed.length / requests.length) * 100 : 0;

    res.json({
      totalCommissions: requests.length,
      revenue: totalRev,
      completionRate: Math.round(completionRate),
      activeProject: requests.filter(r => ['accepted', 'in_progress', 'delivered'].includes(r.status)).length
    });
  });

  // Messages
  app.post("/api/design-messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const senderId = (req.user as any).id;

    const { requestId, message, attachmentUrl } = req.body;

    const { data, error } = await supabase.from('design_messages').insert({
      request_id: requestId,
      sender_id: senderId,
      message,
      attachment_url: attachmentUrl
    }).select().single();

    if (error) return res.status(500).json({ message: error.message });

    // Notify Recipient
    // Let's just fetch from supabase here since storage might not have it yet
    const { data: reqData } = await supabase.from('design_requests').select('artist_id, client_id, title').eq('id', requestId).single();
    if (reqData) {
      const recipientId = senderId === reqData.artist_id ? reqData.client_id : reqData.artist_id;
      const senderName = (req.user as any).display_name || (req.user as any).username;
      await notify(
        recipientId,
        "New Message",
        `You have a new message from ${senderName} regarding "${reqData.title}"`,
        'store',
        'medium',
        `/creative-hub/requests/${requestId}`,
        { requestId },
        senderId
      );
    }

    res.json(data);
  });

  // === NOTIFICATIONS ===

  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.warn("[API] GET /api/notifications - Unauthorized");
        return res.sendStatus(401);
      }
      const userId = (req.user as any).id;
      console.log(`[API] Fetching notifications for user: ${userId}`);
      const notifications = await storage.getNotifications(userId);
      console.log(`[API] Found ${notifications.length} notifications`);
      res.json(notifications);
    } catch (error: any) {
      console.error("[API] Error in GET /api/notifications:", error);
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
        userId: (req.user as any)?.id
      });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      await storage.markNotificationRead(Number(req.params.id));
      res.sendStatus(200);
    } catch (error: any) {
      console.error("[API] Error in PATCH /api/notifications/:id/read:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const userId = (req.user as any).id;
      await storage.markAllNotificationsRead(userId);
      res.sendStatus(200);
    } catch (error: any) {
      console.error("[API] Error in POST /api/notifications/read-all:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/notification-settings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.warn("[API] GET /api/notification-settings - Unauthorized");
        return res.sendStatus(401);
      }
      const userId = (req.user as any).id;
      console.log(`[API] Fetching notification settings for user: ${userId}`);
      const settings = await storage.getNotificationSettings(userId);
      res.json(settings);
    } catch (error: any) {
      console.error("[API] Error in GET /api/notification-settings:", error);
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
        userId: (req.user as any)?.id
      });
    }
  });

  app.patch("/api/notification-settings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const userId = (req.user as any).id;
      const settings = await storage.updateNotificationSettings(userId, req.body);
      res.json(settings);
    } catch (error: any) {
      console.error("[API] Error in PATCH /api/notification-settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/dispatch", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const { userId, title, content, type, priority, link, metadata } = req.body;

      // Basic security: In a real app, validate that the requester can notify this user
      // For now, we allow it to support the frontend-triggered notifications (like Likes/Follows)
      await notify(userId, title, content, type, priority || 'low', link, metadata, (req.user as any).id);
      res.sendStatus(201);
    } catch (error: any) {
      console.error("[API] Error in POST /api/notifications/dispatch:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Send global notification
  app.post("/api/admin/notifications/broadcast", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if ((req.user as any).role !== 'admin') return res.status(403).json({ message: "Admin only" });

      const { title, content, type, priority, link } = req.body;
      const { data: users, error } = await supabase.from('users').select('id');

      if (error) throw error;

      // In a real high-traffic app, this would be a background job
      const notifications = users.map(u => notify(u.id, title, content, type || 'system', priority || 'low', link));
      await Promise.all(notifications);

      res.status(200).json({ message: `Broadcasted to ${users.length} users` });
    } catch (error: any) {
      console.error("[API] Error in POST /api/admin/notifications/broadcast:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // === MEDIA HUB ===

  app.get("/api/media", async (req, res) => {
    try {
      const { category, isFeatured, relatedStoryId, creatorId } = req.query;
      let videos = await storage.getMediaVideos({
        category: category as string,
        isFeatured: isFeatured === 'true' ? true : undefined,
        relatedStoryId: relatedStoryId ? Number(relatedStoryId) : undefined,
        creatorId: creatorId as string
      });

      res.json(videos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/media", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if ((req.user as any).role !== 'admin') return res.status(403).json({ message: "Admin only" });

      const parsed = insertMediaVideoSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error });

      const videoId = extractYoutubeVideoId(parsed.data.youtubeUrl);
      if (!videoId) return res.status(400).json({ message: "Invalid YouTube URL" });

      const video = await storage.createMediaVideo({
        ...parsed.data,
        youtubeVideoId: videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        createdBy: (req.user as any).id
      });

      res.status(201).json(video);
    } catch (error: any) {
      console.error("[MediaAdmin] Error creating video:", error);
      res.status(500).json({ 
        message: "Internal server error during video creation", 
        error: error.message,
        details: error.details || error.hint || null
      });
    }
  });

  app.put("/api/admin/media/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if ((req.user as any).role !== 'admin') return res.status(403).json({ message: "Admin only" });

      const { id } = req.params;
      const updates = req.body;

      if (updates.youtubeUrl) {
        const videoId = extractYoutubeVideoId(updates.youtubeUrl);
        if (videoId) {
          updates.youtubeVideoId = videoId;
          updates.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }

      const video = await storage.updateMediaVideo(id, updates);
      res.json(video);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/media/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if ((req.user as any).role !== 'admin') return res.status(403).json({ message: "Admin only" });

      await storage.deleteMediaVideo(req.params.id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // MEMBERSHIPS V2 SYSTEM
  // ==========================================

  // --- CLUBS ---
  app.get("/api/memberships/clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { data: clubs, error } = await supabase
      .from("membership_clubs")
      .select("*")
      .eq("store_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(clubs);
  });

  app.post("/api/memberships/clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { name, description } = req.body;
    const { data, error } = await supabase
      .from("membership_clubs")
      .insert({ store_id: userId, name, description })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // --- PLANS ---
  app.get("/api/memberships/plans", async (req, res) => {
    // Public route to view active plans for a store
    const { storeId } = req.query;
    if (!storeId) return res.status(400).json({ error: "storeId required" });
    
    // Check if creator is requesting their own plans
    const isOwner = req.isAuthenticated() && (req.user as any).id === storeId;

    let query = supabase
      .from("membership_plans")
      .select(`
        *,
        club:membership_clubs!inner(store_id),
        pricing:plan_pricing(*),
        benefits:plan_benefits(
          *,
          scopes:benefit_scopes(*),
          limits:benefit_limits(*)
        )
      `)
      .eq("club.store_id", storeId);

    if (!isOwner) {
      query = query.eq("status", "active").eq("visibility", "public");
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/memberships/plans", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    
    const { clubId, name, shortDescription, fullDescription, thumbnailUrl, bannerUrl, badgeUrl, colorTheme, status, visibility, pricing, benefits } = req.body;

    try {
      // 1. Create Plan
      const { data: plan, error: planError } = await supabase
        .from("membership_plans")
        .insert({
          club_id: clubId,
          name,
          short_description: shortDescription,
          full_description: fullDescription,
          thumbnail_url: thumbnailUrl,
          banner_url: bannerUrl,
          badge_url: badgeUrl,
          color_theme: colorTheme,
          status,
          visibility
        })
        .select()
        .single();
      if (planError) throw planError;

      // 2. Create Pricing
      if (pricing && pricing.length > 0) {
        const pricingInserts = pricing.map((p: any) => ({
          plan_id: plan.id,
          billing_cycle: p.billingCycle,
          price_in_cents: p.priceInCents
        }));
        const { error: pricingError } = await supabase.from("plan_pricing").insert(pricingInserts);
        if (pricingError) throw pricingError;
      }

      // 3. Create Benefits & Scopes
      if (benefits && benefits.length > 0) {
        for (const b of benefits) {
          const { data: benefit, error: benError } = await supabase
            .from("plan_benefits")
            .insert({ plan_id: plan.id, type: b.type, name: b.name, value: b.value })
            .select()
            .single();
          if (benError) throw benError;

          if (b.scopes) {
            const scopeInserts = b.scopes.map((s: any) => ({
              benefit_id: benefit.id,
              scope_type: s.scopeType,
              scope_target_id: s.scopeTargetId
            }));
            await supabase.from("benefit_scopes").insert(scopeInserts);
          }

          if (b.limits) {
            const limitInserts = b.limits.map((l: any) => ({
              benefit_id: benefit.id,
              limit_type: l.limitType,
              limit_value: l.limitValue
            }));
            await supabase.from("benefit_limits").insert(limitInserts);
          }
        }
      }

      res.json(plan);
    } catch (error: any) {
      console.error("[Memberships] Plan creation failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/memberships/plans/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const planId = req.params.id;
    const { status, visibility, name } = req.body;
    const { data, error } = await supabase
      .from("membership_plans")
      .update({ status, visibility, name, updated_at: new Date().toISOString() })
      .eq("id", planId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // --- SUBSCRIPTIONS ---
  app.post("/api/memberships/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { planId, pricingId, paymentMethod, paymentReference, paymentProofUrl } = req.body;

    try {
      // Fetch plan and pricing to calculate end date
      const { data: pricing } = await supabase.from("plan_pricing").select("*").eq("id", pricingId).single();
      const { data: plan } = await supabase.from("membership_plans").select("club_id, name").eq("id", planId).single();
      
      // Exact day calculation to prevent JavaScript setMonth bugs and guarantee exact access duration
      let daysToAdd = 30; // 1 month fallback
      if (pricing?.billing_cycle === 'monthly') daysToAdd = 30;
      else if (pricing?.billing_cycle === 'quarterly') daysToAdd = 90;
      else if (pricing?.billing_cycle === 'semi_annual') daysToAdd = 180;
      else if (pricing?.billing_cycle === 'annual') daysToAdd = 365;

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysToAdd);

      const isManualPayment = [
          "instapay",
          "vodafone_cash",
          "orange_cash",
          "etisalat_cash",
          "bank_transfer"
      ].includes(paymentMethod);
      const subStatus = isManualPayment ? 'pending' : 'active';

      // Create Subscription
      const { data: sub, error: subError } = await supabase
        .from("creator_subscriptions")
        .insert({
          user_id: userId,
          plan_id: planId,
          pricing_id: pricingId,
          status: subStatus,
          current_period_end: endDate.toISOString(),
          payment_method: paymentMethod || 'local',
          payment_reference: paymentReference
        })
        .select()
        .single();
      if (subError) throw subError;

      // Create the financial transaction (Order)
      const amountInEgp = pricing?.price_in_cents / 100;
      const { fee, earning } = calculateCommission(amountInEgp);

      const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
              user_id: userId,
              total_amount: amountInEgp,
              platform_fee: fee,
              creator_earnings: earning,
              status: subStatus === 'active' ? 'paid' : 'pending',
              payment_method: paymentMethod || 'local',
              payment_proof_url: paymentProofUrl,
              payment_reference: paymentReference,
              is_verified: !isManualPayment
          })
          .select()
          .single();
      if (orderError) throw orderError;

      // Create Order Item to link to creator for earnings calculations
      const clubId = plan?.club_id;
      const planName = plan?.name ?? 'Membership';
      const { data: club } = clubId
          ? await supabase.from("membership_clubs").select("store_id").eq("id", clubId).single()
          : { data: null };

      await supabase
          .from('order_items')
          .insert({
              order_id: order.id,
              price: amountInEgp,
              quantity: 1,
              creator_id: club?.store_id,
              fulfillment_status: 'delivered', // Memberships are delivered instantly
              customization_data: { subscription_id: sub.id, plan_name: planName, is_membership: true }
          });

      // Provision Entitlements
      const { error: rpcError } = await supabase.rpc('provision_entitlements', { p_subscription_id: sub.id });
      if (rpcError) console.error("Failed to provision entitlements", rpcError);

      res.json(sub);
    } catch (error: any) {
      console.error("[Memberships] Subscription failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // =====================================================
  // UNIFIED ACCESS CONTROL (v2)
  // =====================================================

  /**
   * GET /api/access/product/:id
   * Primary product access endpoint — checks purchases, subscriptions,
   * and benefit types. Server-side only; cannot be bypassed from frontend.
   */
  app.get("/api/access/product/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ hasAccess: false, reason: "none", subscriptionExpiry: null, planName: null, creatorUsername: null });
    }
    const userId = (req.user as any).id;
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product id" });

    try {
      const result = await canUserAccessProduct(userId, productId);
      res.json(result);
    } catch (err: any) {
      console.error("[AccessEngine] Error:", err);
      res.status(500).json({ hasAccess: false, reason: "none", error: err.message });
    }
  });

  /**
   * POST /api/library/add
   * Adds a product to the user's explicit saved library.
   */
  app.post("/api/library/add", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    const userId = (req.user as any).id;
    const { productId } = req.body;

    if (!productId) return res.status(400).json({ error: "Missing productId" });

    try {
      // Check if it already exists
      const { data: existing } = await supabase
        .from('saved_library')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return res.json({ success: true, message: "Already in library" });
      }

      await supabase.from('saved_library').insert({
        user_id: userId,
        product_id: productId
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("[Library] Error adding to library:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/library/status/:productId
   * Checks if a specific product is in the user's saved library.
   */
  app.get("/api/library/status/:productId", async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ inLibrary: false });
    const userId = (req.user as any).id;
    const productId = req.params.productId;

    try {
      const { data } = await supabase
        .from('saved_library')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .limit(1)
        .maybeSingle();
        
      res.json({ inLibrary: !!data });
    } catch (err) {
      res.json({ inLibrary: false });
    }
  });

  /**
   * GET /api/access/library
   * Returns all products explicitly saved to the user's library.
   */
  app.get("/api/access/library", async (req, res) => {
    if (!req.isAuthenticated()) return res.json([]);
    const userId = (req.user as any).id;
    const limit = parseInt((req.query.limit as string) || "50");
    const offset = parseInt((req.query.offset as string) || "0");

    try {
      // Query the user's saved library and join the products table
      const { data, error } = await supabase
        .from('saved_library')
        .select(`
          product_id,
          saved_at,
          products (
            id, writer_id, title, description, cover_url, type, genre, price, is_published, requires_shipping
          )
        `)
        .eq('user_id', userId)
        .order('saved_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      // Flatten the response and check access for each
      const library = await Promise.all((data || []).map(async (item) => {
        const access = await import("./controllers/access.controller").then(m => m.canUserAccessProduct(userId, item.product_id));
        return {
          ...item.products,
          savedAt: item.saved_at,
          hasAccess: access.hasAccess,
          accessReason: access.reason
        };
      }));

      res.json(library);
    } catch (err: any) {
      console.error("[Library] Error fetching library:", err);
      res.status(500).json([]);
    }
  });

  /**
   * GET /api/memberships/check-access (LEGACY — kept for backwards compat)
   * Now delegates to the full access engine using the first published product
   * found for the given storeId. For store-level checks without a product ID,
   * it queries active subscriptions directly.
   */
  app.get("/api/memberships/check-access", async (req, res) => {
    if (!req.isAuthenticated()) return res.json({ hasAccess: false });
    const userId = (req.user as any).id;
    const { storeId } = req.query;
    if (!storeId) return res.status(400).json({ error: "storeId required" });

    try {
      // Check if user has any active subscription to this store
      const library = await getSubscriptionLibrary(userId, 1, 0);
      const storeEntry = library.find(l => l.storeId === storeId);
      if (storeEntry) {
        return res.json({ hasAccess: true, planName: storeEntry.planName, expiresAt: storeEntry.expiresAt });
      }
      return res.json({ hasAccess: false });
    } catch (err: any) {
      return res.json({ hasAccess: false });
    }
  });

  // --- SUBSCRIBER MANAGEMENT (Creator Dashboard) ---
  app.get("/api/memberships/subscribers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;

    try {
      // Get all clubs for this creator
      const { data: clubs } = await supabase
        .from("membership_clubs")
        .select("id")
        .eq("store_id", userId);

      if (!clubs || clubs.length === 0) return res.json([]);
      const clubIds = clubs.map((c: any) => c.id);

      // Get all plans in those clubs
      const { data: plans } = await supabase
        .from("membership_plans")
        .select("id, name, color_theme")
        .in("club_id", clubIds);

      if (!plans || plans.length === 0) return res.json([]);
      const planIds = plans.map((p: any) => p.id);
      const planMap = new Map(plans.map((p: any) => [p.id, p]));

      // Get all subscriptions to those plans
      const { data: subs, error } = await supabase
        .from("creator_subscriptions")
        .select("*")
        .in("plan_id", planIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out expired subscriptions but keep pending ones
      const now = new Date();
      const validSubs = (subs || []).filter((s: any) => {
        if (s.status === 'pending') return true;
        return new Date(s.current_period_end) >= now;
      });

      // Fetch users manually
      const userIds = [...new Set(validSubs.map((s: any) => s.user_id))];
      let usersMap = new Map();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, display_name, username, email")
          .in("id", userIds);
        if (users) {
          usersMap = new Map(users.map((u: any) => [u.id, u]));
        }
      }

      // Enrich with plan and user info
      const enriched = validSubs.map((s: any) => ({
        ...s,
        plan: planMap.get(s.plan_id) || null,
        user: usersMap.get(s.user_id) || null,
      }));

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Approve a pending subscription (manual payment verified by creator)
  app.post("/api/memberships/approve-subscription/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const subId = parseInt(req.params.id);

    try {
      // Security: ensure the creator owns the plan this subscription belongs to
      const { data: sub } = await supabase
        .from("creator_subscriptions")
        .select("id, plan_id, status")
        .eq("id", subId)
        .single();

      if (!sub) return res.status(404).json({ error: "Subscription not found" });

      const { data: plan } = await supabase
        .from("membership_plans")
        .select("club_id")
        .eq("id", sub.plan_id)
        .single();

      const { data: club } = await supabase
        .from("membership_clubs")
        .select("store_id")
        .eq("id", plan?.club_id)
        .single();

      if (club?.store_id !== userId) return res.status(403).json({ error: "Forbidden" });

      // Activate the subscription
      const { data: updated, error } = await supabase
        .from("creator_subscriptions")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", subId)
        .select()
        .single();

      if (error) throw error;

      // Mark the linked order as verified
      await supabase
        .from("orders")
        .update({ status: "paid", is_verified: true })
        .contains("order_items.customization_data", { subscription_id: subId });

      // Provision entitlements now that subscription is active
      const { error: rpcError } = await supabase.rpc("provision_entitlements", { p_subscription_id: subId });
      if (rpcError) console.error("[Memberships] Failed to provision entitlements on approval:", rpcError);

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}


async function seedDatabase() {
  const writers = await storage.listWriters();
  if (writers.length === 0) {
    const password = await hashPassword("password");

    // Create seed writers
    const jkRowling = await storage.createUser({
      username: "jkrowling",
      password,
      email: "jk@example.com",
      displayName: "J.K. Rowling",
      role: "writer",
      bio: "Creator of the Wizarding World. Bringing magic to life through words.",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
      bannerUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200",
      storeSettings: { themeColor: "#7c3aed", welcomeMessage: "Welcome to my magical corner." }
    });

    const georgeRR = await storage.createUser({
      username: "georgerrmartin",
      password,
      email: "george@example.com",
      displayName: "George R.R. Martin",
      role: "writer",
      bio: "Weaver of complex tales and epic histories.",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200",
      bannerUrl: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&q=80&w=1200",
      storeSettings: { themeColor: "#991b1b", welcomeMessage: "Winter is coming." }
    });

    // Create products
    await storage.createProduct({
      writerId: jkRowling.id,
      title: "Harry Potter and the Sorcerer's Stone",
      description: "The boy who lived.",
      price: 1999,
      coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400",
      type: "ebook",
      genre: "Fantasy",
      isPublished: true,
    });

    await storage.createProduct({
      writerId: jkRowling.id,
      title: "The Tales of Beedle the Bard",
      description: "Classic wizarding fairytales.",
      price: 1299,
      coverUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=400",
      type: "ebook",
      genre: "Fantasy",
      isPublished: true,
    });

    await storage.createProduct({
      writerId: georgeRR.id,
      title: "A Game of Thrones",
      description: "In the game of thrones, you win or you die.",
      price: 2499,
      coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400",
      type: "ebook",
      genre: "Fantasy",
      isPublished: true,
    });

    // Create seed Artist
    const artistUser = await storage.createUser({
      username: "art_alchemist",
      password,
      email: "art@example.com",
      displayName: "Elena The Art Alchemist",
      role: "artist",
      bio: "Crafting visual souls for your stories. Book covers, character designs, and world maps.",
      avatarUrl: "https://images.unsplash.com/photo-1515405295579-ba7f9f92f4e3?auto=format&fit=crop&q=80&w=200",
      bannerUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200",
      storeSettings: { themeColor: "#0ea5e9", welcomeMessage: "Visualizing your imagination." }
    });

    // Create Artist Products (Assets) with Variants
    const coverProduct = await storage.createProduct({
      writerId: artistUser.id,
      title: "Phoenix Rising - Premium Book Cover",
      description: "High-resolution fantasy book cover art. Includes PSD source file and commercial license.",
      price: 4999,
      coverUrl: "https://images.unsplash.com/photo-1626615720335-c54d249f05a9?auto=format&fit=crop&q=80&w=400",
      type: "asset",
      genre: "Cover Art",
      isPublished: true,
      licenseType: "commercial"
    });

    await storage.createVariant({
      productId: coverProduct.id,
      name: "Standard License",
      price: 4999,
      licenseType: "standard",
      type: "digital"
    });

    await storage.createVariant({
      productId: coverProduct.id,
      name: "Extended Commercial License",
      price: 14999,
      licenseType: "extended",
      type: "digital"
    });

    const charPack = await storage.createProduct({
      writerId: artistUser.id,
      title: "RPG Character Pack Vol. 1",
      description: "A collection of 10 unique fantasy character illustrations transparent PNGs.",
      price: 1999,
      coverUrl: "https://images.unsplash.com/photo-1638803040283-7a9bf4f292c9?auto=format&fit=crop&q=80&w=400",
      type: "asset",
      genre: "Illustrations",
      isPublished: true,
      licenseType: "commercial"
    });

    await storage.createProduct({
      writerId: artistUser.id,
      title: "Ancient Map Texture Bundle",
      description: "20+ Parchment and map textures for world builders.",
      price: 999,
      coverUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=400",
      type: "asset",
      genre: "Textures",
      isPublished: true,
      licenseType: "standard"
    });
  }
}
