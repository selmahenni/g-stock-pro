'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * @component Providers
 * @description Fournit le QueryClient TanStack Query à toute l'application.
 * Un seul client est créé par session (state), avec des défauts adaptés à une
 * UI de gestion (pas de refetch agressif au focus, données fraîches 30 s).
 */
export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        retry: 1,
      },
    },
  }));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
