/**
 * 🚀 Writers Dashboard Preloader (Beyond Rocket Mode)
 * Implements extreme-performance prefetching for the dashboard layer.
 */

import { queryClient } from './queryClient';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/queryClient';
import { optimizeImage, prefetchImage } from './performance-core';
import { persistence } from './persistence';

// --- CONFIG ---
const DASHBOARD_ASSETS = [
  "https://res.cloudinary.com/hekayaty/image/upload/v1/assets/dashboard_bg" // Example placeholder
];

/**
 * Main preloader logic to be called at App initialization.
 */
export const preloadWritersDashboard = async () => {
  console.log("🔦 [Beyond Rocket] Initializing Dashboard Preloader...");

  try {
    // 1. Check for Session (restored from IndexedDB or Auth)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const userId = session.user.id;

    // 2. Prefetch Priority Dashboard Data
    const prefetchPromises = [
      // Products for the current writer
      queryClient.prefetchQuery({
        queryKey: ["/api/products", { writerId: userId }],
        queryFn: async () => {
          const { data } = await supabase.from('products').select('id, writer_id, title, cover_url, price, is_published, type, sales_count').eq('writer_id', userId);
          return data;
        },
        staleTime: 60 * 1000
      }),

      // Earnings Overview — now via Express backend
      queryClient.prefetchQuery({
        queryKey: ['earnings-overview', userId],
        queryFn: async () => {
          const res = await apiRequest('GET', '/api/edge/earnings-overview');
          const data = await res.json();
          persistence.set(`query:earnings-overview:${userId}`, data).catch(console.error);
          return data;
        },
        staleTime: 30 * 1000
      }),

      // Seller Orders — now via Express backend
      queryClient.prefetchQuery({
        queryKey: ['seller-orders'],
        queryFn: async () => {
          const res = await apiRequest('GET', '/api/edge/seller-orders');
          return await res.json();
        }
      })
    ];

    // 3. Pre-optimize and Preload Dashboard Specific Images
    DASHBOARD_ASSETS.forEach(asset => prefetchImage(optimizeImage(asset, 1200)));

    // 4. Background asset decoding for top 3 products
    const products = queryClient.getQueryData<any[]>(["/api/products", { writerId: userId }]);
    if (products) {
      products.slice(0, 3).forEach(p => {
        if (p.coverUrl) prefetchImage(optimizeImage(p.coverUrl, 800));
      });
    }

    await Promise.allSettled(prefetchPromises);
    console.log("✅ [Beyond Rocket] Dashboard Data Preloaded.");
  } catch (err) {
    console.warn("⚠️ Dashboard preloading partially failed:", err);
  }
};
