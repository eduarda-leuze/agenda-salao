// O atendente do salão: instruções, ferramentas e condução da conversa.
import { conversar, type Ferramenta, type Mensagem, type Executor } from "./ia";
import type { Contexto, Db, Env, FetchLike } from "./db";

const TZ = "America/Sao_Paulo";
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Próximos N dias no fuso de São Paulo, para a IA não errar datas ("sexta que vem" etc.). */
export function calendario(agora = new Date(), n = 21): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const linhas: string[] = [];
  for (let i = 0; i < n; i++) {
    const iso = fmt.format(new Date(agora.getTime() + i * 86400000));
    const [y = 0, m = 1, dia = 1] = iso.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, dia)).getUTCDay();
    const rotulo = i === 0 ? " (hoje)" : i === 1 ? " (amanhã)" : "";
    linhas.push(`${DIAS[dow]} ${String(dia).padStart(2, "0")}/${String(m).padStart(2, "0")} = ${iso}${rotulo}`);
  }
  return linhas.join("\n");
}

const horaAgora = (agora = new Date()) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(agora);
const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function montarInstrucoes(ctx: Contexto, agora = new Date()): string {
  const profPorId = Object.fromEntries((ctx.profissionais || []).map((p) => [p.id, p.nome]));
  const servicos = (ctx.servicos || [])
    .map((s) => {
      const quem = (ctx.vinculos || [])
        .filter((v) => v.servico_id === s.id)
        .map((v) => profPorId[v.profissional_id])
        .filter(Boolean);
      return `- ${s.nome} | ${brl(s.preco)} | ${s.duracao_min} min | quem faz: ${quem.join(", ") || "—"} | servico_id=${s.id}`;
    })
    .join("\n");
  const profs = (ctx.profissionais || []).map((p) => `- ${p.nome} | profissional_id=${p.id}`).join("\n");
  const funcionamento = (ctx.horario_funcionamento || [])
    .map((h) => `- ${DIAS[h.dia_semana]}: ${h.aberto ? `${h.inicio} às ${h.fim}` : "fechado"}`)
    .join("\n");
  const cliente = ctx.cliente?.nome
    ? `A cliente já é cadastrada e se chama ${ctx.cliente.nome}. Não peça o nome de novo.`
    : "A cliente ainda não é cadastrada. Antes de confirmar um agendamento, pergunte o nome completo dela.";

  return `Você é a atendente virtual do WhatsApp do salão "${ctx.nome}". Fale em português do Brasil, com simpatia e profissionalismo, em mensagens curtas como numa conversa de WhatsApp (sem markdown pesado; pode usar *negrito* do WhatsApp com moderação e no máximo 1 emoji por mensagem).

O que você faz:
1. Tira dúvidas sobre serviços, preços, duração, endereço, funcionamento e políticas, usando SOMENTE as informações abaixo.
2. Marca, consulta, cancela e remarca horários usando as ferramentas.

Regras importantes:
- Nunca invente serviço, preço, profissional, horário ou informação. Se não souber, diga que vai chamar alguém da equipe e use a ferramenta chamar_atendente.
- Para marcar: descubra o serviço, a preferência de profissional (ou "qualquer uma") e o dia. Use ver_horarios e ofereça no máximo 4 opções de horário por vez, de preferência espalhadas pelo dia. Só ofereça horários que a ferramenta devolveu.
- Antes de agendar, confirme com a cliente: serviço, profissional, dia da semana, data e hora. Só chame agendar depois que ela disser que sim.
- Use exatamente o "inicio" e o "profissional_id" devolvidos por ver_horarios ao chamar agendar.
- Um serviço por agendamento. Se a cliente quiser dois serviços, marque um de cada vez (em sequência, se fizer sentido).
- Para cancelar ou remarcar: use meus_agendamentos, mostre qual é e peça confirmação explícita. Para remarcar, primeiro agende o novo horário e só depois cancele o antigo.
- Se a cliente pedir para falar com uma pessoa, reclamar, ou falar de algo fora do atendimento (orçamentos especiais, problemas, pagamentos já feitos), use chamar_atendente e avise que alguém da equipe vai responder em breve.
- Se uma ferramenta der erro, explique de forma simples e ofereça outra opção. Nunca mostre IDs, códigos ou mensagens técnicas para a cliente.
- Agendamentos feitos por você já ficam confirmados na agenda.
- Mensagens marcadas como "[Equipe do salão]" no histórico foram escritas por uma pessoa do salão; respeite o que foi combinado nelas.

Agora: ${horaAgora(agora)} (horário de Brasília). Calendário (dia da semana DD/MM = data para as ferramentas):
${calendario(agora)}

Agendamento: precisa de pelo menos ${ctx.antecedenciaHoras} hora(s) de antecedência e pode ser marcado até ${ctx.diasMax} dias à frente.

Horário de funcionamento:
${funcionamento || "- (não informado)"}

Serviços:
${servicos || "- (nenhum serviço disponível)"}

Profissionais:
${profs || "- (nenhuma)"}

${cliente}

Informações do salão (endereço, pagamentos, políticas, perguntas frequentes):
${ctx.info_salao?.trim() || "(nenhuma informação extra cadastrada; para dúvidas fora da lista acima, chame a equipe)"}`;
}

export const FERRAMENTAS: Ferramenta[] = [
  {
    name: "ver_horarios",
    description: "Lista os horários livres de um serviço numa data. Use antes de oferecer horários.",
    input_schema: {
      type: "object",
      properties: {
        data: { type: "string", description: "Data no formato AAAA-MM-DD (use o calendário)." },
        servico_id: { type: "string" },
        profissional_id: { type: "string", description: "Opcional. Omita para qualquer profissional." },
      },
      required: ["data", "servico_id"],
    },
  },
  {
    name: "agendar",
    description:
      "Cria o agendamento (já confirmado). Só use depois que a cliente confirmar serviço, profissional, data e hora.",
    input_schema: {
      type: "object",
      properties: {
        servico_id: { type: "string" },
        profissional_id: { type: "string" },
        inicio: { type: "string", description: "Valor 'inicio' exatamente como veio de ver_horarios." },
        nome_cliente: { type: "string", description: "Nome completo, obrigatório se a cliente não for cadastrada." },
      },
      required: ["servico_id", "profissional_id", "inicio"],
    },
  },
  {
    name: "meus_agendamentos",
    description: "Lista os próximos agendamentos desta cliente (deste número de WhatsApp).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "cancelar_agendamento",
    description: "Cancela um agendamento desta cliente. Só use após confirmação explícita.",
    input_schema: {
      type: "object",
      properties: { agendamento_id: { type: "string" } },
      required: ["agendamento_id"],
    },
  },
  {
    name: "chamar_atendente",
    description: "Pausa o robô nesta conversa e avisa a equipe do salão para responder pessoalmente.",
    input_schema: { type: "object", properties: { motivo: { type: "string" } }, required: ["motivo"] },
  },
];

/** Transforma o histórico do banco em mensagens alternadas user/assistant, terminando na cliente. */
export function historicoParaMensagens(historico: Contexto["historico"]): Mensagem[] {
  const msgs: Mensagem[] = [];
  for (const h of historico || []) {
    const texto = String(h.texto || "").trim();
    if (!texto) continue;
    const role = h.papel === "cliente" ? "user" : "assistant";
    const content = h.papel === "salao" ? `[Equipe do salão]: ${texto}` : texto;
    const ultima = msgs[msgs.length - 1];
    if (ultima && ultima.role === role) ultima.content += `\n${content}`;
    else msgs.push({ role, content });
  }
  while (msgs.length && msgs[0]!.role !== "user") msgs.shift();
  if (msgs.length && msgs[msgs.length - 1]!.role !== "user") return [];
  return msgs;
}

export type Acao = { nome: string; args: Record<string, unknown> };

export type InfoAgendado = {
  nomeCliente: string;
  telefoneCliente: string;
  servicoNome: string;
  profissionalNome: string;
  inicio: string;
};

/** Ferramentas reais (gravam no banco) ou simuladas (só leitura; para a área de teste). */
export function criarExecutor({
  db,
  telefone,
  ctx,
  simulacao = false,
  acoes = [],
  onAgendar,
}: {
  db: Pick<Db, "horarios" | "criar" | "meusAgendamentos" | "cancelar" | "pausar">;
  telefone: string;
  ctx: Contexto;
  simulacao?: boolean;
  acoes?: Acao[];
  onAgendar?: (info: InfoAgendado) => void;
}): Executor {
  return async function executar(nome, args) {
    acoes.push({ nome, args });
    const s = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : undefined);
    switch (nome) {
      case "ver_horarios": {
        const lista = await db.horarios(s("data") ?? "", s("servico_id") ?? "", s("profissional_id"));
        return { quantidade: lista.length, horarios: lista.slice(0, 40) };
      }
      case "agendar": {
        if (!ctx.cliente?.nome && !String(s("nome_cliente") || "").trim()) {
          throw new Error("Pergunte o nome completo da cliente antes de agendar.");
        }
        const serv = (ctx.servicos || []).find((x) => x.id === s("servico_id"));
        const prof = (ctx.profissionais || []).find((x) => x.id === s("profissional_id"));
        if (simulacao) {
          return { simulado: true, confirmado: true, servico: serv?.nome, profissional: prof?.nome, inicio: s("inicio") };
        }
        const result = await db.criar(
          telefone,
          s("nome_cliente"),
          s("servico_id") ?? "",
          s("profissional_id") ?? "",
          s("inicio") ?? "",
        );
        if (onAgendar) {
          onAgendar({
            nomeCliente: String(s("nome_cliente") || ctx.cliente?.nome || "Cliente"),
            telefoneCliente: telefone,
            servicoNome: serv?.nome ?? "Serviço",
            profissionalNome: prof?.nome ?? "Profissional",
            inicio: s("inicio") ?? "",
          });
        }
        return result;
      }
      case "meus_agendamentos":
        return db.meusAgendamentos(telefone);
      case "cancelar_agendamento":
        if (simulacao) return { simulado: true, cancelado: true };
        return db.cancelar(telefone, s("agendamento_id") ?? "");
      case "chamar_atendente":
        if (!simulacao) await db.pausar(telefone, 12, true);
        return { ok: true, mensagem: "A equipe foi avisada e o robô ficou pausado nesta conversa." };
      default:
        throw new Error(`Ferramenta desconhecida: ${nome}`);
    }
  };
}

export async function responder({
  ctx,
  mensagens,
  executar,
  env,
  fetchImpl,
  agora = new Date(),
}: {
  ctx: Contexto;
  mensagens: Mensagem[];
  executar: Executor;
  env?: Env;
  fetchImpl?: FetchLike;
  agora?: Date;
}): Promise<string> {
  if (!mensagens.length) return "";
  return conversar({
    sistema: montarInstrucoes(ctx, agora),
    mensagens,
    ferramentas: FERRAMENTAS,
    executar,
    ...(env ? { env } : {}),
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}
