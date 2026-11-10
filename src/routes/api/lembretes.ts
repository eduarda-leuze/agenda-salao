// Endpoint chamado periodicamente (cron-job.org a cada 30 min) para enviar lembretes.
// Protegido por LEMBRETES_SECRET na query: GET /api/lembretes?secret=xxx
import { createFileRoute } from "@tanstack/react-router";
import { createDb } from "@/lib/bot/db";
import { createBird } from "@/lib/bot/bird";
import { notificar, msgLembrete24h, msgLembrete1h, formatarTelefone } from "@/lib/notificacoes";

export const Route = createFileRoute("/api/lembretes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = new URL(request.url).searchParams.get("secret");
        if (!secret || secret !== process.env["LEMBRETES_SECRET"]) {
          return new Response("não autorizado", { status: 401 });
        }
        if (!process.env["BIRD_API_KEY"] || !process.env["BIRD_WHATSAPP_FROM"]) {
          return Response.json({ ok: false, motivo: "Bird não configurado" });
        }

        const db = createDb();
        let pendentes: Awaited<ReturnType<typeof db.agendamentosParaLembrete>>;
        try {
          pendentes = await db.agendamentosParaLembrete();
        } catch (e) {
          return Response.json({ ok: false, motivo: String(e) }, { status: 500 });
        }

        const enviados: string[] = [];
        const erros: string[] = [];

        for (const ag of pendentes) {
          const tel = formatarTelefone(ag.cliente_telefone);
          const msg =
            ag.tipo === "24h"
              ? msgLembrete24h(ag.cliente_nome, ag.servico_nome, ag.profissional_nome, ag.inicio)
              : msgLembrete1h(ag.cliente_nome, ag.servico_nome, ag.profissional_nome, ag.inicio);
          try {
            await notificar(tel, msg);
            await db.marcarLembrete(ag.id, ag.tipo);
            enviados.push(`${ag.tipo} → ${ag.cliente_nome}`);
          } catch (e) {
            erros.push(`${ag.cliente_nome}: ${String(e).slice(0, 100)}`);
          }
        }

        return Response.json({ ok: true, enviados, erros });
      },
    },
  },
});
