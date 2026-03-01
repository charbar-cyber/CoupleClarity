import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiUrl } from "./config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function handle401() {
  queryClient.setQueryData(["/api/user"], null);
  queryClient.clear();
  if (window.location.pathname !== "/auth") {
    window.location.href = "/auth";
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  options?: RequestInit
): Promise<Response> {
  const res = await fetch(apiUrl(url), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'CoupleClarity',
    },
    body: body ? JSON.stringify(body) : undefined,
    ...options,
    credentials: "include",
  });

  if (res.status === 401) {
    handle401();
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
type QueryFnOptions = {
  on401?: UnauthorizedBehavior;
};

// Overloaded function declarations for getQueryFn
export function getQueryFn<T>(options?: QueryFnOptions): QueryFunction<T>;
export function getQueryFn<T>(): QueryFunction<T>;

// Implementation
export function getQueryFn<T>(options?: QueryFnOptions): QueryFunction<T> {
  const unauthorizedBehavior = options?.on401 || "throw";
  
  return async ({ queryKey }) => {
    const res = await fetch(apiUrl(queryKey[0] as string), {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null as any;
      }
      handle401();
    }

    await throwIfResNotOk(res);
    return await res.json();
  };
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
