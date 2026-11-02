import { createFileRoute } from "@tanstack/react-router";
import { verificarAssinatura } from "@/lib/bot/bird";
import { processarEvento, type EventoBird } from "@/lib/bot/processar";

// Endereço que o Bird chama a cada mensagem: https://SEU-SITE/api/whatsapp
export const Route = createFileRoute("/api/whatsapp")({
  server: {
    handlers: {
      GET: async () => new Response("Robô do WhatsApp do salão: ativo.", { status: 200 }),
      POST: async ({ request }) => {
        const raw = await request.text();
        if (!verificarAssinatura(raw, request.headers, process.env["BIRD_WEBHOOK_SECRET"])) {
          // 400 faz o Bird tentar de novo mais tarde (útil se o segredo ainda não foi configurado).
          return new Response("assinatura inválida", { status: 400 });
        }
        let evento: EventoBird;
        try {
          evento = JSON.parse(raw) as EventoBird;
        } catch {
          return new Response("ok", { status: 200 });
        }
        const webhookId = request.headers.get("webhook-id");
        const trabalho = processarEvento(evento, webhookId).then(
          (r) => console.log("evento", evento.type, "->", r),
          (e) => console.error("erro ao processar evento", evento.type, e),
        );
        // Na Vercel: responde na hora para o Bird e continua o trabalho em segundo plano.
        try {
          const { waitUntil } = await import("@vercel/functions");
          waitUntil(trabalho);
        } catch {
          await trabalho;
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
