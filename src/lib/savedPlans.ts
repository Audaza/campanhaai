import type { CampaignPlan } from "@/types/campaign";

const STORAGE_KEY = "campanhaai:savedPlans";

export interface SavedPlan {
  id:        string;
  createdAt: number;
  updatedAt: number;
  name:      string;
  plan:      CampaignPlan;
}

function read(): SavedPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as SavedPlan[]) : [];
  } catch {
    return [];
  }
}

function write(plans: SavedPlan[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    /* storage cheio — silencia; UI trata via listSavedPlans subsequente */
  }
}

function makeName(plan: CampaignPlan): string {
  const cliente = plan.overview.clientName?.trim() || "Cliente";
  const produto = plan.overview.product?.trim();
  return produto ? `${cliente} · ${produto}` : cliente;
}

export function listSavedPlans(): SavedPlan[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSavedPlan(id: string): SavedPlan | null {
  return read().find(p => p.id === id) ?? null;
}

export function savePlan(plan: CampaignPlan, existingId?: string): SavedPlan {
  const plans = read();
  const now   = Date.now();

  if (existingId) {
    const idx = plans.findIndex(p => p.id === existingId);
    if (idx >= 0) {
      const updated: SavedPlan = {
        ...plans[idx],
        updatedAt: now,
        name:      makeName(plan),
        plan,
      };
      plans[idx] = updated;
      write(plans);
      return updated;
    }
  }

  const saved: SavedPlan = {
    id:        `p_${now}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    name:      makeName(plan),
    plan,
  };
  plans.push(saved);
  write(plans);
  return saved;
}

export function deleteSavedPlan(id: string): void {
  write(read().filter(p => p.id !== id));
}
