import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { persistence } from "./persistence";
import { supabase } from "./supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (userId) headers["x-user-id"] = userId;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = queryKey.map(k => typeof k === 'object' ? JSON.stringify(k) : k).join("/");
      
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      const token = sessionData.session?.access_token;
      
      const headers: Record<string, string> = {};
      if (userId) headers["x-user-id"] = userId;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        headers,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      
      // Persist successful GET requests, but skip sensitive endpoints
      const isSensitive = url.includes('/api/user') || url.includes('/api/cart') || url.includes('/api/orders') || url.includes('/api/auth');
      if (url.startsWith('/api/') && !isSensitive) {
        persistence.set(`query:${url}`, data).catch(console.error);
      }
      
      return data;
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes stale time
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: (failureCount) => failureCount < 3,
      retryDelay: (attempt) => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30 * 1000),
    },
    mutations: {
      retry: false,
    },
  },
});

