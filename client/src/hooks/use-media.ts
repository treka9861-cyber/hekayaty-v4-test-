import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MediaVideo, InsertMediaVideo } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMediaVideos(filters?: { category?: string; isFeatured?: boolean; relatedStoryId?: number; creatorId?: string }) {
  const queryParams = new URLSearchParams();
  if (filters?.category) queryParams.append('category', filters.category);
  if (filters?.isFeatured !== undefined) queryParams.append('isFeatured', String(filters.isFeatured));
  if (filters?.relatedStoryId) queryParams.append('relatedStoryId', String(filters.relatedStoryId));
  if (filters?.creatorId) queryParams.append('creatorId', filters.creatorId);

  return useQuery<MediaVideo[]>({
    queryKey: ["media-videos", filters],
    queryFn: async () => {
      const res = await fetch(`/api/media?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch videos");
      return res.json();
    },
  });
}

export function useAdminMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (video: InsertMediaVideo) => {
      const res = await apiRequest("POST", "/api/admin/media", video);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-videos"] });
      toast({ title: "Success", description: "Video added to Media Hub" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertMediaVideo> }) => {
      const res = await apiRequest("PUT", `/api/admin/media/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-videos"] });
      toast({ title: "Success", description: "Video updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-videos"] });
      toast({ title: "Deleted", description: "Video removed from Hub" });
    },
  });

  return {
    createVideo: createMutation.mutateAsync,
    updateVideo: updateMutation.mutateAsync,
    deleteVideo: deleteMutation.mutateAsync,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
