// Mensagens de WhatsApp enviadas pelo sistema (confirmação, lembretes, avisos).
import type { Env, FetchLike } from "./bot/db";
import { createBird } from "./bot/bird";

const TZ = "America/Sao_Paulo";

export function fmtDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Formata telefone para o padrão Bird (+55DDD...). */
export function formatarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) return `+${d}`;
  return `+55${d}`;
}

export function msgConfirmacao(nome: string, servico: string, profissional: string, inicio: string, profissionalTelefone?: string | null): string {
  const link = profissionalTelefone
    ? `\n\n💬 Fale com ${profissional}: wa.me/${profissionalTelefone.replace(/\D/g, "")}`
    : "";
  return `Olá, ${nome}! 🎉\n\nSeu agendamento está confirmado:\n\n*${servico}* com ${profissional}\n📅 ${fmtDataHora(inicio)}${link}\n\nPara cancelar, responda *2*.`;
}

export function msgLembrete24h(nome: string, servico: string, profissional: string, inicio: string): string {
  return `Oi, ${nome}! 😊 Lembrando do seu agendamento *amanhã*:\n\n*${servico}* com ${profissional}\n📅 ${fmtDataHora(inicio)}\n\nResponda *1* para confirmar ou *2* para cancelar.`;
}

export function msgLembrete1h(nome: string, servico: string, profissional: string, inicio: string): string {
  return `Oi, ${nome}! Seu agendamento é *em 1 hora* 💇‍♀️\n\n*${servico}* com ${profissional}\n📅 ${fmtDataHora(inicio)}\n\nAté logo!`;
}

export function msgNovoPedido(nomeCliente: string, telefone: string, servico: string, profissional: string, inicio: string): string {
  return `📋 *Novo agendamento*\n\nCliente: ${nomeCliente}\nTelefone: ${telefone}\nServiço: *${servico}*\nProfissional: ${profissional}\n📅 ${fmtDataHora(inicio)}`;
}

export function msgConfirmadoPorCliente(nome: string, servico: string, inicio: string): string {
  return `✅ Confirmado! Te esperamos ${fmtDataHora(inicio)} para *${servico}*. Até lá, ${nome}! 😊`;
}

export function msgCanceladoPorCliente(nome: string): string {
  return `Agendamento cancelado. Até a próxima, ${nome}! 😊 Se quiser remarcar, é só falar.`;
}

/** Envia mensagem via Bird. Se Bird não estiver configurado, retorna sem erro. */
export async function notificar(
  para: string,
  texto: string,
  env: Env = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  if (!env["BIRD_API_KEY"] || !env["BIRD_WHATSAPP_FROM"]) return;
  const bird = createBird(env, fetchImpl);
  await bird.enviarTexto(formatarTelefone(para), texto);
}
