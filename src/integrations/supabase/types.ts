export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          app_icon_url: string | null;
          app_name: string;
          brand_preset: string;
          id: string;
          proposta_assinatura_altura_max_mm: number | null;
          proposta_assinatura_largura_mm: number | null;
          proposta_assinatura_offset_y_mm: number | null;
          proposta_assinatura_url: string | null;
          proposta_condicoes: string | null;
          proposta_emails: string | null;
          proposta_logo_url: string | null;
          proposta_profissional_crea: string | null;
          proposta_profissional_nome: string | null;
          proposta_profissional_titulos: string | null;
          proposta_responsabilidades_contratada: string | null;
          proposta_responsabilidades_contratante: string | null;
          proposta_texto_apresentacao: string | null;
          proposta_texto_intro: string | null;
          proposta_whatsapp: string | null;
          singleton: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          app_icon_url?: string | null;
          app_name?: string;
          brand_preset?: string;
          id?: string;
          proposta_assinatura_altura_max_mm?: number | null;
          proposta_assinatura_largura_mm?: number | null;
          proposta_assinatura_offset_y_mm?: number | null;
          proposta_assinatura_url?: string | null;
          proposta_condicoes?: string | null;
          proposta_emails?: string | null;
          proposta_logo_url?: string | null;
          proposta_profissional_crea?: string | null;
          proposta_profissional_nome?: string | null;
          proposta_profissional_titulos?: string | null;
          proposta_responsabilidades_contratada?: string | null;
          proposta_responsabilidades_contratante?: string | null;
          proposta_texto_apresentacao?: string | null;
          proposta_texto_intro?: string | null;
          proposta_whatsapp?: string | null;
          singleton?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          app_icon_url?: string | null;
          app_name?: string;
          brand_preset?: string;
          id?: string;
          proposta_assinatura_altura_max_mm?: number | null;
          proposta_assinatura_largura_mm?: number | null;
          proposta_assinatura_offset_y_mm?: number | null;
          proposta_assinatura_url?: string | null;
          proposta_condicoes?: string | null;
          proposta_emails?: string | null;
          proposta_logo_url?: string | null;
          proposta_profissional_crea?: string | null;
          proposta_profissional_nome?: string | null;
          proposta_profissional_titulos?: string | null;
          proposta_responsabilidades_contratada?: string | null;
          proposta_responsabilidades_contratante?: string | null;
          proposta_texto_apresentacao?: string | null;
          proposta_texto_intro?: string | null;
          proposta_whatsapp?: string | null;
          singleton?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      asos: {
        Row: {
          cpf: string | null;
          created_at: string;
          created_by: string | null;
          data_aso: string;
          data_nascimento: string | null;
          empresa_id: string;
          eventos_esocial: string[];
          funcao: string | null;
          funcionario_nome: string;
          id: string;
          observacoes: string | null;
          tipo_aso: Database["public"]["Enums"]["aso_tipo"];
          updated_at: string;
        };
        Insert: {
          cpf?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_aso: string;
          data_nascimento?: string | null;
          empresa_id: string;
          eventos_esocial?: string[];
          funcao?: string | null;
          funcionario_nome: string;
          id?: string;
          observacoes?: string | null;
          tipo_aso?: Database["public"]["Enums"]["aso_tipo"];
          updated_at?: string;
        };
        Update: {
          cpf?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_aso?: string;
          data_nascimento?: string | null;
          empresa_id?: string;
          eventos_esocial?: string[];
          funcao?: string | null;
          funcionario_nome?: string;
          id?: string;
          observacoes?: string | null;
          tipo_aso?: Database["public"]["Enums"]["aso_tipo"];
          updated_at?: string;
        };
        Relationships: [];
      };
      contabilidades: {
        Row: {
          cidade: string | null;
          cnpj: string | null;
          contato: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          nome: string;
          observacoes: string | null;
          responsavel: string | null;
          updated_at: string;
        };
        Insert: {
          cidade?: string | null;
          cnpj?: string | null;
          contato?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          nome: string;
          observacoes?: string | null;
          responsavel?: string | null;
          updated_at?: string;
        };
        Update: {
          cidade?: string | null;
          cnpj?: string | null;
          contato?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          responsavel?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      documentos_sst: {
        Row: {
          conferencia_ok: boolean;
          conferencia_ok_at: string | null;
          conferencia_ok_by: string | null;
          created_at: string;
          created_by: string | null;
          data_conclusao: string | null;
          data_vencimento: string | null;
          empresa_id: string;
          id: string;
          observacoes: string | null;
          responsavel: string | null;
          situacao: Database["public"]["Enums"]["documento_situacao"];
          tipo: Database["public"]["Enums"]["documento_tipo"];
          titulo: string | null;
          updated_at: string;
        };
        Insert: {
          conferencia_ok?: boolean;
          conferencia_ok_at?: string | null;
          conferencia_ok_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_conclusao?: string | null;
          data_vencimento?: string | null;
          empresa_id: string;
          id?: string;
          observacoes?: string | null;
          responsavel?: string | null;
          situacao?: Database["public"]["Enums"]["documento_situacao"];
          tipo: Database["public"]["Enums"]["documento_tipo"];
          titulo?: string | null;
          updated_at?: string;
        };
        Update: {
          conferencia_ok?: boolean;
          conferencia_ok_at?: string | null;
          conferencia_ok_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_conclusao?: string | null;
          data_vencimento?: string | null;
          empresa_id?: string;
          id?: string;
          observacoes?: string | null;
          responsavel?: string | null;
          situacao?: Database["public"]["Enums"]["documento_situacao"];
          tipo?: Database["public"]["Enums"]["documento_tipo"];
          titulo?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documentos_sst_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      empresas: {
        Row: {
          bairro: string | null;
          cep: string | null;
          cidade: string | null;
          cnae: string | null;
          cnpj: string | null;
          contabilidade_id: string | null;
          contato: string | null;
          created_at: string;
          created_by: string | null;
          documentos_enviados: boolean;
          documentos_enviados_at: string | null;
          documentos_enviados_by: string | null;
          email: string | null;
          endereco: string | null;
          grau_risco: string | null;
          id: string;
          inscricao_estadual: string | null;
          inscricao_municipal: string | null;
          isencao_ficha_epi: boolean;
          isencao_pcmso: boolean;
          isencao_pgr: boolean;
          isencao_simplificada: boolean;
          logo_url: string | null;
          nome: string;
          nome_fantasia: string | null;
          observacoes: string | null;
          qtd_trabalhadores: number | null;
          razao_social: string | null;
          responsavel: string | null;
          status: Database["public"]["Enums"]["empresa_status"];
          uf: string | null;
          updated_at: string;
        };
        Insert: {
          bairro?: string | null;
          cep?: string | null;
          cidade?: string | null;
          cnae?: string | null;
          cnpj?: string | null;
          contabilidade_id?: string | null;
          contato?: string | null;
          created_at?: string;
          created_by?: string | null;
          documentos_enviados?: boolean;
          documentos_enviados_at?: string | null;
          documentos_enviados_by?: string | null;
          email?: string | null;
          endereco?: string | null;
          grau_risco?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          isencao_ficha_epi?: boolean;
          isencao_pcmso?: boolean;
          isencao_pgr?: boolean;
          isencao_simplificada?: boolean;
          logo_url?: string | null;
          nome: string;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          qtd_trabalhadores?: number | null;
          razao_social?: string | null;
          responsavel?: string | null;
          status?: Database["public"]["Enums"]["empresa_status"];
          uf?: string | null;
          updated_at?: string;
        };
        Update: {
          bairro?: string | null;
          cep?: string | null;
          cidade?: string | null;
          cnae?: string | null;
          cnpj?: string | null;
          contabilidade_id?: string | null;
          contato?: string | null;
          created_at?: string;
          created_by?: string | null;
          documentos_enviados?: boolean;
          documentos_enviados_at?: string | null;
          documentos_enviados_by?: string | null;
          email?: string | null;
          endereco?: string | null;
          grau_risco?: string | null;
          id?: string;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          isencao_ficha_epi?: boolean;
          isencao_pcmso?: boolean;
          isencao_pgr?: boolean;
          isencao_simplificada?: boolean;
          logo_url?: string | null;
          nome?: string;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          qtd_trabalhadores?: number | null;
          razao_social?: string | null;
          responsavel?: string | null;
          status?: Database["public"]["Enums"]["empresa_status"];
          uf?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "empresas_contabilidade_id_fkey";
            columns: ["contabilidade_id"];
            isOneToOne: false;
            referencedRelation: "contabilidades";
            referencedColumns: ["id"];
          },
        ];
      };
      eventos_esocial: {
        Row: {
          created_at: string;
          created_by: string | null;
          data_evento: string | null;
          descricao: string | null;
          empresa_id: string;
          id: string;
          observacoes: string | null;
          status: Database["public"]["Enums"]["evento_status"];
          tipo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          data_evento?: string | null;
          descricao?: string | null;
          empresa_id: string;
          id?: string;
          observacoes?: string | null;
          status?: Database["public"]["Enums"]["evento_status"];
          tipo: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          data_evento?: string | null;
          descricao?: string | null;
          empresa_id?: string;
          id?: string;
          observacoes?: string | null;
          status?: Database["public"]["Enums"]["evento_status"];
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_esocial_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      funcoes: {
        Row: {
          created_at: string;
          created_by: string | null;
          descricao_atividades: string | null;
          empresa_id: string;
          id: string;
          nome: string;
          riscos_acidentes: string | null;
          riscos_biologicos: string | null;
          riscos_ergonomicos: string | null;
          riscos_fisicos: string | null;
          riscos_quimicos: string | null;
          setor_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          descricao_atividades?: string | null;
          empresa_id: string;
          id?: string;
          nome: string;
          riscos_acidentes?: string | null;
          riscos_biologicos?: string | null;
          riscos_ergonomicos?: string | null;
          riscos_fisicos?: string | null;
          riscos_quimicos?: string | null;
          setor_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          descricao_atividades?: string | null;
          empresa_id?: string;
          id?: string;
          nome?: string;
          riscos_acidentes?: string | null;
          riscos_biologicos?: string | null;
          riscos_ergonomicos?: string | null;
          riscos_fisicos?: string | null;
          riscos_quimicos?: string | null;
          setor_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "funcoes_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "funcoes_setor_id_fkey";
            columns: ["setor_id"];
            isOneToOne: false;
            referencedRelation: "setores";
            referencedColumns: ["id"];
          },
        ];
      };
      ges: {
        Row: {
          ambiente_trabalho: string | null;
          area_aproximada_m2: number | null;
          atividade: string | null;
          caracterizacao: string | null;
          cargo: string;
          codigo_ges: string | null;
          created_at: string;
          created_by: string | null;
          descricao_ambiente: string | null;
          descricao_atividade: string | null;
          empresa_id: string;
          id: string;
          iluminacao: string | null;
          jornada: string | null;
          observacoes: string | null;
          qtd_colaboradores: number;
          requisitos_construtivos: string | null;
          setor: string | null;
          turno: string | null;
          unidade: string | null;
          updated_at: string;
          ventilacao: string | null;
        };
        Insert: {
          ambiente_trabalho?: string | null;
          area_aproximada_m2?: number | null;
          atividade?: string | null;
          caracterizacao?: string | null;
          cargo: string;
          codigo_ges?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao_ambiente?: string | null;
          descricao_atividade?: string | null;
          empresa_id: string;
          id?: string;
          iluminacao?: string | null;
          jornada?: string | null;
          observacoes?: string | null;
          qtd_colaboradores?: number;
          requisitos_construtivos?: string | null;
          setor?: string | null;
          turno?: string | null;
          unidade?: string | null;
          updated_at?: string;
          ventilacao?: string | null;
        };
        Update: {
          ambiente_trabalho?: string | null;
          area_aproximada_m2?: number | null;
          atividade?: string | null;
          caracterizacao?: string | null;
          cargo?: string;
          codigo_ges?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao_ambiente?: string | null;
          descricao_atividade?: string | null;
          empresa_id?: string;
          id?: string;
          iluminacao?: string | null;
          jornada?: string | null;
          observacoes?: string | null;
          qtd_colaboradores?: number;
          requisitos_construtivos?: string | null;
          setor?: string | null;
          turno?: string | null;
          unidade?: string | null;
          updated_at?: string;
          ventilacao?: string | null;
        };
        Relationships: [];
      };
      ges_funcoes: {
        Row: {
          created_at: string;
          created_by: string | null;
          funcao_id: string;
          ges_id: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          funcao_id: string;
          ges_id: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          funcao_id?: string;
          ges_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ges_funcoes_funcao_id_fkey";
            columns: ["funcao_id"];
            isOneToOne: false;
            referencedRelation: "funcoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ges_funcoes_ges_id_fkey";
            columns: ["ges_id"];
            isOneToOne: false;
            referencedRelation: "ges";
            referencedColumns: ["id"];
          },
        ];
      };
      ges_medidas: {
        Row: {
          created_at: string;
          created_by: string | null;
          ges_id: string;
          id: string;
          medida_id: string;
          observacao: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ges_id: string;
          id?: string;
          medida_id: string;
          observacao?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ges_id?: string;
          id?: string;
          medida_id?: string;
          observacao?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ges_medidas_ges_id_fkey";
            columns: ["ges_id"];
            isOneToOne: false;
            referencedRelation: "ges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ges_medidas_medida_id_fkey";
            columns: ["medida_id"];
            isOneToOne: false;
            referencedRelation: "medidas_controle";
            referencedColumns: ["id"];
          },
        ];
      };
      ges_responsaveis: {
        Row: {
          created_at: string;
          created_by: string | null;
          ges_id: string;
          id: string;
          papel: string | null;
          profissional_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ges_id: string;
          id?: string;
          papel?: string | null;
          profissional_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ges_id?: string;
          id?: string;
          papel?: string | null;
          profissional_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ges_responsaveis_ges_id_fkey";
            columns: ["ges_id"];
            isOneToOne: false;
            referencedRelation: "ges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ges_responsaveis_profissional_id_fkey";
            columns: ["profissional_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
        ];
      };
      ges_riscos: {
        Row: {
          anexo_nr15: string | null;
          anexo_nr16: string | null;
          aposentadoria_especial: string | null;
          avaliacao: string | null;
          classificacao: Database["public"]["Enums"]["risco_classificacao"] | null;
          codigo_gfip: string | null;
          conclusao_aposentadoria: string | null;
          conclusao_insalubridade: string | null;
          conclusao_periculosidade: string | null;
          cr: string | null;
          created_at: string;
          created_by: string | null;
          data_avaliacao: string | null;
          descricao_perigo: string | null;
          descricao_risco: string | null;
          epc_eficaz: string | null;
          equipamento: string | null;
          esocial: boolean;
          estimativa: string | null;
          fontes_geradoras: string | null;
          freq_exposicao: string | null;
          gerar_ltcat: string | null;
          gerar_lti: string | null;
          gerar_ltp: string | null;
          gerar_pgr_pcmso: string | null;
          ges_id: string;
          id: string;
          insalubre: string | null;
          intensidade: string | null;
          medidas_implementadas: string | null;
          medidas_preventivas: string | null;
          metodologia: string | null;
          ne: number | null;
          ng: number | null;
          nmc: number | null;
          nome_override: string | null;
          np: number | null;
          nr: number | null;
          obs_pgr: string | null;
          observacoes: string | null;
          perc_insalubridade: string | null;
          perc_periculosidade: string | null;
          periculoso: string | null;
          possiveis_lesoes: string | null;
          probabilidade: string | null;
          recomendacao_medidas: string | null;
          risco_id: string;
          severidade: string | null;
          tempo_exposicao: string | null;
          tipo_avaliacao: string | null;
          trajetoria: string | null;
          updated_at: string;
          utiliza_epc: string | null;
          utiliza_epi: string | null;
        };
        Insert: {
          anexo_nr15?: string | null;
          anexo_nr16?: string | null;
          aposentadoria_especial?: string | null;
          avaliacao?: string | null;
          classificacao?: Database["public"]["Enums"]["risco_classificacao"] | null;
          codigo_gfip?: string | null;
          conclusao_aposentadoria?: string | null;
          conclusao_insalubridade?: string | null;
          conclusao_periculosidade?: string | null;
          cr?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_avaliacao?: string | null;
          descricao_perigo?: string | null;
          descricao_risco?: string | null;
          epc_eficaz?: string | null;
          equipamento?: string | null;
          esocial?: boolean;
          estimativa?: string | null;
          fontes_geradoras?: string | null;
          freq_exposicao?: string | null;
          gerar_ltcat?: string | null;
          gerar_lti?: string | null;
          gerar_ltp?: string | null;
          gerar_pgr_pcmso?: string | null;
          ges_id: string;
          id?: string;
          insalubre?: string | null;
          intensidade?: string | null;
          medidas_implementadas?: string | null;
          medidas_preventivas?: string | null;
          metodologia?: string | null;
          ne?: number | null;
          ng?: number | null;
          nmc?: number | null;
          nome_override?: string | null;
          np?: number | null;
          nr?: number | null;
          obs_pgr?: string | null;
          observacoes?: string | null;
          perc_insalubridade?: string | null;
          perc_periculosidade?: string | null;
          periculoso?: string | null;
          possiveis_lesoes?: string | null;
          probabilidade?: string | null;
          recomendacao_medidas?: string | null;
          risco_id: string;
          severidade?: string | null;
          tempo_exposicao?: string | null;
          tipo_avaliacao?: string | null;
          trajetoria?: string | null;
          updated_at?: string;
          utiliza_epc?: string | null;
          utiliza_epi?: string | null;
        };
        Update: {
          anexo_nr15?: string | null;
          anexo_nr16?: string | null;
          aposentadoria_especial?: string | null;
          avaliacao?: string | null;
          classificacao?: Database["public"]["Enums"]["risco_classificacao"] | null;
          codigo_gfip?: string | null;
          conclusao_aposentadoria?: string | null;
          conclusao_insalubridade?: string | null;
          conclusao_periculosidade?: string | null;
          cr?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_avaliacao?: string | null;
          descricao_perigo?: string | null;
          descricao_risco?: string | null;
          epc_eficaz?: string | null;
          equipamento?: string | null;
          esocial?: boolean;
          estimativa?: string | null;
          fontes_geradoras?: string | null;
          freq_exposicao?: string | null;
          gerar_ltcat?: string | null;
          gerar_lti?: string | null;
          gerar_ltp?: string | null;
          gerar_pgr_pcmso?: string | null;
          ges_id?: string;
          id?: string;
          insalubre?: string | null;
          intensidade?: string | null;
          medidas_implementadas?: string | null;
          medidas_preventivas?: string | null;
          metodologia?: string | null;
          ne?: number | null;
          ng?: number | null;
          nmc?: number | null;
          nome_override?: string | null;
          np?: number | null;
          nr?: number | null;
          obs_pgr?: string | null;
          observacoes?: string | null;
          perc_insalubridade?: string | null;
          perc_periculosidade?: string | null;
          periculoso?: string | null;
          possiveis_lesoes?: string | null;
          probabilidade?: string | null;
          recomendacao_medidas?: string | null;
          risco_id?: string;
          severidade?: string | null;
          tempo_exposicao?: string | null;
          tipo_avaliacao?: string | null;
          trajetoria?: string | null;
          updated_at?: string;
          utiliza_epc?: string | null;
          utiliza_epi?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ges_riscos_ges_id_fkey";
            columns: ["ges_id"];
            isOneToOne: false;
            referencedRelation: "ges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ges_riscos_risco_id_fkey";
            columns: ["risco_id"];
            isOneToOne: false;
            referencedRelation: "riscos_ocupacionais";
            referencedColumns: ["id"];
          },
        ];
      };
      import_history: {
        Row: {
          created_at: string;
          escopo: string;
          extra_columns: Json | null;
          file_name: string;
          id: string;
          imported_by: string | null;
          imported_by_name: string | null;
          total_erros: number;
          total_importados: number;
          total_linhas: number;
        };
        Insert: {
          created_at?: string;
          escopo?: string;
          extra_columns?: Json | null;
          file_name: string;
          id?: string;
          imported_by?: string | null;
          imported_by_name?: string | null;
          total_erros?: number;
          total_importados?: number;
          total_linhas?: number;
        };
        Update: {
          created_at?: string;
          escopo?: string;
          extra_columns?: Json | null;
          file_name?: string;
          id?: string;
          imported_by?: string | null;
          imported_by_name?: string | null;
          total_erros?: number;
          total_importados?: number;
          total_linhas?: number;
        };
        Relationships: [];
      };
      inspecao_itens: {
        Row: {
          acao_corretiva: string | null;
          created_at: string;
          grupo: string | null;
          id: string;
          inspecao_id: string;
          observacao: string | null;
          ordem: number;
          pergunta: string;
          prazo: string | null;
          prioridade: string | null;
          referencia: string | null;
          resposta: string;
          updated_at: string;
        };
        Insert: {
          acao_corretiva?: string | null;
          created_at?: string;
          grupo?: string | null;
          id?: string;
          inspecao_id: string;
          observacao?: string | null;
          ordem?: number;
          pergunta: string;
          prazo?: string | null;
          prioridade?: string | null;
          referencia?: string | null;
          resposta?: string;
          updated_at?: string;
        };
        Update: {
          acao_corretiva?: string | null;
          created_at?: string;
          grupo?: string | null;
          id?: string;
          inspecao_id?: string;
          observacao?: string | null;
          ordem?: number;
          pergunta?: string;
          prazo?: string | null;
          prioridade?: string | null;
          referencia?: string | null;
          resposta?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspecao_itens_inspecao_id_fkey";
            columns: ["inspecao_id"];
            isOneToOne: false;
            referencedRelation: "inspecoes";
            referencedColumns: ["id"];
          },
        ];
      };
      inspecoes: {
        Row: {
          conclusao: string | null;
          created_at: string;
          created_by: string | null;
          data_inspecao: string;
          empresa_id: string;
          id: string;
          local: string | null;
          nr_codigo: string;
          nr_titulo: string | null;
          observacoes: string | null;
          responsavel_id: string | null;
          responsavel_nome: string | null;
          setor: string | null;
          status: string;
          titulo: string | null;
          updated_at: string;
        };
        Insert: {
          conclusao?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_inspecao?: string;
          empresa_id: string;
          id?: string;
          local?: string | null;
          nr_codigo: string;
          nr_titulo?: string | null;
          observacoes?: string | null;
          responsavel_id?: string | null;
          responsavel_nome?: string | null;
          setor?: string | null;
          status?: string;
          titulo?: string | null;
          updated_at?: string;
        };
        Update: {
          conclusao?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_inspecao?: string;
          empresa_id?: string;
          id?: string;
          local?: string | null;
          nr_codigo?: string;
          nr_titulo?: string | null;
          observacoes?: string | null;
          responsavel_id?: string | null;
          responsavel_nome?: string | null;
          setor?: string | null;
          status?: string;
          titulo?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspecoes_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspecoes_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
        ];
      };
      levantamento_riscos: {
        Row: {
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          exposicao: string | null;
          fonte_geradora: string | null;
          id: string;
          levantamento_id: string;
          medidas_existentes: string | null;
          medidas_recomendadas: string | null;
          nivel_risco: Database["public"]["Enums"]["risco_classificacao"] | null;
          nome: string;
          observacoes: string | null;
          prazo: string | null;
          probabilidade: number | null;
          responsavel: string | null;
          risco_id: string | null;
          severidade: number | null;
          tipo: Database["public"]["Enums"]["risco_tipo"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          exposicao?: string | null;
          fonte_geradora?: string | null;
          id?: string;
          levantamento_id: string;
          medidas_existentes?: string | null;
          medidas_recomendadas?: string | null;
          nivel_risco?: Database["public"]["Enums"]["risco_classificacao"] | null;
          nome: string;
          observacoes?: string | null;
          prazo?: string | null;
          probabilidade?: number | null;
          responsavel?: string | null;
          risco_id?: string | null;
          severidade?: number | null;
          tipo: Database["public"]["Enums"]["risco_tipo"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          exposicao?: string | null;
          fonte_geradora?: string | null;
          id?: string;
          levantamento_id?: string;
          medidas_existentes?: string | null;
          medidas_recomendadas?: string | null;
          nivel_risco?: Database["public"]["Enums"]["risco_classificacao"] | null;
          nome?: string;
          observacoes?: string | null;
          prazo?: string | null;
          probabilidade?: number | null;
          responsavel?: string | null;
          risco_id?: string | null;
          severidade?: number | null;
          tipo?: Database["public"]["Enums"]["risco_tipo"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "levantamento_riscos_levantamento_id_fkey";
            columns: ["levantamento_id"];
            isOneToOne: false;
            referencedRelation: "levantamentos_risco";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "levantamento_riscos_risco_id_fkey";
            columns: ["risco_id"];
            isOneToOne: false;
            referencedRelation: "riscos_ocupacionais";
            referencedColumns: ["id"];
          },
        ];
      };
      levantamentos_risco: {
        Row: {
          condicoes_ambiente: string | null;
          created_at: string;
          created_by: string | null;
          data_levantamento: string;
          descricao_atividades: string | null;
          empresa_id: string;
          funcao_id: string | null;
          funcao_nome: string | null;
          id: string;
          local: string | null;
          observacoes: string | null;
          qtd_trabalhadores: number | null;
          responsavel_id: string | null;
          responsavel_nome: string | null;
          setor_id: string | null;
          setor_nome: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          condicoes_ambiente?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_levantamento?: string;
          descricao_atividades?: string | null;
          empresa_id: string;
          funcao_id?: string | null;
          funcao_nome?: string | null;
          id?: string;
          local?: string | null;
          observacoes?: string | null;
          qtd_trabalhadores?: number | null;
          responsavel_id?: string | null;
          responsavel_nome?: string | null;
          setor_id?: string | null;
          setor_nome?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          condicoes_ambiente?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_levantamento?: string;
          descricao_atividades?: string | null;
          empresa_id?: string;
          funcao_id?: string | null;
          funcao_nome?: string | null;
          id?: string;
          local?: string | null;
          observacoes?: string | null;
          qtd_trabalhadores?: number | null;
          responsavel_id?: string | null;
          responsavel_nome?: string | null;
          setor_id?: string | null;
          setor_nome?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "levantamentos_risco_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "levantamentos_risco_funcao_id_fkey";
            columns: ["funcao_id"];
            isOneToOne: false;
            referencedRelation: "funcoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "levantamentos_risco_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profissionais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "levantamentos_risco_setor_id_fkey";
            columns: ["setor_id"];
            isOneToOne: false;
            referencedRelation: "setores";
            referencedColumns: ["id"];
          },
        ];
      };
      medidas_controle: {
        Row: {
          ativo: boolean;
          ca: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          empresa_id: string | null;
          fabricante: string | null;
          id: string;
          nome: string;
          observacoes: string | null;
          risco_associado: string | null;
          tipo: string;
          updated_at: string;
          validade_meses: number | null;
        };
        Insert: {
          ativo?: boolean;
          ca?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          empresa_id?: string | null;
          fabricante?: string | null;
          id?: string;
          nome: string;
          observacoes?: string | null;
          risco_associado?: string | null;
          tipo?: string;
          updated_at?: string;
          validade_meses?: number | null;
        };
        Update: {
          ativo?: boolean;
          ca?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          empresa_id?: string | null;
          fabricante?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          risco_associado?: string | null;
          tipo?: string;
          updated_at?: string;
          validade_meses?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "medidas_controle_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      notificacoes: {
        Row: {
          created_at: string;
          id: string;
          lida: boolean;
          lida_em: string | null;
          link: string | null;
          mensagem: string | null;
          ref_id: string | null;
          ref_tipo: string | null;
          tipo: string;
          titulo: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lida?: boolean;
          lida_em?: string | null;
          link?: string | null;
          mensagem?: string | null;
          ref_id?: string | null;
          ref_tipo?: string | null;
          tipo: string;
          titulo: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lida?: boolean;
          lida_em?: string | null;
          link?: string | null;
          mensagem?: string | null;
          ref_id?: string | null;
          ref_tipo?: string | null;
          tipo?: string;
          titulo?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ordens_servico: {
        Row: {
          created_at: string;
          created_by: string | null;
          data_admissao: string | null;
          data_emissao: string | null;
          descricao_atividades: string | null;
          empregador_razao_social: string;
          empresa_id: string | null;
          funcionario_cargo: string;
          funcionario_cpf: string | null;
          funcionario_nome: string;
          funcionario_setor: string | null;
          id: string;
          local_emissao: string | null;
          medidas_preventivas: string | null;
          observacoes: string | null;
          proibicoes: string | null;
          responsavel_nome: string | null;
          responsavel_registro: string | null;
          responsavel_titulo: string | null;
          revisao: string | null;
          riscos_acidentes: string | null;
          riscos_biologicos: string | null;
          riscos_ergonomicos: string | null;
          riscos_fisicos: string | null;
          riscos_quimicos: string | null;
          treinamentos_obrigatorios: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          data_admissao?: string | null;
          data_emissao?: string | null;
          descricao_atividades?: string | null;
          empregador_razao_social: string;
          empresa_id?: string | null;
          funcionario_cargo: string;
          funcionario_cpf?: string | null;
          funcionario_nome: string;
          funcionario_setor?: string | null;
          id?: string;
          local_emissao?: string | null;
          medidas_preventivas?: string | null;
          observacoes?: string | null;
          proibicoes?: string | null;
          responsavel_nome?: string | null;
          responsavel_registro?: string | null;
          responsavel_titulo?: string | null;
          revisao?: string | null;
          riscos_acidentes?: string | null;
          riscos_biologicos?: string | null;
          riscos_ergonomicos?: string | null;
          riscos_fisicos?: string | null;
          riscos_quimicos?: string | null;
          treinamentos_obrigatorios?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          data_admissao?: string | null;
          data_emissao?: string | null;
          descricao_atividades?: string | null;
          empregador_razao_social?: string;
          empresa_id?: string | null;
          funcionario_cargo?: string;
          funcionario_cpf?: string | null;
          funcionario_nome?: string;
          funcionario_setor?: string | null;
          id?: string;
          local_emissao?: string | null;
          medidas_preventivas?: string | null;
          observacoes?: string | null;
          proibicoes?: string | null;
          responsavel_nome?: string | null;
          responsavel_registro?: string | null;
          responsavel_titulo?: string | null;
          revisao?: string | null;
          riscos_acidentes?: string | null;
          riscos_biologicos?: string | null;
          riscos_ergonomicos?: string | null;
          riscos_fisicos?: string | null;
          riscos_quimicos?: string | null;
          treinamentos_obrigatorios?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ordens_servico_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      pgr_documentos: {
        Row: {
          codigo: string | null;
          created_at: string;
          empresa_id: string;
          gerado_em: string;
          gerado_por: string | null;
          id: string;
          pdf_path: string | null;
          revisao: string;
          updated_at: string;
          vigencia_fim: string | null;
          vigencia_inicio: string | null;
        };
        Insert: {
          codigo?: string | null;
          created_at?: string;
          empresa_id: string;
          gerado_em?: string;
          gerado_por?: string | null;
          id?: string;
          pdf_path?: string | null;
          revisao?: string;
          updated_at?: string;
          vigencia_fim?: string | null;
          vigencia_inicio?: string | null;
        };
        Update: {
          codigo?: string | null;
          created_at?: string;
          empresa_id?: string;
          gerado_em?: string;
          gerado_por?: string | null;
          id?: string;
          pdf_path?: string | null;
          revisao?: string;
          updated_at?: string;
          vigencia_fim?: string | null;
          vigencia_inicio?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          cargo: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          cargo?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          cargo?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profissionais: {
        Row: {
          ativo: boolean;
          cargo: string | null;
          cpf: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          nome: string;
          observacoes: string | null;
          registro: string | null;
          telefone: string | null;
          tipo_registro: string | null;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          cargo?: string | null;
          cpf?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          nome: string;
          observacoes?: string | null;
          registro?: string | null;
          telefone?: string | null;
          tipo_registro?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          cargo?: string | null;
          cpf?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          registro?: string | null;
          telefone?: string | null;
          tipo_registro?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      propostas: {
        Row: {
          assinatura_url: string | null;
          cliente_cidade: string | null;
          cliente_cnpj: string | null;
          cliente_nome: string;
          cliente_nome_fantasia: string | null;
          cliente_razao_social: string | null;
          cliente_responsavel: string | null;
          cliente_uf: string | null;
          condicoes: string | null;
          created_at: string;
          created_by: string | null;
          data_proposta: string;
          desconto: number;
          empresa_id: string | null;
          forma_pagamento: string | null;
          id: string;
          informacoes_complementares: string | null;
          logo_url: string | null;
          numero: number;
          objetivos_servicos: Json;
          observacao_financeira: string | null;
          observacoes: string | null;
          profissional_crea: string | null;
          profissional_nome: string;
          profissional_titulos: string;
          responsabilidades_contratada: string | null;
          responsabilidades_contratante: string | null;
          servicos: Json;
          status: Database["public"]["Enums"]["proposta_status"];
          subtotal_manual: number | null;
          texto_apresentacao: string | null;
          texto_intro: string | null;
          tipo: string;
          total_final_manual: number | null;
          total_manual: boolean;
          total_texto: string | null;
          updated_at: string;
          validade_dias: number;
        };
        Insert: {
          assinatura_url?: string | null;
          cliente_cidade?: string | null;
          cliente_cnpj?: string | null;
          cliente_nome: string;
          cliente_nome_fantasia?: string | null;
          cliente_razao_social?: string | null;
          cliente_responsavel?: string | null;
          cliente_uf?: string | null;
          condicoes?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_proposta?: string;
          desconto?: number;
          empresa_id?: string | null;
          forma_pagamento?: string | null;
          id?: string;
          informacoes_complementares?: string | null;
          logo_url?: string | null;
          numero?: number;
          objetivos_servicos?: Json;
          observacao_financeira?: string | null;
          observacoes?: string | null;
          profissional_crea?: string | null;
          profissional_nome?: string;
          profissional_titulos?: string;
          responsabilidades_contratada?: string | null;
          responsabilidades_contratante?: string | null;
          servicos?: Json;
          status?: Database["public"]["Enums"]["proposta_status"];
          subtotal_manual?: number | null;
          texto_apresentacao?: string | null;
          texto_intro?: string | null;
          tipo?: string;
          total_final_manual?: number | null;
          total_manual?: boolean;
          total_texto?: string | null;
          updated_at?: string;
          validade_dias?: number;
        };
        Update: {
          assinatura_url?: string | null;
          cliente_cidade?: string | null;
          cliente_cnpj?: string | null;
          cliente_nome?: string;
          cliente_nome_fantasia?: string | null;
          cliente_razao_social?: string | null;
          cliente_responsavel?: string | null;
          cliente_uf?: string | null;
          condicoes?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_proposta?: string;
          desconto?: number;
          empresa_id?: string | null;
          forma_pagamento?: string | null;
          id?: string;
          informacoes_complementares?: string | null;
          logo_url?: string | null;
          numero?: number;
          objetivos_servicos?: Json;
          observacao_financeira?: string | null;
          observacoes?: string | null;
          profissional_crea?: string | null;
          profissional_nome?: string;
          profissional_titulos?: string;
          responsabilidades_contratada?: string | null;
          responsabilidades_contratante?: string | null;
          servicos?: Json;
          status?: Database["public"]["Enums"]["proposta_status"];
          subtotal_manual?: number | null;
          texto_apresentacao?: string | null;
          texto_intro?: string | null;
          tipo?: string;
          total_final_manual?: number | null;
          total_manual?: boolean;
          total_texto?: string | null;
          updated_at?: string;
          validade_dias?: number;
        };
        Relationships: [];
      };
      riscos_ocupacionais: {
        Row: {
          ativo: boolean;
          avaliacoes_quantitativas: Json;
          circunstancias: string | null;
          codigo: string | null;
          created_at: string;
          created_by: string | null;
          descricao_perigo: string | null;
          descricao_risco: string | null;
          epc: string | null;
          epi: string | null;
          fontes_geradoras: string | null;
          fundamentacao_normativa: string | null;
          id: string;
          limite_tolerancia: string | null;
          medidas_controle: string | null;
          medidas_preventivas: string | null;
          metodologia_nho: string | null;
          nome: string;
          observacoes: string | null;
          possiveis_lesoes: string | null;
          recomendacoes: string | null;
          tempo_exposicao_padrao: string | null;
          tipo: Database["public"]["Enums"]["risco_tipo"];
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          avaliacoes_quantitativas?: Json;
          circunstancias?: string | null;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao_perigo?: string | null;
          descricao_risco?: string | null;
          epc?: string | null;
          epi?: string | null;
          fontes_geradoras?: string | null;
          fundamentacao_normativa?: string | null;
          id?: string;
          limite_tolerancia?: string | null;
          medidas_controle?: string | null;
          medidas_preventivas?: string | null;
          metodologia_nho?: string | null;
          nome: string;
          observacoes?: string | null;
          possiveis_lesoes?: string | null;
          recomendacoes?: string | null;
          tempo_exposicao_padrao?: string | null;
          tipo: Database["public"]["Enums"]["risco_tipo"];
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          avaliacoes_quantitativas?: Json;
          circunstancias?: string | null;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao_perigo?: string | null;
          descricao_risco?: string | null;
          epc?: string | null;
          epi?: string | null;
          fontes_geradoras?: string | null;
          fundamentacao_normativa?: string | null;
          id?: string;
          limite_tolerancia?: string | null;
          medidas_controle?: string | null;
          medidas_preventivas?: string | null;
          metodologia_nho?: string | null;
          nome?: string;
          observacoes?: string | null;
          possiveis_lesoes?: string | null;
          recomendacoes?: string | null;
          tempo_exposicao_padrao?: string | null;
          tipo?: Database["public"]["Enums"]["risco_tipo"];
          updated_at?: string;
        };
        Relationships: [];
      };
      servicos_catalogo: {
        Row: {
          ativo: boolean;
          categoria: string | null;
          created_at: string;
          created_by: string | null;
          descricao_curta: string | null;
          id: string;
          nome: string;
          objetivo: string | null;
          ordem: number;
          texto_complementar: string | null;
          updated_at: string;
          valor_padrao: number | null;
        };
        Insert: {
          ativo?: boolean;
          categoria?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao_curta?: string | null;
          id?: string;
          nome: string;
          objetivo?: string | null;
          ordem?: number;
          texto_complementar?: string | null;
          updated_at?: string;
          valor_padrao?: number | null;
        };
        Update: {
          ativo?: boolean;
          categoria?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao_curta?: string | null;
          id?: string;
          nome?: string;
          objetivo?: string | null;
          ordem?: number;
          texto_complementar?: string | null;
          updated_at?: string;
          valor_padrao?: number | null;
        };
        Relationships: [];
      };
      setores: {
        Row: {
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          empresa_id: string;
          id: string;
          nome: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          empresa_id: string;
          id?: string;
          nome: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          empresa_id?: string;
          id?: string;
          nome?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "setores_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      system_audit_log: {
        Row: {
          acao: string;
          created_at: string;
          descricao: string | null;
          empresa_id: string | null;
          entidade_id: string | null;
          entidade_tipo: string | null;
          id: string;
          ip: string | null;
          metadata: Json;
          modulo: string;
          user_id: string | null;
          user_name: string | null;
        };
        Insert: {
          acao: string;
          created_at?: string;
          descricao?: string | null;
          empresa_id?: string | null;
          entidade_id?: string | null;
          entidade_tipo?: string | null;
          id?: string;
          ip?: string | null;
          metadata?: Json;
          modulo: string;
          user_id?: string | null;
          user_name?: string | null;
        };
        Update: {
          acao?: string;
          created_at?: string;
          descricao?: string | null;
          empresa_id?: string | null;
          entidade_id?: string | null;
          entidade_tipo?: string | null;
          id?: string;
          ip?: string | null;
          metadata?: Json;
          modulo?: string;
          user_id?: string | null;
          user_name?: string | null;
        };
        Relationships: [];
      };
      tarefa_comentarios: {
        Row: {
          created_at: string;
          id: string;
          tarefa_id: string;
          texto: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          tarefa_id: string;
          texto: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          tarefa_id?: string;
          texto?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tarefa_historico: {
        Row: {
          acao: string;
          campo: string | null;
          created_at: string;
          id: string;
          tarefa_id: string;
          user_id: string | null;
          valor_antigo: string | null;
          valor_novo: string | null;
        };
        Insert: {
          acao: string;
          campo?: string | null;
          created_at?: string;
          id?: string;
          tarefa_id: string;
          user_id?: string | null;
          valor_antigo?: string | null;
          valor_novo?: string | null;
        };
        Update: {
          acao?: string;
          campo?: string | null;
          created_at?: string;
          id?: string;
          tarefa_id?: string;
          user_id?: string | null;
          valor_antigo?: string | null;
          valor_novo?: string | null;
        };
        Relationships: [];
      };
      tarefas: {
        Row: {
          concluida_em: string | null;
          concluida_por: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          empresa_id: string | null;
          id: string;
          prazo: string | null;
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"];
          responsavel_id: string | null;
          status: Database["public"]["Enums"]["tarefa_status"];
          titulo: string;
          updated_at: string;
        };
        Insert: {
          concluida_em?: string | null;
          concluida_por?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          empresa_id?: string | null;
          id?: string;
          prazo?: string | null;
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"];
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["tarefa_status"];
          titulo: string;
          updated_at?: string;
        };
        Update: {
          concluida_em?: string | null;
          concluida_por?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          empresa_id?: string | null;
          id?: string;
          prazo?: string | null;
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"];
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["tarefa_status"];
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trabalhadores: {
        Row: {
          cpf: string | null;
          created_at: string;
          created_by: string | null;
          data_admissao: string | null;
          data_nascimento: string | null;
          email: string | null;
          empresa_id: string;
          funcao: string | null;
          id: string;
          nome: string;
          observacoes: string | null;
          setor: string | null;
          sexo: string | null;
          telefone: string | null;
          updated_at: string;
        };
        Insert: {
          cpf?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_admissao?: string | null;
          data_nascimento?: string | null;
          email?: string | null;
          empresa_id: string;
          funcao?: string | null;
          id?: string;
          nome: string;
          observacoes?: string | null;
          setor?: string | null;
          sexo?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Update: {
          cpf?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_admissao?: string | null;
          data_nascimento?: string | null;
          email?: string | null;
          empresa_id?: string;
          funcao?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          setor?: string | null;
          sexo?: string | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trabalhadores_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_user_account: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      promote_to_admin: { Args: { target_user_id: string }; Returns: undefined };
      revoke_admin: { Args: { target_user_id: string }; Returns: undefined };
      set_user_profile_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"];
          target_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "engenheiro" | "viewer" | "tecnico";
      aso_tipo: "admissional" | "demissional" | "periodico" | "mudanca_risco" | "retorno_trabalho";
      documento_situacao: "em_dia" | "proximo_vencimento" | "vencido" | "pendente" | "concluido";
      documento_tipo:
        | "PGR"
        | "PGRTR"
        | "PCMSO"
        | "LTCAT"
        | "LTI"
        | "LTP"
        | "AET"
        | "AEP"
        | "PPP"
        | "OS_SST"
        | "FICHA_EPI"
        | "TREINAMENTO"
        | "S_2240"
        | "S_2220"
        | "S_2210";
      empresa_status: "ativa" | "inativa" | "suspensa" | "prospect";
      evento_status: "pendente" | "enviado" | "retificado" | "rejeitado";
      proposta_status: "rascunho" | "enviada" | "aprovada" | "recusada";
      risco_classificacao: "irrelevante" | "baixo" | "moderado" | "alto" | "critico";
      risco_tipo: "fisico" | "quimico" | "biologico" | "ergonomico" | "acidente";
      tarefa_prioridade: "baixa" | "media" | "alta" | "urgente";
      tarefa_status: "pendente" | "em_andamento" | "aguardando_cliente" | "concluido" | "cancelado";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "engenheiro", "viewer", "tecnico"],
      aso_tipo: ["admissional", "demissional", "periodico", "mudanca_risco", "retorno_trabalho"],
      documento_situacao: ["em_dia", "proximo_vencimento", "vencido", "pendente", "concluido"],
      documento_tipo: [
        "PGR",
        "PGRTR",
        "PCMSO",
        "LTCAT",
        "LTI",
        "LTP",
        "AET",
        "AEP",
        "PPP",
        "OS_SST",
        "FICHA_EPI",
        "TREINAMENTO",
        "S_2240",
        "S_2220",
        "S_2210",
      ],
      empresa_status: ["ativa", "inativa", "suspensa", "prospect"],
      evento_status: ["pendente", "enviado", "retificado", "rejeitado"],
      proposta_status: ["rascunho", "enviada", "aprovada", "recusada"],
      risco_classificacao: ["irrelevante", "baixo", "moderado", "alto", "critico"],
      risco_tipo: ["fisico", "quimico", "biologico", "ergonomico", "acidente"],
      tarefa_prioridade: ["baixa", "media", "alta", "urgente"],
      tarefa_status: ["pendente", "em_andamento", "aguardando_cliente", "concluido", "cancelado"],
    },
  },
} as const;
