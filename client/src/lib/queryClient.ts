/**
 * TanStack Query Client Configuration
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
      throwOnError: false,
    },
  },
});

/**
 * Generic API request helper
 */
export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  data?: any
): Promise<Response> {
  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data && method !== "GET") {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed: ${response.statusText}`);
  }

  return response;
}

/**
 * Default query function that works with TanStack Query
 */
export const defaultQueryFn = async ({ queryKey }: { queryKey: any[] }): Promise<any> => {
  const [url] = queryKey;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  
  return response.json();
};

// Set the default query function
queryClient.setDefaultOptions({
  queries: {
    queryFn: defaultQueryFn,
  },
});