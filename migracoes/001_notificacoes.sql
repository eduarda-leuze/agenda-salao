-- Migração 001 — Notificações WhatsApp
-- Execute no Supabase: SQL Editor > New query > cole e rode.

-- 1) Nova coluna para rastrear lembrete de 1h
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS lembrete_1h_enviado     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lembrete_1h_enviado_em  timestamptz;

-- ─────────────────────────────────────────────────────────────
-- Funções auxiliares internas
-- ─────────────────────────────────────────────────────────────

-- Verifica o BOT_TOKEN (mesmo método das funções bot_ existentes).
-- Ajuste a lógica se a sua bot_config usar hash diferente.
CREATE OR REPLACE FUNCTION _verificar_bot_token(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM bot_config
    WHERE encode(digest(p_token, 'sha256'), 'hex') = token_hash
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'token inválido';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2) Agendamentos que precisam de lembrete (24 h ou 1 h)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bot_agendamentos_para_lembrete(p_token text)
RETURNS TABLE (
  id               uuid,
  tipo             text,
  cliente_telefone text,
  cliente_nome     text,
  servico_nome     text,
  profissional_nome text,
  inicio           timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _verificar_bot_token(p_token);

  RETURN QUERY
  -- Lembrete 24 h: agendamento entra na janela de 23 h – 25 h a partir de agora
  SELECT a.id,
         '24h'::text,
         c.telefone,
         c.nome,
         s.nome,
         p.nome,
         a.inicio
  FROM agendamentos        a
  JOIN clientes            c  ON c.id = a.cliente_id
  JOIN profissionais       p  ON p.id = a.profissional_id
  JOIN agendamento_servicos as_ ON as_.agendamento_id = a.id
  JOIN servicos            s  ON s.id = as_.servico_id
  WHERE a.status IN ('agendado', 'confirmado', 'solicitado')
    AND a.inicio BETWEEN NOW() + INTERVAL '23 hours'
                     AND NOW() + INTERVAL '25 hours'
    AND a.lembrete_enviado = false

  UNION ALL

  -- Lembrete 1 h: janela de 50 min – 70 min
  SELECT a.id,
         '1h'::text,
         c.telefone,
         c.nome,
         s.nome,
         p.nome,
         a.inicio
  FROM agendamentos        a
  JOIN clientes            c  ON c.id = a.cliente_id
  JOIN profissionais       p  ON p.id = a.profissional_id
  JOIN agendamento_servicos as_ ON as_.agendamento_id = a.id
  JOIN servicos            s  ON s.id = as_.servico_id
  WHERE a.status IN ('agendado', 'confirmado', 'solicitado')
    AND a.inicio BETWEEN NOW() + INTERVAL '50 minutes'
                     AND NOW() + INTERVAL '70 minutes'
    AND a.lembrete_1h_enviado = false

  ORDER BY inicio;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3) Marca lembrete como enviado
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bot_marcar_lembrete(
  p_token          text,
  p_agendamento_id uuid,
  p_tipo           text   -- '24h' ou '1h'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _verificar_bot_token(p_token);

  IF p_tipo = '24h' THEN
    UPDATE agendamentos
       SET lembrete_enviado    = true,
           lembrete_enviado_em = NOW()
     WHERE id = p_agendamento_id;
  ELSIF p_tipo = '1h' THEN
    UPDATE agendamentos
       SET lembrete_1h_enviado    = true,
           lembrete_1h_enviado_em = NOW()
     WHERE id = p_agendamento_id;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4) Próximo agendamento de um cliente por telefone
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bot_proximo_agendamento(
  p_token    text,
  p_telefone text
)
RETURNS TABLE (
  id               uuid,
  servico_nome     text,
  profissional_nome text,
  inicio           timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _verificar_bot_token(p_token);

  RETURN QUERY
  SELECT a.id,
         s.nome,
         p.nome,
         a.inicio
  FROM agendamentos        a
  JOIN clientes            c   ON c.id = a.cliente_id
  JOIN profissionais       p   ON p.id = a.profissional_id
  JOIN agendamento_servicos as_ ON as_.agendamento_id = a.id
  JOIN servicos            s   ON s.id = as_.servico_id
  WHERE c.telefone = p_telefone
    AND a.status IN ('agendado', 'confirmado', 'solicitado')
    AND a.inicio > NOW()
  ORDER BY a.inicio
  LIMIT 1;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5) Confirma agendamento (cliente respondeu "1")
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bot_confirmar_agendamento(
  p_token          text,
  p_telefone       text,
  p_agendamento_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _verificar_bot_token(p_token);

  UPDATE agendamentos a
     SET status = 'confirmado'
    FROM clientes c
   WHERE c.id       = a.cliente_id
     AND c.telefone = p_telefone
     AND a.id       = p_agendamento_id
     AND a.status IN ('agendado', 'solicitado');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6) Dados completos de um agendamento (para confirmação pós-criação pela agenda admin)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bot_dados_agendamento(
  p_token          text,
  p_agendamento_id uuid
)
RETURNS TABLE (
  cliente_telefone  text,
  cliente_nome      text,
  servico_nome      text,
  profissional_nome text,
  inicio            timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _verificar_bot_token(p_token);

  RETURN QUERY
  SELECT c.telefone,
         c.nome,
         s.nome,
         p.nome,
         a.inicio
  FROM agendamentos        a
  JOIN clientes            c   ON c.id = a.cliente_id
  JOIN profissionais       p   ON p.id = a.profissional_id
  JOIN agendamento_servicos as_ ON as_.agendamento_id = a.id
  JOIN servicos            s   ON s.id = as_.servico_id
  WHERE a.id = p_agendamento_id
  LIMIT 1;
END;
$$;
