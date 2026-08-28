import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

import { installOfflineQueue } from "@/lib/offline";

/**
 * Guarda o cache de consultas no aparelho para que o app abra e mostre os
 * dados mesmo sem internet, e ativa a fila de cadastros offline.
 */
export function useOfflineRuntime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    installOfflineQueue();
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: "engtech.query.cache.v1",
      throttleTime: 1500,
    });
    const [unsubscribe] = persistQueryClient({
      // versões distintas de query-core nos tipos; runtime é o mesmo client
      queryClient: queryClient as never,
      persister,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    return () => unsubscribe();
  }, [queryClient]);
}
