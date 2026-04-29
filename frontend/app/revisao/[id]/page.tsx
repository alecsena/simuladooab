"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Sessao, QuestaoSessao, QuestaoDetalhes, Comentario, HistoricoItem } from "@/lib/types";
import QuestionNavigator from "@/components/QuestionNavigator";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import clsx from "clsx";

const ALTS = ["A", "B", "C", "D"] as const;

type Tab = "gabarito" | "comentarios" | "estatistica" | "historico" | "video";

function altClass(alt: string, q: QuestaoSessao) {
  const isGabarito = q.gabarito === alt;
  const isUser = q.resposta_usuario === alt;
  if (isGabarito && isUser) return "border-green-500 bg-green-50"; // correct
  if (isGabarito) return "border-green-500 bg-green-50"; // correct answer (user was wrong)
  if (isUser) return "border-red-400 bg-red-50"; // user's wrong answer
  return "border-gray-200";
}

function altLetterClass(alt: string, q: QuestaoSessao) {
  const isGabarito = q.gabarito === alt;
  const isUser = q.resposta_usuario === alt;
  if (isGabarito && isUser) return "bg-green-500 text-white";
  if (isGabarito) return "bg-green-500 text-white";
  if (isUser) return "bg-red-400 text-white";
  return "bg-gray-100 text-gray-600";
}

function DetailsPanel({ questaoId }: { questaoId: string }) {
  const [tab, setTab] = useState<Tab>("gabarito");
  const [detalhes, setDetalhes] = useState<QuestaoDetalhes | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.detalhesQuestao(questaoId).then(setDetalhes).catch(() => {});
  }, [questaoId]);

  useEffect(() => {
    if (tab === "comentarios") api.comentarios(questaoId).then(setComentarios).catch(() => {});
    if (tab === "historico") api.historicoQuestao(questaoId).then(setHistorico).catch(() => {});
  }, [tab, questaoId]);

  async function submitComentario() {
    if (!novoComentario.trim()) return;
    setSubmitting(true);
    try {
      await api.addComentario(questaoId, novoComentario);
      setNovoComentario("");
      const updated = await api.comentarios(questaoId);
      setComentarios(updated);
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "gabarito", label: "Gabarito Comentado" },
    { id: "comentarios", label: "Comentários" },
    { id: "estatistica", label: "Estatística" },
    { id: "historico", label: "Histórico" },
    { id: "video", label: "Vídeo" },
  ];

  return (
    <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx("px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors",
              tab === t.id ? "border-b-2 border-[#003087] text-[#003087] bg-white" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 bg-white">
        {tab === "gabarito" && (
          detalhes?.gabarito_comentado
            ? <div className="text-sm text-gray-700 leading-relaxed prose max-w-none"
                dangerouslySetInnerHTML={{ __html: detalhes.gabarito_comentado }} />
            : <p className="text-gray-400 text-sm italic">Gabarito comentado não disponível para esta questão.</p>
        )}

        {tab === "comentarios" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitComentario()}
                placeholder="Adicione um comentário..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              <button onClick={submitComentario} disabled={submitting}
                className="bg-[#003087] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
                Enviar
              </button>
            </div>
            {comentarios.length === 0
              ? <p className="text-gray-400 text-sm italic">Nenhum comentário ainda.</p>
              : comentarios.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{c.user_name}</span>
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.texto}</p>
                </div>
              ))}
          </div>
        )}

        {tab === "estatistica" && detalhes && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Taxa de acerto</p>
                <p className={clsx("text-2xl font-bold",
                  (detalhes.taxa_acerto ?? 0) >= 60 ? "text-green-600" :
                  (detalhes.taxa_acerto ?? 0) >= 40 ? "text-amber-600" : "text-red-600")}>
                  {detalhes.taxa_acerto !== null ? `${Math.round((detalhes.taxa_acerto ?? 0) * 100)}%` : "—"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Total de respostas</p>
                <p className="text-2xl font-bold text-gray-700">{detalhes.total_respostas}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Distribuição de respostas</p>
              {ALTS.map((alt) => {
                const count = detalhes.respostas_por_alternativa[alt] ?? 0;
                const total = detalhes.total_respostas || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={alt} className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 text-xs font-bold text-gray-600">{alt}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-[#003087] h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400">Dificuldade: <strong>{detalhes.grau_dificuldade}</strong></p>
          </div>
        )}

        {tab === "historico" && (
          historico.length === 0
            ? <p className="text-gray-400 text-sm italic">Nenhum histórico para esta questão.</p>
            : <div className="space-y-2">
              {historico.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="text-sm text-gray-600">{new Date(h.data).toLocaleDateString("pt-BR")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Marcou: <strong>{h.resposta_usuario ?? "—"}</strong></span>
                    {h.correta === true && <CheckCircle size={16} className="text-green-500" />}
                    {h.correta === false && <XCircle size={16} className="text-red-500" />}
                    {h.correta === null && <MinusCircle size={16} className="text-gray-400" />}
                  </div>
                </div>
              ))}
            </div>
        )}

        {tab === "video" && (
          detalhes?.video_url
            ? <div className="aspect-video rounded-lg overflow-hidden">
                <iframe src={detalhes.video_url} className="w-full h-full" allowFullScreen />
              </div>
            : <p className="text-gray-400 text-sm italic">Vídeo explicativo não disponível para esta questão.</p>
        )}
      </div>
    </div>
  );
}

export default function RevisaoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [current, setCurrent] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.getSimulado(id).then(setSessao).catch(() => router.push("/dashboard")).finally(() => setLoading(false));
  }, [id, router]);

  const questao = sessao?.questoes.find((q) => q.numero === current);

  const answered = new Set(
    sessao?.questoes.filter((q) => q.resposta_usuario).map((q) => q.numero) ?? []
  );

  const correctSet = new Set(
    sessao?.questoes.filter((q) => q.correta).map((q) => q.numero) ?? []
  );

  if (loading || !sessao) {
    return <div className="flex items-center justify-center min-h-screen">Carregando revisão...</div>;
  }

  const score = sessao.score ?? 0;
  const total = sessao.total ?? sessao.questoes.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-[#003087] text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg hidden sm:block">Revisão do Simulado</span>
          <div className="flex items-center gap-4">
            <div className={clsx("px-4 py-1.5 rounded-lg font-bold text-sm",
              pct >= 60 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500")}>
              {score}/{total} ({pct}%)
            </div>
            <Link href="/dashboard"
              className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg">
              Voltar
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex gap-6">
        {/* Navigator sidebar - with color for correct/wrong */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="sticky top-20">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Questões</p>
              <div className="grid grid-cols-5 gap-1.5">
                {sessao.questoes.map((q) => (
                  <button key={q.numero} onClick={() => { setCurrent(q.numero); setShowDetails(false); }}
                    className={clsx("w-8 h-8 rounded text-xs font-medium transition-colors",
                      q.numero === current ? "ring-2 ring-[#003087] ring-offset-1" : "",
                      q.correta === true ? "bg-green-500 text-white hover:bg-green-600" :
                      q.correta === false ? "bg-red-400 text-white hover:bg-red-500" :
                      "bg-gray-200 text-gray-500")}>
                    {q.numero}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded inline-block" />Acerto</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded inline-block" />Erro</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 rounded inline-block" />Não respondida</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {questao ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#C9A24A]">
                    {questao.disciplina}
                  </span>
                  <h2 className="text-sm font-bold text-gray-400 mt-0.5">
                    Questão {questao.numero} de {sessao.questoes.length}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {questao.correta === true && (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CheckCircle size={18} /> Correta
                    </span>
                  )}
                  {questao.correta === false && (
                    <span className="flex items-center gap-1 text-red-500 text-sm font-medium">
                      <XCircle size={18} /> Errada
                    </span>
                  )}
                  {questao.correta === null && !questao.resposta_usuario && (
                    <span className="flex items-center gap-1 text-gray-400 text-sm">
                      <MinusCircle size={18} /> Não respondida
                    </span>
                  )}
                </div>
              </div>

              <p className="text-gray-800 text-base leading-relaxed mb-6">{questao.enunciado}</p>

              <div className="space-y-3">
                {ALTS.map((alt) => {
                  const text = questao.alternativas[alt];
                  if (!text) return null;
                  const isGabarito = questao.gabarito === alt;
                  const isUser = questao.resposta_usuario === alt;
                  return (
                    <div key={alt}
                      className={clsx("flex items-start gap-3 p-4 rounded-lg border-2", altClass(alt, questao))}>
                      <span className={clsx("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                        altLetterClass(alt, questao))}>
                        {alt}
                      </span>
                      <span className="text-gray-700 text-sm leading-relaxed flex-1">{text}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {isGabarito && !isUser && (
                          <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded">Correta</span>
                        )}
                        {isGabarito && isUser && (
                          <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded">✓ Sua resp.</span>
                        )}
                        {!isGabarito && isUser && (
                          <span className="text-xs text-red-600 font-medium bg-red-100 px-2 py-0.5 rounded">✗ Sua resp.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Details toggle */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setShowDetails((v) => !v)}
                  className="text-sm font-medium text-[#003087] hover:text-[#002070] underline-offset-2 hover:underline">
                  {showDetails ? "Ocultar Detalhes" : "Mostrar Detalhes"}
                </button>
                {showDetails && <DetailsPanel questaoId={questao.questao_id} />}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-4">
                <button onClick={() => { setCurrent((c) => Math.max(1, c - 1)); setShowDetails(false); }}
                  disabled={current === 1}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft size={16} /> Anterior
                </button>
                <button onClick={() => { setCurrent((c) => Math.min(sessao.questoes.length, c + 1)); setShowDetails(false); }}
                  disabled={current === sessao.questoes.length}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">Questão não encontrada</div>
          )}
        </main>
      </div>
    </div>
  );
}
