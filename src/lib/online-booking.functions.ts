import { createServerFn } from '@tanstack/react-start';
import { bookingSchema, slotsSchema, catalogSchema, resultSchema } from './online-booking';
import { createAnonClient } from '@/integrations/supabase/client';
import { notificar, msgConfirmacao, msgNovoPedido, formatarTelefone } from './notificacoes';

export const publicCatalog = createServerFn({ method: 'GET' }).handler(async () => {
  const { data, error } = await createAnonClient().rpc('online_catalogo');
  if (error) throw new Error('Não foi possível carregar o salão.');
  return catalogSchema.parse(data);
});

export const publicSlots = createServerFn({ method: 'GET' })
  .inputValidator(slotsSchema)
  .handler(async ({ data }) => {
    const { data: slots, error } = await createAnonClient().rpc('online_horarios', {
      p_data: data.data,
      p_servico_id: data.servicoId,
      ...(data.profissionalId ? { p_profissional_id: data.profissionalId } : {}),
    });
    if (error) throw new Error('Não foi possível consultar os horários.');
    return slots ?? [];
  });

// O agendamento público passa por uma função do banco que exige a senha do servidor
// (BOT_TOKEN), então ninguém consegue criar agendamentos direto pelo navegador.
export const publicBook = createServerFn({ method: 'POST' })
  .inputValidator(bookingSchema)
  .handler(async ({ data }) => {
    const token = process.env['BOT_TOKEN'];
    if (!token) throw new Error('Agendamento online indisponível no momento.');
    const { data: result, error } = await createAnonClient().rpc('site_criar', {
      p_token: token,
      p_nome: data.nome,
      p_telefone: data.telefone,
      p_servico_id: data.servicoId,
      p_profissional_id: data.profissionalId,
      p_inicio: data.inicio,
    });
    if (error) {
      const safe = ['3 solicitações pendentes', 'não está mais disponível', 'WhatsApp brasileiro'];
      throw new Error(
        safe.some((s) => error.message.includes(s))
          ? error.message
          : 'Não foi possível solicitar este horário. Tente novamente.',
      );
    }
    const parsed = resultSchema.parse(result);

    // Notificações WhatsApp (fire-and-forget: não bloqueia a resposta ao cliente)
    const telFormatado = formatarTelefone(data.telefone);
    const { data: profData } = await createAnonClient()
      .from("profissionais")
      .select("telefone")
      .eq("id", data.profissionalId)
      .maybeSingle();
    notificar(
      telFormatado,
      msgConfirmacao(data.nome, parsed.servico, parsed.profissional, parsed.inicio, profData?.telefone),
    ).catch(() => {});

    const ownerPhone = process.env['OWNER_PHONE'];
    if (ownerPhone) {
      notificar(
        formatarTelefone(ownerPhone),
        msgNovoPedido(data.nome, data.telefone, parsed.servico, parsed.profissional, parsed.inicio),
      ).catch(() => {});
    }

    return parsed;
  });
