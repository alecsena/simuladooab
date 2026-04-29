export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
}

export interface Alternativas {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface QuestaoSessao {
  questao_id: string;
  numero: number;
  disciplina: string;
  enunciado: string;
  alternativas: Alternativas;
  gabarito?: string;
  resposta_usuario?: string;
  correta?: boolean;
}

export interface Sessao {
  id: string;
  user_id: string;
  status: "em_andamento" | "finalizado";
  started_at: string;
  finished_at?: string;
  duracao_limite: number;
  tempo_gasto?: number;
  questoes: QuestaoSessao[];
  score?: number;
  total?: number;
  por_disciplina?: Record<string, { acertos: number; total: number; erros: number }>;
}

export interface SessaoResumo {
  id: string;
  started_at: string;
  finished_at?: string;
  status: string;
  score?: number;
  total?: number;
  duracao_limite: number;
  tempo_gasto?: number;
}

export interface DashboardStats {
  total_simulados: number;
  nota_media: number | null;
  nota_maxima: number | null;
  nota_minima: number | null;
  total_medio: number | null;
  por_disciplina: DisciplinaStats[];
  evolucao: EvolucaoItem[];
}

export interface DisciplinaStats {
  disciplina: string;
  acertos: number;
  total: number;
  taxa_acerto: number;
  required_per_exam: number;
}

export interface EvolucaoItem {
  sessao: number;
  score: number;
  total: number;
  pct: number;
  data: string;
}

export interface QuestaoDetalhes {
  id: string;
  gabarito_comentado: string | null;
  video_url: string | null;
  grau_dificuldade: string;
  taxa_acerto: number | null;
  total_respostas: number;
  respostas_por_alternativa: Record<string, number>;
  vezes_apareceu: number;
}

export interface Comentario {
  id: string;
  user_name: string;
  texto: string;
  created_at: string;
}

export interface HistoricoItem {
  data: string;
  resposta_usuario: string | null;
  correta: boolean | null;
}
