"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getToken, getStoredUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { DashboardStats, SessaoResumo } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Trophy, TrendingUp, TrendingDown, Minus, Play, AlertCircle, BookOpen } from "lucide-react";
import clsx from "clsx";

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number | null; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value ?? "—"}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function formatTime(s: number | undefined) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessoes, setSessoes] = useState<SessaoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [startModal, setStartModal] = useState(false);
  const [duracao, setDuracao] = useState(120);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([api.dashboardStats(), api.listarSessoes()]).then(([s, ses]) => {
      setStats(s);
      setSessoes(ses);
    }).finally(() => setLoading(false));
  }, [router]);

  const inProgress = sessoes.find((s) => s.status === "em_andamento");

  async function startSimulado() {
    setStarting(true);
    setError("");
    try {
      const sessao = await api.novoSimulado(duracao * 60);
      router.push(`/simulado/${sessao.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar");
      setStarting(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Alert for in-progress exam */}
        {inProgress && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-600" />
              <span className="text-amber-800 font-medium">Você tem um simulado em andamento</span>
            </div>
            <Link href={`/simulado/${inProgress.id}`}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Continuar
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          {!inProgress && (
            <button onClick={() => setStartModal(true)}
              className="bg-[#003087] hover:bg-[#002070] text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2">
              <Play size={16} />
              Novo Simulado
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Simulados realizados" value={stats?.total_simulados ?? 0}
            icon={Trophy} color="bg-[#003087]" />
          <StatCard label="Nota média" value={stats?.nota_media !== null ? `${stats?.nota_media}/${stats?.total_medio}` : null}
            icon={Minus} color="bg-blue-500" />
          <StatCard label="Nota máxima" value={stats?.nota_maxima !== null ? `${stats?.nota_maxima}` : null}
            icon={TrendingUp} color="bg-green-500" />
          <StatCard label="Nota mínima" value={stats?.nota_minima !== null ? `${stats?.nota_minima}` : null}
            icon={TrendingDown} color="bg-red-500" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Evolution chart */}
          {stats && stats.evolucao.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-4">Evolução por Simulado</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="sessao" label={{ value: "Simulado", position: "insideBottom", offset: -2 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="pct" stroke="#003087" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Discipline table */}
          {stats && stats.por_disciplina.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-4">Desempenho por Disciplina</h2>
              <div className="overflow-y-auto max-h-60 scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase border-b">
                      <th className="pb-2 text-left">Disciplina</th>
                      <th className="pb-2 text-right">Acertos</th>
                      <th className="pb-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.por_disciplina.map((d) => (
                      <tr key={d.disciplina} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 pr-2 text-gray-700">{d.disciplina}</td>
                        <td className="py-1.5 text-right text-gray-500">{d.acertos}/{d.total}</td>
                        <td className="py-1.5 text-right">
                          <span className={clsx("font-medium",
                            d.taxa_acerto >= 60 ? "text-green-600" :
                            d.taxa_acerto >= 40 ? "text-amber-600" : "text-red-600")}>
                            {d.taxa_acerto}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Zero acertos highlight */}
              {stats.por_disciplina.filter((d) => d.taxa_acerto === 0).length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-700 font-medium">⚠ Zero acertos em:</p>
                  <p className="text-xs text-red-600 mt-1">
                    {stats.por_disciplina.filter((d) => d.taxa_acerto === 0).map((d) => d.disciplina).join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent sessions */}
        {sessoes.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Histórico de Simulados</h2>
            <div className="space-y-2">
              {sessoes.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={clsx("w-2 h-2 rounded-full",
                      s.status === "em_andamento" ? "bg-amber-400" : "bg-green-400")} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {new Date(s.started_at).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.status === "finalizado"
                          ? `${formatTime(s.tempo_gasto)} · ${s.score}/${s.total} questões`
                          : "Em andamento"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.status === "finalizado" && s.score != null && s.total && (
                      <span className={clsx("text-lg font-bold",
                        (s.score / s.total) >= 0.6 ? "text-green-600" : "text-red-600")}>
                        {Math.round((s.score / s.total) * 100)}%
                      </span>
                    )}
                    <Link href={s.status === "finalizado" ? `/revisao/${s.id}` : `/simulado/${s.id}`}
                      className="text-xs bg-[#003087] text-white px-3 py-1.5 rounded-lg hover:bg-[#002070]">
                      {s.status === "finalizado" ? "Ver revisão" : "Continuar"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats?.total_simulados === 0 && (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30 text-gray-300" />
            <p className="text-lg">Nenhum simulado realizado ainda.</p>
            <p className="text-sm mt-1">Clique em &quot;Novo Simulado&quot; para começar.</p>
          </div>
        )}
      </main>

      {/* Start modal */}
      {startModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Configurar Simulado</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tempo da prova (minutos)
              </label>
              <input
                type="number"
                min={30} max={300}
                value={duracao}
                onChange={(e) => setDuracao(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#003087]"
              />
              <p className="text-xs text-gray-400 mt-1">Padrão OAB: 300 min (5h). Recomendado para treino: 120 min.</p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              O simulado terá <strong>80 questões</strong> distribuídas conforme o Exame de Ordem.
            </p>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStartModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={startSimulado} disabled={starting}
                className="flex-1 bg-[#003087] text-white py-2.5 rounded-lg hover:bg-[#002070] disabled:opacity-60 font-medium">
                {starting ? "Iniciando..." : "Iniciar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

