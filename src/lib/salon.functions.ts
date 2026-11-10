import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notificar, msgConfirmacao, formatarTelefone } from "./notificacoes";

/** Envia confirmação de agendamento via WhatsApp para o cliente (criado pela agenda admin). */
export const notificarAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ agendamentoId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const { createDb } = await import("./bot/db");
      const db = createDb();
      const [ag] = await db.dadosAgendamento(data.agendamentoId);
      if (!ag) return { ok: false };
      await notificar(
        formatarTelefone(ag.cliente_telefone),
        msgConfirmacao(ag.cliente_nome, ag.servico_nome, ag.profissional_nome, ag.inicio, ag.profissional_telefone),
      );
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

export const getSalon = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const { data: admin, error: roleError } = await db.rpc("is_admin");
    if (roleError) throw roleError;
    const { data: own } = await db.rpc("my_profissional_id");
    const queries = await Promise.all([
      db.from("salao_config").select("*").maybeSingle(),
      db.from("profissionais").select("*").order("nome"),
      db.from("servicos").select("*").order("nome"),
      db.from("clientes").select("*").order("nome"),
      admin
        ? db.from("agendamentos").select("*").order("inicio")
        : db
            .from("agendamentos")
            .select("*")
            .eq("profissional_id", own ?? "")
            .order("inicio"),
      db.from("agendamento_servicos").select("*"),
      db.from("bloqueios").select("*"),
      db.from("servico_profissionais").select("*"),
      db.from("horarios_profissional").select("*"),
      db.from("horarios_salao").select("*").order("dia_semana"),
      db.from("comissoes").select("*"),
      admin ? db.from("pagamentos").select("*") : Promise.resolve({ data: [], error: null }),
      admin ? db.from("pagamento_formas").select("*") : Promise.resolve({ data: [], error: null }),
      admin ? db.from("despesas").select("*") : Promise.resolve({ data: [], error: null }),
    ]);
    for (const q of queries) if (q.error) throw new Error(q.error.message);
    const [
      config,
      professionals,
      services,
      clients,
      appointments,
      items,
      blocks,
      assignments,
      hours,
      salonHours,
      commissions,
      payments,
      paymentMethods,
      expenses,
    ] = queries;
    return {
      isAdmin: !!admin,
      ownId: own,
      email: context.claims.email as string | undefined,
      config: config?.data,
      professionals: professionals?.data ?? [],
      services: services?.data ?? [],
      clients: clients?.data ?? [],
      appointments: appointments?.data ?? [],
      items: items?.data ?? [],
      blocks: blocks?.data ?? [],
      assignments: assignments?.data ?? [],
      hours: hours?.data ?? [],
      salonHours: salonHours?.data ?? [],
      commissions: commissions?.data ?? [],
      payments: payments?.data ?? [],
      paymentMethods: paymentMethods?.data ?? [],
      expenses: expenses?.data ?? [],
    };
  });
