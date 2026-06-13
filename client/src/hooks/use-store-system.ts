import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// === UNIVERSES ===
export function useUniverses(creatorId?: string) {
  return useQuery({
    queryKey: ["/api/universes", creatorId],
    queryFn: async () => {
      const url = creatorId ? `/api/universes?creatorId=${creatorId}` : `/api/universes`;
      const res = await fetch(url);
      return res.json();
    },
    enabled: !!creatorId,
  });
}

export function useCreateUniverse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description: string; coverUrl?: string; isPublic?: boolean }) =>
      apiRequest("POST", "/api/universes", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/universes"] }),
  });
}

// === COMMUNITY ===
export function useCommunityPosts(creatorId?: string) {
  return useQuery({
    queryKey: ["/api/community", creatorId],
    queryFn: async () => {
      const url = creatorId ? `/api/community?creatorId=${creatorId}` : `/api/community`;
      const res = await fetch(url);
      return res.json();
    },
    enabled: !!creatorId,
  });
}

export function useCreateCommunityPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; content: string; type?: string; isExclusive?: boolean; mediaUrl?: string }) =>
      apiRequest("POST", "/api/community", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/community"] }),
  });
}

// === MEMBERSHIPS ===
export function useMembershipTiers(writerId?: string) {
  return useQuery({
    queryKey: ["/api/memberships", writerId],
    queryFn: async () => {
      const url = writerId ? `/api/memberships?writerId=${writerId}` : `/api/memberships`;
      const res = await fetch(url);
      return res.json();
    },
    enabled: !!writerId,
  });
}

// === ANALYTICS ===
export function useTrackStoreView() {
  return useMutation({
    mutationFn: (data: { storeId: string; eventType: string; targetId?: string }) =>
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
