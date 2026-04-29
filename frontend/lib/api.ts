const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Erro desconhecido");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; user: import("./types").User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<import("./types").User>("/api/auth/me"),

  // Simulado
  novoSimulado: (duracao_limite = 7200) =>
    request<import("./types").Sessao>("/api/simulado/novo", {
      method: "POST",
      body: JSON.stringify({ duracao_limite }),
    }),
  getSimulado: (id: string) => request<import("./types").Sessao>(`/api/simulado/${id}`),
  responder: (id: string, questao_id: string, resposta: string) =>
    request(`/api/simulado/${id}/responder`, {
      method: "PUT",
      body: JSON.stringify({ questao_id, resposta }),
    }),
  finalizar: (id: string) =>
    request<import("./types").Sessao>(`/api/simulado/${id}/finalizar`, { method: "POST" }),
  listarSessoes: () => request<import("./types").SessaoResumo[]>("/api/simulado/"),

  // Dashboard
  dashboardStats: () => request<import("./types").DashboardStats>("/api/dashboard/stats"),

  // Questões detalhes
  detalhesQuestao: (id: string) =>
    request<import("./types").QuestaoDetalhes>(`/api/questoes/${id}/detalhes`),
  comentarios: (id: string) =>
    request<import("./types").Comentario[]>(`/api/questoes/${id}/comentarios`),
  addComentario: (id: string, texto: string) =>
    request(`/api/questoes/${id}/comentarios`, {
      method: "POST",
      body: JSON.stringify({ texto }),
    }),
  historicoQuestao: (id: string) =>
    request<import("./types").HistoricoItem[]>(`/api/questoes/${id}/historico`),

  // Admin
  adminStats: () => request("/api/admin/stats"),
  adminUsers: () => request<import("./types").User[]>("/api/admin/usuarios"),
  adminCreateUser: (data: object) =>
    request<import("./types").User>("/api/admin/usuarios", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  adminUpdateUser: (id: string, data: object) =>
    request<import("./types").User>(`/api/admin/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  adminDeleteUser: (id: string) =>
    request(`/api/admin/usuarios/${id}`, { method: "DELETE" }),

  adminQuestoes: (params: Record<string, string | number | boolean | undefined>) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ total: number; page: number; size: number; items: object[] }>(
      `/api/admin/questoes?${qs}`
    );
  },
  adminUpdateQuestao: (id: string, data: object) =>
    request(`/api/admin/questoes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  adminDisciplinas: () => request<object[]>("/api/admin/disciplinas"),
};
