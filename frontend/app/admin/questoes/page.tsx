"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken, getStoredUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Search, ChevronLeft, ChevronRight, Pencil, X, Check } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const DISCIPLINES = [
  "", "Ética Profissional", "Direito Civil", "Direito Processual Civil",
  "Direito Constitucional", "Direito Penal", "Direito Processual Penal",
  "Direito Administrativo", "Direito do Trabalho", "Direito Processual do Trabalho",
  "Direito Tributário", "Direito Empresarial", "Direitos Humanos", "Direito Internacional",
  "Direito Ambiental", "Direito do Consumidor", "Direito da Criança e do Adolescente (ECA)",
  "Filosofia do Direito", "Direito Previdenciário", "Direito Financeiro e Orçamentário",
  "Direito Eleitoral", "Não classificada",
];

interface Questao {
  id: string;
  disciplina: string;
  assunto: string;
  enunciado: string;
  alternativas: Record<string, string>;
  gabarito: string | null;
  status: string;
  grau_dificuldade: string;
  tem_gabarito: boolean;
  taxa_acerto: number;
  total_respostas: number;
  gabarito_comentado: string | null;
  video_url: string | null;
}

function EditModal({ questao, onClose, onSave }: { questao: Questao; onClose: () => void; onSave: () => void }) {
  const [gabarito, setGabarito] = useState(questao.gabarito ?? "");
  const [comentado, setComentado] = useState(questao.gabarito_comentado ?? "");
  const [videoUrl, setVideoUrl] = useState(questao.video_url ?? "");
  const [disciplina, setDisciplina] = useState(questao.disciplina);
  const [status, setStatus] = useState(questao.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.adminUpdateQuestao(questao.id, {
        gabarito: gabarito || null,
        gabarito_comentado: comentado || null,
        video_url: videoUrl || null,
        disciplina,
        status,
      });
      onSave();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-gray-800">Editar Questão</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Enunciado (primeiros 200 chars)</p>
            <p className="text-sm text-gray-700">{questao.enunciado.slice(0, 200)}{questao.enunciado.length > 200 ? "…" : ""}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
              <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
                {DISCIPLINES.filter(Boolean).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gabarito</label>
              <select value={gabarito} onChange={(e) => setGabarito(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
                <option value="">Não definido</option>
                {["A", "B", "C", "D"].map((a) => <option key={a} value={a}>{a} - {questao.alternativas[a]?.slice(0, 40) ?? ""}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
              <option value="VÁLIDA">VÁLIDA</option>
              <option value="ANULADA">ANULADA</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gabarito Comentado</label>
            <textarea value={comentado} onChange={(e) => setComentado(e.target.value)} rows={5}
              placeholder="Explicação da resposta correta..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087] resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL do Vídeo Explicativo</label>
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 p-6 border-t">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 bg-[#003087] text-white py-2.5 rounded-lg hover:bg-[#002070] disabled:opacity-60 font-medium">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuestoesAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<Questao[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterDisc, setFilterDisc] = useState("");
  const [filterGab, setFilterGab] = useState<"" | "true" | "false">("");
  const [editing, setEditing] = useState<Questao | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (!token || user?.role !== "admin") { router.push("/dashboard"); return; }
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = { page, size: 20 };
      if (filterDisc) params.disciplina = filterDisc;
      if (filterGab !== "") params.tem_gabarito = filterGab === "true";
      if (search) params.q = search;
      const data = await api.adminQuestoes(params);
      setItems(data.items as Questao[]);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, filterDisc, filterGab, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">Banco de Questões</h1>
          <span className="text-gray-400 text-sm ml-2">{total} questões</span>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar no enunciado..."
              className="flex-1 text-sm border-0 outline-none" />
          </div>
          <select value={filterDisc} onChange={(e) => { setFilterDisc(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
            {DISCIPLINES.map((d) => <option key={d} value={d}>{d || "Todas as disciplinas"}</option>)}
          </select>
          <select value={filterGab} onChange={(e) => { setFilterGab(e.target.value as "" | "true" | "false"); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]">
            <option value="">Com e sem gabarito</option>
            <option value="true">Com gabarito</option>
            <option value="false">Sem gabarito</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">Carregando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Enunciado</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Disciplina</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Gabarito</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Acerto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr key={q.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-700 line-clamp-2 text-xs">{q.enunciado}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{q.disciplina}</td>
                    <td className="px-4 py-3 text-center">
                      {q.gabarito
                        ? <span className="inline-flex items-center gap-1 text-green-700 font-bold text-sm">
                            <Check size={14} />{q.gabarito}
                          </span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx("text-xs px-2 py-0.5 rounded-full",
                        q.status === "VÁLIDA" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {q.total_respostas > 0
                        ? `${Math.round((q.taxa_acerto ?? 0) * 100)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditing(q)} className="text-gray-400 hover:text-[#003087]">
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Página {page} de {totalPages} ({total} questões)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft size={15} /> Anterior
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
                Próxima <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </main>

      {editing && <EditModal questao={editing} onClose={() => setEditing(null)} onSave={load} />}
    </div>
  );
}
