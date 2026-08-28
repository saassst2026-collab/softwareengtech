import { supabase } from "@/integrations/supabase/client";

export interface Equipamento {
  id: string;
  nome: string;
  modelo?: string | null;
  numero_serie?: string | null;
  fabricante?: string | null;
  created_at?: string;
  created_by?: string | null;
}

const LOCAL_STORAGE_KEY = "engtech_equipamentos_cadastrados_v1";

function getLocalEquipamentos(): Equipamento[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalEquipamentos(list: Equipamento[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("engtech:equipamentos-updated"));
  } catch (e) {
    console.error("Falha ao salvar equipamentos localmente:", e);
  }
}

/**
 * Busca a lista de equipamentos cadastrados.
 * Tenta no Supabase primeiro; caso a tabela não exista ou haja erro de rede,
 * utiliza o armazenamento persistente local sem inventar dados fictícios.
 */
export async function listarEquipamentos(): Promise<Equipamento[]> {
  try {
    const { data, error } = await supabase
      .from("equipamentos" as never)
      .select("*")
      .order("nome");

    if (!error && Array.isArray(data)) {
      return data as unknown as Equipamento[];
    }
  } catch {
    // Falha silenciosa para recorrer ao storage local
  }

  return getLocalEquipamentos();
}

/**
 * Cadastra um novo equipamento.
 */
export async function salvarEquipamento(
  equip: Omit<Equipamento, "id" | "created_at"> & { id?: string },
  userId?: string | null,
): Promise<Equipamento> {
  const isEditing = !!equip.id;
  const payload = {
    nome: equip.nome.trim(),
    modelo: equip.modelo?.trim() || null,
    numero_serie: equip.numero_serie?.trim() || null,
    fabricante: equip.fabricante?.trim() || null,
  };

  if (!payload.nome) {
    throw new Error("O nome do equipamento é obrigatório.");
  }

  // Tenta Supabase
  try {
    if (isEditing) {
      const { data, error } = await supabase
        .from("equipamentos" as never)
        .update(payload as never)
        .eq("id", equip.id!)
        .select()
        .single();
      if (!error && data) {
        window.dispatchEvent(new CustomEvent("engtech:equipamentos-updated"));
        return data as unknown as Equipamento;
      }
    } else {
      const { data, error } = await supabase
        .from("equipamentos" as never)
        .insert({ ...payload, created_by: userId ?? null } as never)
        .select()
        .single();
      if (!error && data) {
        window.dispatchEvent(new CustomEvent("engtech:equipamentos-updated"));
        return data as unknown as Equipamento;
      }
    }
  } catch {
    // Recorre ao storage local
  }

  // Fallback LocalStorage
  const list = getLocalEquipamentos();
  if (isEditing) {
    const idx = list.findIndex((e) => e.id === equip.id);
    const updatedItem: Equipamento = {
      ...(idx >= 0 ? list[idx] : { id: equip.id!, created_at: new Date().toISOString() }),
      ...payload,
    };
    if (idx >= 0) {
      list[idx] = updatedItem;
    } else {
      list.push(updatedItem);
    }
    saveLocalEquipamentos(list);
    return updatedItem;
  } else {
    const newItem: Equipamento = {
      id: "eq_" + Math.random().toString(36).substring(2, 10),
      ...payload,
      created_at: new Date().toISOString(),
      created_by: userId ?? null,
    };
    list.unshift(newItem);
    saveLocalEquipamentos(list);
    return newItem;
  }
}

/**
 * Exclui um equipamento pelo ID.
 */
export async function excluirEquipamento(id: string): Promise<void> {
  try {
    await supabase.from("equipamentos" as never).delete().eq("id", id);
  } catch {
    // Ignora erro do Supabase
  }

  const list = getLocalEquipamentos().filter((e) => e.id !== id);
  saveLocalEquipamentos(list);
}
