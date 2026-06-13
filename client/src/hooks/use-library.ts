import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useLibraryStatus(productId: number) {
  return useQuery({
    queryKey: ["library-status", productId],
    queryFn: async () => {
      if (!productId) return false;
      try {
        const res = await fetch(`/api/library/status/${productId}`);
        if (!res.ok) return false;
        const data = await res.json();
        return data.inLibrary === true;
      } catch (err) {
        return false;
      }
    },
    enabled: !!productId,
  });
}

export function useAddToLibrary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest("POST", "/api/library/add", { productId });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to add to library");
      return data;
    },
    onSuccess: (_, productId) => {
      // Invalidate the specific status query
      queryClient.invalidateQueries({ queryKey: ["library-status", productId] });
      // Invalidate the main library list query used in Dashboard
      queryClient.invalidateQueries({ queryKey: ["library-items"] });
      toast({
        title: "Added to Library",
        description: "You can now read this book anytime from your library.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not add to library.",
        variant: "destructive",
      });
    }
  });
}

export function useLibraryItems() {
  return useQuery({
    queryKey: ["library-items"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/access/library");
      if (!res.ok) throw new Error("Failed to fetch library items");
      return res.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}
