import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/lib/supabase";

type UserRow = Database['public']['Tables']['users']['Row'];

function mapUser(user: UserRow) {
  const raw = user as any;
  return {
    ...user,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    bannerUrl: user.banner_url,
    storeSettings: user.store_settings,
    stripeAccountId: user.stripe_account_id,
    subscriptionTier: user.subscription_tier || 'free',
    commissionRate: user.commission_rate || 20,
    isActive: user.is_active ?? true,
    shippingPolicy: user.shipping_policy || "",
    // Verification fields (added in Phase 1 migration; cast via `any` until types regenerate)
    isVerified: raw.is_verified ?? false,
    verifiedAt: raw.verified_at ?? null,
    verifiedBy: raw.verified_by ?? null,
  };
}

export function useUser(username: string) {
  return useQuery({
    queryKey: ["user", username],
    queryFn: async () => {
      if (!username) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) return null;
      return mapUser(data);
    },
    enabled: !!username,
  });
}

export function useUserById(id: string) {
  return useQuery({
    queryKey: ["user-by-id", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return null;
      return mapUser(data);
    },
    enabled: !!id,
  });
}

export function useWriters() {
  return useQuery({
    queryKey: ["writers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, products(id)')
        .neq('role', 'reader') // Exclude readers
        .neq('role', 'admin'); // Exclude admins - Get writers and artists only

      if (error) throw error;
      
      return data.map(user => ({
        ...mapUser(user),
        productCount: (user as any).products?.length || 0
      }));
    },
  });
}

export function useTopWriters(limit = 4) {
  return useQuery({
    queryKey: ["writers", "top", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, products(id)')
        .neq('role', 'reader')
        .neq('role', 'admin');

      if (error) throw error;
      
      const writers = data.map(row => ({
        ...mapUser(row),
        productCount: (row as any).products?.length || 0
      }));

      return writers
        .filter(w => w.productCount > 0)
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, limit);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: any) => {
      console.log("📝 useUpdateUser called with:", updates);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Map camelCase updates back to snake_case for DB
      const dbUpdates: any = {};
      if (updates.displayName) dbUpdates.display_name = updates.displayName;
      if (updates.username) dbUpdates.username = updates.username;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.bannerUrl) dbUpdates.banner_url = updates.bannerUrl;
      if (updates.storeSettings) dbUpdates.store_settings = updates.storeSettings;
      if (updates.shippingPolicy !== undefined) dbUpdates.shipping_policy = updates.shippingPolicy;

      console.log("💾 Sending to Supabase:", dbUpdates);

      const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error("❌ Update error:", error);
        throw error;
      }
      console.log("✅ Update successful!", data);
      return mapUser(data);
    },
    onSuccess: (data: any) => {
      console.log("🔄 Invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["user", data.username] });
      queryClient.invalidateQueries({ queryKey: ["user-by-id", data.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success!",
        description: "Your changes have been saved."
      });
    },
    onError: (error: any) => {
      console.error("❌ Mutation error:", error);
      toast({
        title: "Error saving changes",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}
export function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      // Get all published products count
      const { count: booksCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      // Get all writers count
      const { count: writersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'reader')
        .neq('role', 'admin');

      // Get all readers count
      const { count: readersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'reader');

      return {
        books: booksCount || 0,
        writers: writersCount || 0,
        readers: readersCount || 0
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
