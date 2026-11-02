// Utilidades de formatação e fuso para o Brasil.
// O salão opera em America/Sao_Paulo, que é UTC-03:00 fixo (sem horário de verão desde 2019).
export const TZ = "America/Sao_Paulo";
export const OFFSET = "-03:00";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const fmtBRL = (v: number | string | null | undefined) => brl.format(Number(v ?? 0));

/** yyyy-mm-dd (data local de São Paulo) de um instante */
export function dataLocal(d: Date | string = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return p;
}
/** HH:MM local */
export function horaLocal(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
/** minutos desde 00:00 no horário local */
export function minutosDoDia(d: Date | string): number {
  const [h = 0, m = 0] = horaLocal(d).split(":").map(Number);
  return h * 60 + m;
}
/** Converte data local + hora local para ISO com offset de Brasília */
export function localParaISO(data: string, hora: string): string {
  const h = hora.length === 5 ? `${hora}:00` : hora;
  return new Date(`${data}T${h}${OFFSET}`).toISOString();
}
/** dd/mm/aaaa a partir de yyyy-mm-dd ou ISO */
export function fmtData(v: string | null | undefined): string {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }
  const [y, m, d] = dataLocal(v).split("-");
  return `${d}/${m}/${y}`;
}
export function fmtDataHora(iso: string) {
  return `${fmtData(iso)} ${horaLocal(iso)}`;
}
export function addDias(data: string, n: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** 0 = domingo */
export function diaSemana(data: string): number {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}
export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function fmtDiaLongo(data: string) {
  return `${DIAS[diaSemana(data)]}, ${fmtData(data)}`;
}
export function inicioSemana(data: string) {
  return addDias(data, -diaSemana(data));
}
export function inicioMes(data: string) {
  return `${data.slice(0, 8)}01`;
}
export function fimMes(data: string) {
  const [y = 1970, m = 1] = data.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0));
  return d.toISOString().slice(0, 10);
}
export const minParaHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const horaParaMin = (h: string) => {
  const [a = 0, b = 0] = h.split(":").map(Number);
  return a * 60 + (b || 0);
};

/** Máscara de telefone brasileiro: (11) 91234-5678 ou (11) 1234-5678 */
export function mascaraTelefone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export function telefoneValido(v: string): boolean {
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return d[2] === "9" && Number(d.slice(0, 2)) >= 11;
  if (d.length === 10) return Number(d.slice(0, 2)) >= 11;
  return false;
}
export const linkWhatsApp = (tel: string) => `https://wa.me/55${tel.replace(/\D/g, "")}`;

export const STATUS = {
  solicitado: { label: "Solicitado", cls: "bg-status-solicitado" },
  agendado: { label: "Agendado", cls: "bg-status-agendado" },
  confirmado: { label: "Confirmado", cls: "bg-status-confirmado" },
  em_atendimento: { label: "Em atendimento", cls: "bg-status-atendimento" },
  concluido: { label: "Concluído", cls: "bg-status-concluido" },
  cancelado: { label: "Cancelado", cls: "bg-status-cancelado" },
  nao_compareceu: { label: "Não compareceu", cls: "bg-status-falta" },
} as const;
export type Status = keyof typeof STATUS;

export const FORMAS = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
} as const;
export type Forma = keyof typeof FORMAS;

export const CATEGORIAS_DESPESA = {
  produtos: "Produtos",
  aluguel: "Aluguel",
  luz_agua: "Luz/Água",
  internet: "Internet",
  marketing: "Marketing",
  salarios: "Salários",
  outros: "Outros",
} as const;

export function erroMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: string }).message);
  return "Ocorreu um erro. Tente novamente.";
}
