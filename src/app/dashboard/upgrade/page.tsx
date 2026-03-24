import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Check } from "lucide-react";
import { PLAN_DISPLAY, PLAN_FEATURES, PLAN_ORDER, PLAN_PRICING } from "@/utils/plans";
import { UpgradeRequestForm } from "@/components/dashboard/UpgradeRequestForm";

const PLAN_LIMITS_DISPLAY: Record<string, { locations: string; resources: string; bookings: string }> = {
  free:     { locations: "1 ubicación",          resources: "3 recursos / ubicación",  bookings: "30 reservas / mes" },
  pro:      { locations: "3 ubicaciones",         resources: "15 recursos / ubicación", bookings: "200 reservas / mes" },
  business: { locations: "Ubicaciones ilimitadas", resources: "Recursos ilimitados",    bookings: "Reservas ilimitadas" },
};

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, plan_id, plans(id, name, max_locations, max_resources_per_location, max_bookings_per_month, features)")
    .eq("owner_id", user.id)
    .single();

  if (!business) redirect("/dashboard");

  const { data: pendingRequest } = await supabase
    .from("upgrade_requests")
    .select("target_plan, created_at")
    .eq("business_id", business.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentPlanId = (business.plan_id as string) ?? "free";
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlanId as typeof PLAN_ORDER[number]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Elige tu plan</h1>
        <p className="text-muted-foreground mt-1">
          Plan actual: <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_DISPLAY[currentPlanId]?.color}`}>
            {PLAN_DISPLAY[currentPlanId]?.label}
          </span>
        </p>
      </div>

      {pendingRequest && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <span className="text-amber-500 text-lg leading-none">⏳</span>
          <div>
            <p className="font-medium text-amber-800 text-sm">Solicitud de upgrade pendiente</p>
            <p className="text-amber-700 text-sm mt-0.5">
              Tu solicitud para cambiar al plan <strong>{PLAN_DISPLAY[pendingRequest.target_plan]?.label}</strong> está siendo procesada. Te notificaremos cuando esté activo.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLAN_ORDER.map((planId) => {
          const pricing = PLAN_PRICING[planId];
          const features = PLAN_FEATURES[planId];
          const limits = PLAN_LIMITS_DISPLAY[planId];
          const isCurrent = planId === currentPlanId;
          const planIndex = PLAN_ORDER.indexOf(planId);
          const isUpgrade = planIndex > currentPlanIndex;

          return (
            <div
              key={planId}
              className={`rounded-xl border p-6 flex flex-col gap-5 ${
                isCurrent
                  ? "border-purple-400 shadow-md bg-white ring-2 ring-purple-200"
                  : "border-gray-200 bg-white"
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_DISPLAY[planId]?.color}`}>
                    {PLAN_DISPLAY[planId]?.label}
                  </span>
                  {isCurrent && (
                    <span className="text-xs text-purple-600 font-medium">Plan actual</span>
                  )}
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold">
                    {pricing.monthly === null ? "Gratis" : `$${pricing.monthly.toLocaleString("es-CL")}`}
                  </span>
                  {pricing.monthly !== null && (
                    <span className="text-sm text-muted-foreground"> / mes</span>
                  )}
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-1 text-sm text-muted-foreground border-t pt-4">
                <p className="font-medium text-foreground">{limits.locations}</p>
                <p>{limits.resources}</p>
                <p>{limits.bookings}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-md border border-gray-200 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
                  >
                    Plan actual
                  </button>
                ) : isUpgrade ? (
                  <UpgradeRequestForm
                    businessId={business.id}
                    currentPlan={currentPlanId}
                    targetPlan={planId}
                    isPending={pendingRequest?.target_plan === planId}
                  />
                ) : (
                  <button
                    disabled
                    className="w-full rounded-md border border-gray-200 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
                    title="Contacta soporte para hacer downgrade"
                  >
                    Cambiar a {PLAN_DISPLAY[planId]?.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿Preguntas? Escríbenos a{" "}
        <a href="mailto:contacto@bukarrum.com" className="text-purple-600 underline underline-offset-2">
          contacto@bukarrum.com
        </a>
      </p>
    </div>
  );
}
