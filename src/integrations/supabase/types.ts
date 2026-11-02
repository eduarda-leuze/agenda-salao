export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agendamento_servicos: {
        Row: { agendamento_id: string; duracao_min: number; id: string; preco: number; servico_id: string }
        Insert: { agendamento_id: string; duracao_min: number; id?: string; preco: number; servico_id: string }
        Update: { agendamento_id?: string; duracao_min?: number; id?: string; preco?: number; servico_id?: string }
        Relationships: Rel[]
      }
      agendamentos: {
        Row: {
          cliente_id: string
          created_at: string
          fim: string
          id: string
          inicio: string
          lembrete_enviado: boolean
          lembrete_enviado_em: string | null
          observacoes: string | null
          origem: string | null
          origem_online: boolean
          profissional_id: string
          status: Database["public"]["Enums"]["status_agendamento"]
        }
        Insert: {
          cliente_id: string
          created_at?: string
          fim: string
          id?: string
          inicio: string
          lembrete_enviado?: boolean
          lembrete_enviado_em?: string | null
          observacoes?: string | null
          origem?: string | null
          origem_online?: boolean
          profissional_id: string
          status?: Database["public"]["Enums"]["status_agendamento"]
        }
        Update: {
          cliente_id?: string
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          lembrete_enviado?: boolean
          lembrete_enviado_em?: string | null
          observacoes?: string | null
          origem?: string | null
          origem_online?: boolean
          profissional_id?: string
          status?: Database["public"]["Enums"]["status_agendamento"]
        }
        Relationships: Rel[]
      }
      bloqueios: {
        Row: { fim: string; id: string; inicio: string; motivo: string; profissional_id: string }
        Insert: { fim: string; id?: string; inicio: string; motivo?: string; profissional_id: string }
        Update: { fim?: string; id?: string; inicio?: string; motivo?: string; profissional_id?: string }
        Relationships: Rel[]
      }
      bot_config: {
        Row: { ativo: boolean; id: number; info_salao: string; token_hash: string; updated_at: string }
        Insert: { ativo?: boolean; id?: number; info_salao?: string; token_hash: string; updated_at?: string }
        Update: { ativo?: boolean; id?: number; info_salao?: string; token_hash?: string; updated_at?: string }
        Relationships: Rel[]
      }
      clientes: {
        Row: {
          aniversario: string | null
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          telefone: string
        }
        Insert: {
          aniversario?: string | null
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          telefone: string
        }
        Update: {
          aniversario?: string | null
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string
        }
        Relationships: Rel[]
      }
      comissoes: {
        Row: {
          agendamento_id: string
          data: string
          id: string
          paga: boolean
          paga_em: string | null
          percentual: number
          profissional_id: string
          servico_id: string | null
          valor: number
          valor_base: number
        }
        Insert: {
          agendamento_id: string
          data?: string
          id?: string
          paga?: boolean
          paga_em?: string | null
          percentual: number
          profissional_id: string
          servico_id?: string | null
          valor: number
          valor_base: number
        }
        Update: {
          agendamento_id?: string
          data?: string
          id?: string
          paga?: boolean
          paga_em?: string | null
          percentual?: number
          profissional_id?: string
          servico_id?: string | null
          valor?: number
          valor_base?: number
        }
        Relationships: Rel[]
      }
      despesas: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_despesa"]
          created_at: string
          data: string
          descricao: string
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          recorrente: boolean
          valor: number
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          created_at?: string
          data?: string
          descricao: string
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          recorrente?: boolean
          valor: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          created_at?: string
          data?: string
          descricao?: string
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          recorrente?: boolean
          valor?: number
        }
        Relationships: Rel[]
      }
      horarios_profissional: {
        Row: { dia_semana: number; fim: string; id: string; inicio: string; profissional_id: string }
        Insert: { dia_semana: number; fim: string; id?: string; inicio: string; profissional_id: string }
        Update: { dia_semana?: number; fim?: string; id?: string; inicio?: string; profissional_id?: string }
        Relationships: Rel[]
      }
      horarios_salao: {
        Row: { aberto: boolean; dia_semana: number; fim: string; inicio: string }
        Insert: { aberto?: boolean; dia_semana: number; fim?: string; inicio?: string }
        Update: { aberto?: boolean; dia_semana?: number; fim?: string; inicio?: string }
        Relationships: Rel[]
      }
      pagamento_formas: {
        Row: { forma: Database["public"]["Enums"]["forma_pagamento"]; id: string; pagamento_id: string; valor: number }
        Insert: { forma: Database["public"]["Enums"]["forma_pagamento"]; id?: string; pagamento_id: string; valor: number }
        Update: { forma?: Database["public"]["Enums"]["forma_pagamento"]; id?: string; pagamento_id?: string; valor?: number }
        Relationships: Rel[]
      }
      pagamentos: {
        Row: { agendamento_id: string; desconto: number; id: string; pago_em: string; valor_bruto: number; valor_total: number }
        Insert: { agendamento_id: string; desconto?: number; id?: string; pago_em?: string; valor_bruto: number; valor_total: number }
        Update: { agendamento_id?: string; desconto?: number; id?: string; pago_em?: string; valor_bruto?: number; valor_total?: number }
        Relationships: Rel[]
      }
      profissionais: {
        Row: {
          ativa: boolean
          comissao_padrao: number
          cor: string
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          ativa?: boolean
          comissao_padrao?: number
          cor?: string
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          ativa?: boolean
          comissao_padrao?: number
          cor?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: Rel[]
      }
      salao_config: {
        Row: {
          agendamento_subtitulo: string | null
          cor_principal: string | null
          id: number
          imagem_entrada_url: string | null
          intervalo_min: number
          logo_url: string | null
          nome: string
          online_antecedencia_horas: number
          online_auto_confirmar: boolean
          online_dias_max: number
          slogan: string | null
          updated_at: string
        }
        Insert: {
          agendamento_subtitulo?: string | null
          cor_principal?: string | null
          id?: number
          imagem_entrada_url?: string | null
          intervalo_min?: number
          logo_url?: string | null
          nome?: string
          online_antecedencia_horas?: number
          online_auto_confirmar?: boolean
          online_dias_max?: number
          slogan?: string | null
          updated_at?: string
        }
        Update: {
          agendamento_subtitulo?: string | null
          cor_principal?: string | null
          id?: number
          imagem_entrada_url?: string | null
          intervalo_min?: number
          logo_url?: string | null
          nome?: string
          online_antecedencia_horas?: number
          online_auto_confirmar?: boolean
          online_dias_max?: number
          slogan?: string | null
          updated_at?: string
        }
        Relationships: Rel[]
      }
      servico_profissionais: {
        Row: { profissional_id: string; servico_id: string }
        Insert: { profissional_id: string; servico_id: string }
        Update: { profissional_id?: string; servico_id?: string }
        Relationships: Rel[]
      }
      servicos: {
        Row: {
          ativo: boolean
          categoria: string
          comissao_pct: number | null
          created_at: string
          duracao_min: number
          id: string
          nome: string
          preco: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          comissao_pct?: number | null
          created_at?: string
          duracao_min: number
          id?: string
          nome: string
          preco?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          comissao_pct?: number | null
          created_at?: string
          duracao_min?: number
          id?: string
          nome?: string
          preco?: number
        }
        Relationships: Rel[]
      }
      user_roles: {
        Row: { id: string; role: Database["public"]["Enums"]["app_role"]; user_id: string }
        Insert: { id?: string; role: Database["public"]["Enums"]["app_role"]; user_id: string }
        Update: { id?: string; role?: Database["public"]["Enums"]["app_role"]; user_id?: string }
        Relationships: Rel[]
      }
      whatsapp_conversas: {
        Row: {
          atualizado_em: string
          criado_em: string
          nome: string | null
          pausado_ate: string | null
          precisa_atencao: boolean
          telefone: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          nome?: string | null
          pausado_ate?: string | null
          precisa_atencao?: boolean
          telefone: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          nome?: string | null
          pausado_ate?: string | null
          precisa_atencao?: boolean
          telefone?: string
        }
        Relationships: Rel[]
      }
      whatsapp_mensagens: {
        Row: { criado_em: string; id: number; papel: string; telefone: string; texto: string; whatsapp_id: string | null }
        Insert: { criado_em?: string; id?: number; papel: string; telefone: string; texto?: string; whatsapp_id?: string | null }
        Update: { criado_em?: string; id?: number; papel?: string; telefone?: string; texto?: string; whatsapp_id?: string | null }
        Relationships: Rel[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      existe_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }
        Returns: boolean
      }
      horarios_livres: {
        Args: { p_data: string; p_passo_min?: number; p_profissional_id?: string; p_servico_ids: string[] }
        Returns: { fim: string; inicio: string; profissional_id: string; profissional_nome: string }[]
      }
      is_admin: { Args: never; Returns: boolean }
      my_profissional_id: { Args: never; Returns: string }
      online_catalogo: { Args: never; Returns: Json }
      online_criar: {
        Args: { p_inicio: string; p_nome: string; p_profissional_id: string; p_servico_id: string; p_telefone: string }
        Returns: Json
      }
      online_horarios: {
        Args: { p_data: string; p_profissional_id?: string; p_servico_id: string }
        Returns: { fim: string; inicio: string; profissional_id: string; profissional_nome: string }[]
      }
      online_responder: { Args: { p_confirmar: boolean; p_id: string }; Returns: undefined }
      publico_marca: { Args: never; Returns: Json }
      site_criar: {
        Args: {
          p_inicio: string
          p_nome: string
          p_profissional_id: string
          p_servico_id: string
          p_telefone: string
          p_token: string
        }
        Returns: Json
      }
      registrar_pagamento: {
        Args: { p_agendamento_id: string; p_desconto: number; p_formas: Json }
        Returns: string
      }
      vincular_acesso_profissional: {
        Args: { p_email: string; p_profissional_id: string }
        Returns: undefined
      }
      whatsapp_pausar: {
        Args: { p_horas: number; p_telefone: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "profissional"
      categoria_despesa: "produtos" | "aluguel" | "luz_agua" | "internet" | "marketing" | "salarios" | "outros"
      forma_pagamento: "pix" | "dinheiro" | "debito" | "credito"
      status_agendamento:
        | "agendado"
        | "confirmado"
        | "em_atendimento"
        | "concluido"
        | "cancelado"
        | "nao_compareceu"
        | "solicitado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "profissional"],
      categoria_despesa: ["produtos", "aluguel", "luz_agua", "internet", "marketing", "salarios", "outros"],
      forma_pagamento: ["pix", "dinheiro", "debito", "credito"],
      status_agendamento: [
        "agendado",
        "confirmado",
        "em_atendimento",
        "concluido",
        "cancelado",
        "nao_compareceu",
        "solicitado",
      ],
    },
  },
} as const
