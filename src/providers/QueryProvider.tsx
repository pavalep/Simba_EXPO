import React, {useState} from 'react';
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from '@tanstack/react-query';

const DEFAULT_STALE_TIME_MS = 60_000;
const DEFAULT_GC_TIME_MS = 5 * 60_000;
const DEFAULT_RETRY = 2;

export interface QueryProviderProps {
  children: React.ReactNode;
  client?: QueryClient;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({
  children,
  client,
}) => {
  const [defaultClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME_MS,
            gcTime: DEFAULT_GC_TIME_MS,
            retry: DEFAULT_RETRY,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <TanstackQueryClientProvider client={client ?? defaultClient}>
      {children}
    </TanstackQueryClientProvider>
  );
};
