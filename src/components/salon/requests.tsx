import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, X, CalendarDays } from "lucide-react";
import { useSalon } from "@/lib/salon";
import { supabase } from "@/integrations/supabase/client";
import { fmtDataHora, erroMsg } from "@/lib/br";
import { toast } from "sonner";
export function BookingRequests() {
  const d = useSalon();
  const qc = useQueryClient();
  const [busy, setBusy] = useState("");
  const rows = d.appointments.filter((a) => a.status === "solicitado");
  if (!d.isAdmin || !rows.length) return null;
  async function answer(id: string, confirm: boolean) {
    setBusy(id);
    const { error } = await supabase.rpc("online_responder", { p_id: id, p_confirmar: confirm });
    setBusy("");
    if (error) toast.error(erroMsg(error));
    else {
      toast.success(confirm ? "Agendamento confirmado." : "Solicitação recusada; horário liberado.");
      await qc.invalidateQueries({ queryKey: ["salon"] });
    }
  }
  return (
    <section className="mb-7 border-y border-warning/40 bg-warning/5 py-5">
      <h2 className="mb-4 flex items-center gap-2 text-2xl">
        <CalendarDays className="size-5 text-warning" />
        Solicitações online <span className="font-sans text-sm">({rows.length})</span>
      </h2>
      <div className="divide-y">
        {rows.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-semibold">
                {d.clients.find((c) => c.id === a.cliente_id)?.nome}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDataHora(a.inicio)} · {d.professionals.find((p) => p.id === a.profissional_id)?.nome}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {d.items
                  .filter((i) => i.agendamento_id === a.id)
                  .map((i) => d.services.find((s) => s.id === i.servico_id)?.nome)
                  .join(" + ")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy === a.id} onClick={() => void answer(a.id, true)}>
                <Check />
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === a.id}
                onClick={() => void answer(a.id, false)}
              >
                <X />
                Recusar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
