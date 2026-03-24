"use client";

import { PLAN_DISPLAY } from "@/utils/plans";

type LimitType = "resources" | "locations" | "bookings" | "feature";

const LIMIT_MESSAGES: Record<LimitType, (limit: number | null, plan: string) => string> = {
  resources: (limit, plan) =>
    `Has alcanzado el límite de ${limit} recurso${limit === 1 ? "" : "s"} del plan ${PLAN_DISPLAY[plan]?.label ?? plan}.`,
  locations: (limit, plan) =>
    `Has alcanzado el límite de ${limit} ubicación${limit === 1 ? "" : "es"} del plan ${PLAN_DISPLAY[plan]?.label ?? plan}.`,
  bookings: (limit, plan) =>
    `Has alcanzado el límite de ${limit} reservas mensuales del plan ${PLAN_DISPLAY[plan]?.label ?? plan}.`,
  feature: (_limit, plan) =>
    `Esta función no está disponible en el plan ${PLAN_DISPLAY[plan]?.label ?? plan}.`,
};

interface UpgradePromptProps {
  currentPlan: string;
  limitType: LimitType;
  limitValue?: number | null;
}

export function UpgradePrompt({ currentPlan, limitType, limitValue }: UpgradePromptProps) {
  const message = LIMIT_MESSAGES[limitType](limitValue ?? null, currentPlan);

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      <p className="text-sm text-purple-800">{message}</p>
      <a
        href="/dashboard/upgrade"
        className="mt-2 inline-block text-sm font-medium text-purple-700 underline underline-offset-2 hover:text-purple-900"
      >
        Actualizar plan →
      </a>
    </div>
  );
}
