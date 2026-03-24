"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PLAN_DISPLAY } from "@/utils/plans";

interface Props {
  businessId: string;
  currentPlan: string;
  targetPlan: string;
  isPending?: boolean;
}

export function UpgradeRequestForm({ businessId, currentPlan, targetPlan, isPending = false }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const targetLabel = PLAN_DISPLAY[targetPlan]?.label ?? targetPlan;
  const currentLabel = PLAN_DISPLAY[currentPlan]?.label ?? currentPlan;

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/upgrade-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, targetPlan }),
      });

      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      toast({
        title: "Error al enviar solicitud",
        description: "Inténtalo de nuevo o contáctanos directamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (done || isPending) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
        <p className="font-medium text-amber-800">Solicitud pendiente</p>
        <p className="mt-1 text-sm text-amber-700">
          Tu solicitud para el plan {targetLabel} está siendo procesada. Te avisaremos por email.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-5 space-y-3">
      <p className="font-medium text-purple-900">
        Estás a un paso de <span className="font-bold">{targetLabel}</span>
      </p>
      <p className="text-sm text-purple-700">
        Tu plan actual es <strong>{currentLabel}</strong>. Enviaremos tu solicitud y
        activaremos el nuevo plan manualmente en menos de 24 horas.
      </p>
      <Button onClick={handleConfirm} disabled={loading} className="w-full bg-purple-700 hover:bg-purple-800">
        {loading ? "Enviando…" : `Confirmar upgrade a ${targetLabel}`}
      </Button>
    </div>
  );
}
