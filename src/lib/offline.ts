import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

const QUEUE_KEY = "engtech.offline.queue.v1";

export type PendingOp = {
  id: string;
  table: string;
  type: "insert" | "update" | "delete";
  payload?: Record<string, unknown> | Record<string, unknown>[];
  filters: { col: string; val: unknown }[];
  createdAt: string;
};

const listeners = new Set<() => void>();
let cache: PendingOp[] | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

export function readQueue(): PendingOp[] {
  if (!isBrowser()) return [];
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]") as PendingOp[];
  } catch {
    cache = [];
  }
  return cache;
}

function writeQueue(ops: PendingOp[]) {
  cache = ops;
  if (isBrowser()) window.localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Quantidade de operações aguardando sincronização. */
export function usePendingCount() {
  return useSyncExternalStore(
    subscribe,
    () => readQueue().length,
    () => 0,
  );
}

export function usePendingOps() {
  const count = usePendingCount();
  // count muda sempre que a fila muda
  return { ops: count > 0 ? readQueue() : [], count };
}

/** Status de conexão (false enquanto renderiza no servidor). */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function newId() {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function enqueue(op: Omit<PendingOp, "id" | "createdAt">) {
  const ops = [...readQueue(), { ...op, id: newId(), createdAt: new Date().toISOString() }];
  writeQueue(ops);
}

export function clearQueue() {
  writeQueue([]);
}

/** Reenvia todas as operações pendentes. Retorna totais de sucesso/erro. */
export async function syncPending(): Promise<{
  enviados: number;
  erros: number;
  mensagens: string[];
}> {
  const ops = readQueue();
  const restantes: PendingOp[] = [];
  const mensagens: string[] = [];
  let enviados = 0;

  for (const op of ops) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const table = supabase.from(op.table as never) as any;
      let q;
      if (op.type === "insert") q = table.insert(op.payload);
      else if (op.type === "update") q = table.update(op.payload);
      else q = table.delete();
      for (const f of op.filters) q = q.eq(f.col, f.val);
      const { error } = await q;
      if (error) throw error;
      enviados += 1;
    } catch (e) {
      restantes.push(op);
      mensagens.push(`${op.table}: ${e instanceof Error ? e.message : "falha ao sincronizar"}`);
    }
  }

  writeQueue(restantes);
  return { enviados, erros: restantes.length, mensagens };
}

/* ------------------------------------------------------------------ */
/* Interceptação das escritas quando o dispositivo está sem internet   */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function queuedBuilder(table: string, type: PendingOp["type"], payload?: any) {
  const filters: { col: string; val: unknown }[] = [];
  let wantsSingle = false;

  const rows: Record<string, unknown>[] = Array.isArray(payload)
    ? payload
    : payload
      ? [payload]
      : [];
  const withIds = rows.map((r) => ({ id: (r["id"] as string) ?? newId(), ...r }));
  if (type === "insert" && withIds.length > 0) {
    payload = Array.isArray(payload) ? withIds : withIds[0];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    eq(col: string, val: unknown) {
      filters.push({ col, val });
      return builder;
    },
    match(obj: Record<string, unknown>) {
      Object.entries(obj).forEach(([col, val]) => filters.push({ col, val }));
      return builder;
    },
    select() {
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    single() {
      wantsSingle = true;
      return builder;
    },
    maybeSingle() {
      wantsSingle = true;
      return builder;
    },
    then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
      enqueue({ table, type, payload, filters });
      const data = type === "delete" ? null : wantsSingle ? (withIds[0] ?? null) : withIds;
      return Promise.resolve({ data, error: null, status: 200 }).then(resolve, reject);
    },
  };
  return builder;
}

let installed = false;

/** Ativa a fila offline: escritas feitas sem internet ficam guardadas no aparelho. */
export function installOfflineQueue() {
  if (installed || !isBrowser()) return;
  installed = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const originalFrom = client.from.bind(client);
  client.from = (table: string) => {
    const real = originalFrom(table);
    if (navigator.onLine) return real;
    return new Proxy(real, {
      get(target, prop, receiver) {
        if (prop === "insert" || prop === "upsert")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (values: any) => queuedBuilder(table, "insert", values);
        if (prop === "update")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (values: any) => queuedBuilder(table, "update", values);
        if (prop === "delete") return () => queuedBuilder(table, "delete");
        return Reflect.get(target, prop, receiver);
      },
    });
  };
}
