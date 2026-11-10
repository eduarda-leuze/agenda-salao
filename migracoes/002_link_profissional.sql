-- Atualiza bot_dados_agendamento para incluir o telefone da profissional
CREATE OR REPLACE FUNCTION bot_dados_agendamento(p_token text, p_agendamento_id uuid)
RETURNS TABLE (
  cliente_telefone text,
  cliente_nome     text,
  servico_nome     text,
  profissional_nome text,
  profissional_telefone text,
  inicio           timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _verificar_bot_token(p_token);
  RETURN QUERY
  SELECT
    c.telefone,
    c.nome,
    s.nome,
    p.nome,
    p.telefone,
    a.inicio
  FROM agendamentos a
  JOIN clientes c ON c.id = a.cliente_id
  JOIN profissionais p ON p.id = a.profissional_id
  JOIN agendamento_servicos as_ ON as_.agendamento_id = a.id
  JOIN servicos s ON s.id = as_.servico_id
  WHERE a.id = p_agendamento_id
  LIMIT 1;
END;
$$;
