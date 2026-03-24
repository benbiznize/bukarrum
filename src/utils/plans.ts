export type PlanFeatures = {
  analytics: false | "basic" | "advanced";
  addons: boolean;
  hide_branding: boolean;
};

export type PlanLimits = {
  id: string;
  name: string;
  max_locations: number | null;
  max_resources_per_location: number | null;
  max_bookings_per_month: number | null;
  features: PlanFeatures;
};

export function isAtLimit(current: number, max: number | null): boolean {
  return max !== null && current >= max;
}

export const PLAN_DISPLAY: Record<string, { label: string; color: string }> = {
  free:     { label: "Gratuito", color: "bg-gray-100 text-gray-600" },
  pro:      { label: "Pro",      color: "bg-purple-100 text-purple-700" },
  business: { label: "Negocio",  color: "bg-amber-100 text-amber-700" },
};

export const PLAN_PRICING: Record<string, { monthly: number | null; label: string }> = {
  free:     { monthly: null,  label: "Gratis" },
  pro:      { monthly: 14990, label: "CLP 14.990 / mes" },
  business: { monthly: 39990, label: "CLP 39.990 / mes" },
};

export const PLAN_ORDER = ["free", "pro", "business"] as const;

export const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "1 ubicación",
    "3 recursos por ubicación",
    "30 reservas / mes",
    "Página pública de reservas",
    "Notificaciones por email",
    "Branding de Bukarrum visible",
  ],
  pro: [
    "3 ubicaciones",
    "15 recursos por ubicación",
    "200 reservas / mes",
    "Página pública de reservas",
    "Notificaciones por email",
    "Sin branding de Bukarrum",
    "Función de add-ons",
    "Analíticas básicas",
  ],
  business: [
    "Ubicaciones ilimitadas",
    "Recursos ilimitados",
    "Reservas ilimitadas",
    "Página pública de reservas",
    "Notificaciones por email",
    "Sin branding de Bukarrum",
    "Función de add-ons",
    "Analíticas avanzadas",
    "Soporte prioritario",
  ],
};
