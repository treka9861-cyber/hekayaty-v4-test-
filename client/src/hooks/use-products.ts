import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ProductRow = Database['public']['Tables']['products']['Row'];
type InsertProduct = Database['public']['Tables']['products']['Insert'];

function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    writerId: p.writer_id,
    title: p.title,
    description: p.description,
    coverUrl: p.cover_url,
    fileUrl: p.file_url,
    type: p.type,
    genre: p.genre,
    isPublished: p.is_published ?? false,
    rating: p.rating ?? 0,
    reviewCount: p.review_count ?? 0,
    price: p.price,
    licenseType: p.license_type ?? 'personal',
    content: p.content || (p as any).content_data?.content, // Fallback to content_data if joined
    // Physical Fields
    stockQuantity: p.stock_quantity,
    weight: p.weight,
    requiresShipping: p.requires_shipping ?? false,
    salesCount: (p as any).sales_count ?? 0,
    appearanceSettings: p.appearance_settings,
    createdAt: p.created_at,
    updatedAt: (p as any).updated_at,
    isSerialized: (p as any).is_serialized ?? false,
    seriesStatus: (p as any).series_status ?? 'ongoing',
    lastChapterUpdatedAt: (p as any).last_chapter_updated_at,
    merchandiseCategory: (p as any).merchandise_category,
    customFields: (p as any).custom_fields,
    productImages: (p as any).product_images || [],
  } as any;
}

export function useProducts(filters?: { writerId?: string; genre?: string; search?: string; type?: string; isSerialized?: boolean; isPublished?: boolean }) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, writer_id, title, description, cover_url, type, genre, is_published, rating, review_count, price, stock_quantity, weight, requires_shipping, created_at, is_serialized, series_status, last_chapter_updated_at, merchandise_category, users!writer_id(display_name)')
        .order('created_at', { ascending: false });

      if (filters?.writerId) query = query.eq('writer_id', filters.writerId);
      if (filters?.genre) query = query.eq('genre', filters.genre);
      if (filters?.type === 'ebook') {
        query = query.in('type', ['ebook', 'physical', 'promotional', 'bundle']);
      } else if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters?.search) {
        const s = `%${filters.search}%`;
        // Search in title, genre, description, and joined publisher name
        query = query.or(`title.ilike.${s},genre.ilike.${s},description.ilike.${s},users(display_name).ilike.${s}`);
      }
      
      if (filters?.isSerialized !== undefined) query = query.eq('is_serialized', filters.isSerialized);
      if (filters?.isPublished !== undefined) query = query.eq('is_published', filters.isPublished);

      const { data, error } = await query;
      if (error) throw error;

      return data.map((p: any) => mapProduct(p as ProductRow));
    },
  });
}

export function useBestSellerProducts(limit = 4) {
  return useQuery({
    queryKey: ["products", "best-sellers", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, writer_id, title, description, cover_url, type, genre, is_published, rating, review_count, price, stock_quantity, weight, requires_shipping, created_at, is_serialized, series_status, last_chapter_updated_at, merchandise_category')
        .order('review_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.map((p: any) => mapProduct(p as ProductRow));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useSerializedProducts(limit = 4) {
  return useQuery({
    queryKey: ["products", "serialized", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, writer_id, title, description, cover_url, type, genre, is_published, rating, review_count, price, stock_quantity, weight, requires_shipping, created_at, is_serialized, series_status, last_chapter_updated_at, merchandise_category')
        .eq('is_serialized', true)
        .eq('is_published', true)
        .order('last_chapter_updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.map((p: any) => mapProduct(p as ProductRow));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      // Try to fetch from products (legacy) and product_contents (new)
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          content_data:product_contents(content)
        `)
        .eq('id', id)
        .single();

      if (error) return null;
      return mapProduct(data);
    },
    enabled: !!id,
  });
}

export function useProductContent(id: number) {
  return useQuery({
    queryKey: ["product-content", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_contents')
        .select('content')
        .eq('product_id', id)
        .single();

      if (error) {
        console.warn("Content not found in product_contents, might still be in products table");
        return null;
      }
      return data.content;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      // Map camelCase to snake_case
      const dbData = {
        writer_id: data.writerId,
        title: data.title,
        description: data.description,
        cover_url: data.coverUrl || 'https://placehold.co/400x600',
        file_url: data.fileUrl,
        type: data.type,
        genre: data.genre || 'fantasy',
        is_published: data.isPublished,
        price: data.price,
        license_type: data.licenseType,
        content: data.content,
        // Physical fields
        stock_quantity: data.stockQuantity,
        weight: data.weight,
        requires_shipping: ['ebook', 'audiobook', 'comic'].includes(data.type) ? false : data.requiresShipping,
        appearance_settings: data.appearanceSettings,
        is_serialized: data.isSerialized,
        series_status: data.seriesStatus,
        merchandise_category: data.merchandiseCategory,
        custom_fields: data.customFields,
        product_images: data.productImages,
      };

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(dbData)
        .select()
        .single();

      if (error) throw error;

      // Handle content insertion into separate table
      if (data.content) {
        await supabase.from('product_contents').insert({
          product_id: newProduct.id,
          content: data.content
        });
      }

      return mapProduct(newProduct);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      toast({ title: "Product created successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to create product", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & any) => {
      const dbData: any = {};
      if (data.title) dbData.title = data.title;
      if (data.description) dbData.description = data.description;
      if (data.coverUrl) dbData.cover_url = data.coverUrl;
      if (data.fileUrl) dbData.file_url = data.fileUrl;
      if (data.type) dbData.type = data.type;
      if (data.genre) dbData.genre = data.genre;
      if (data.isPublished !== undefined) dbData.is_published = data.isPublished;
      if (data.price !== undefined) dbData.price = data.price;
      if (data.licenseType) dbData.license_type = data.licenseType;
      // Physical fields
      if (data.stockQuantity !== undefined) dbData.stock_quantity = data.stockQuantity;
      if (data.weight !== undefined) dbData.weight = data.weight;
      // For digital products, force requires_shipping to false. 
      // If type isn't provided in the update payload, fetch it to be safe.
      let productType = data.type;
      if (!productType) {
        const { data: existing } = await supabase.from('products').select('type').eq('id', id).single();
        productType = existing?.type;
      }

      if (data.requiresShipping !== undefined) {
        dbData.requires_shipping = ['ebook', 'audiobook', 'comic'].includes(productType) ? false : data.requiresShipping;
      } else if (productType && ['ebook', 'audiobook', 'comic'].includes(productType)) {
        dbData.requires_shipping = false;
      }
      if (data.appearanceSettings) dbData.appearance_settings = data.appearanceSettings;
      if (data.isSerialized !== undefined) dbData.is_serialized = data.isSerialized;
      if (data.seriesStatus) dbData.series_status = data.seriesStatus;
      if (data.merchandiseCategory) dbData.merchandise_category = data.merchandiseCategory;
      if (data.customFields) dbData.custom_fields = data.customFields;
      if (data.productImages) dbData.product_images = data.productImages;

      const { data: updated, error } = await supabase
        .from('products')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Handle content update
      if (data.content) {
        const { error: contentError } = await supabase
          .from('product_contents')
          .upsert({
            product_id: id,
            content: data.content,
            updated_at: new Date().toISOString()
          });
        if (contentError) console.error("Failed to update product content table", contentError);
      }

      return mapProduct(updated);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["product-content", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      toast({ title: "Product updated" });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      toast({ title: "Product deleted" });
    },
    onError: (err: Error) => {
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  });
}

export function useDownloadFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fileUrl: string) => {
      if (!fileUrl) throw new Error("No file available for download");

      // fileUrl is e.g. "product-files/123/asset.zip"
      // Cleanup URL if it contains the full path or just the name
      const cleanUrl = fileUrl.replace(/.*\/storage\/v1\/object\/public\//, '');
      const parts = cleanUrl.split('/');
      const bucket = parts[0];
      const path = parts.slice(1).join('/');

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60); // 60 seconds

      if (error) throw error;
      return data.signedUrl;
    },
    onSuccess: (url) => {
      window.open(url, '_blank');
    },
    onError: (err: any) => {
      toast({ title: "Download Failed", description: err.message, variant: "destructive" });
    }
  });
}
