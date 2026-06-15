import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/queryClient';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
  };
}

async function edgePost(path: string, body: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/edge/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function edgeGet(path: string, params?: Record<string, string>) {
  const headers = await getAuthHeaders();
  const url = new URL(`/api/edge/${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetches the claim status a logged-in user has for a specific book.
 * Returns { status: 'none' | 'pending' | 'approved' | 'rejected' | 'linked' }
 */
export function useBookClaimStatus(bookId: number | null, userId?: string) {
  return useQuery({
    queryKey: ['book-claim-status', bookId, userId],
    queryFn: async () => {
      if (!bookId || !userId) return { status: 'none' as const };

      // Check if already linked as author
      const { data: link } = await supabase
        .from('book_authors')
        .select('id, role')
        .eq('book_id', bookId)
        .eq('author_user_id', userId)
        .maybeSingle();

      if (link) return { status: 'linked' as const, role: link.role };

      // Check for a claim request
      const { data: claim } = await supabase
        .from('book_claim_requests')
        .select('id, status')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!claim) return { status: 'none' as const };
      return { status: claim.status as 'pending' | 'approved' | 'rejected' };
    },
    enabled: !!bookId && !!userId,
    staleTime: 30_000,
  });
}

/**
 * Submit a new book claim request.
 */
export function useSubmitBookClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { book_id: number; message?: string }) =>
      edgePost('submit-book-claim', payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['book-claim-status', variables.book_id] });
      queryClient.invalidateQueries({ queryKey: ['user-book-claims'] });
    },
  });
}

/**
 * Publisher: fetch all incoming claims for their books.
 */
export function usePublisherBookClaims(status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending') {
  return useQuery({
    queryKey: ['publisher-book-claims', status],
    queryFn: () => edgeGet('get-book-claims', { status }),
    select: (data) => data.claims ?? [],
    staleTime: 15_000,
  });
}

/**
 * Author: fetch all claims the current user has submitted.
 */
export function useUserBookClaims() {
  return useQuery({
    queryKey: ['user-book-claims'],
    queryFn: () => edgeGet('get-user-book-claims'),
    select: (data) => data.claims ?? [],
    staleTime: 30_000,
  });
}

/**
 * Publisher: approve a book claim.
 */
export function useApproveBookClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (claimId: number) => edgePost('approve-book-claim', { claim_id: claimId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publisher-book-claims'] });
      queryClient.invalidateQueries({ queryKey: ['book-authors'] });
    },
  });
}

/**
 * Publisher: reject a book claim.
 */
export function useRejectBookClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { claim_id: number; rejection_reason?: string }) =>
      edgePost('reject-book-claim', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publisher-book-claims'] });
    },
  });
}

/**
 * Public: fetch all approved authors linked to a book.
 */
export function useBookAuthors(bookId: number | null) {
  return useQuery({
    queryKey: ['book-authors', bookId],
    queryFn: async () => {
      if (!bookId) return [];
      const { data, error } = await supabase
        .from('book_authors')
        .select('*, author:author_user_id(id, display_name, avatar_url, username)')
        .eq('book_id', bookId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!bookId,
    staleTime: 60_000,
  });
}

/**
 * Public: fetch all books an author has been approved for.
 */
export function useAuthoredBooks(authorUserId: string | null) {
  return useQuery({
    queryKey: ['authored-books', authorUserId],
    queryFn: async () => {
      if (!authorUserId) return [];
      const { data, error } = await supabase
        .from('book_authors')
        .select('*, book:book_id(*)')
        .eq('author_user_id', authorUserId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!authorUserId,
    staleTime: 60_000,
  });
}
