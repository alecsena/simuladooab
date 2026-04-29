"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Sessao, QuestaoSessao } from "@/lib/types";
import Timer from "@/components/Timer";
import QuestionNavigator from "@/components/QuestionNavigator";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import clsx from "clsx";

const ALTS = ["A", "B", "C", "D"] as const;

export default function SimuladoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [current, setCurrent] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.getSimulado(id).then((s) => {
      if (s.status === "finalizado") { router.replace(`/revisao/${id}`); return; }
      setSessao(s);
    }).catch(() => router.push("/dashboard")).finally(() => setLoading(false));
  }, [id, router]);

  const questao: QuestaoSessao | undefined = sessao?.questoes.find((q) => q.numero === current);

  const answered = new Set(
    sessao?.questoes.filter((q) => q.resposta_usuario).map((q) => q.numero) ?? []
  );

  const handleAnswer = useCallback(async (alt: string) => {
    if (!questao || saving || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    setSessao((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questoes: prev.questoes.map((q) =>
          q.questao_id === questao.questao_id ? { ...q, resposta_usuario: alt } : q
        ),
      };
    });

    try {
      await api.responder(id, questao.questao_id, alt);
    } catch { /* ignore network errors */ }
    finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [questao, saving, id]);

  const handleFinish = useCallback(async () => {
    setFinishing(true);
    try {
      await api.finalizar(id);
      router.push(`/revisao/${id}`);
    } catch {
      setFinishing(false);
    }
  }, [id, router]);

  const handleTimerExpired = useCallback(() => {
    handleFinish();
  }, [handleFinish]);

  if (loading || !sessao) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Carregando simulado...</div>;
  }

  const total = sessao.questoes.length;
  const answeredCount = answered.size;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-[#003087] text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg hidden sm:block">OAB Simulado</span>
            <span className="text-white/70 text-sm">{answeredCount}/{total} respondidas</span>
          </div>
          <div className="flex items-center gap-3">
            <Timer
              startedAt={sessao.started_at}
              duracaoLimite={sessao.duracao_limite}
              onExpired={handleTimerExpired}
            />
            <button
              onClick={() => setConfirmFinish(true)}
              disabled={finishing}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Flag size={15} />
              Finalizar Prova
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex gap-6">
        {/* Question navigator sidebar */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="sticky top-20">
            <QuestionNavigator
              total={total}
              current={current}
              answered={answered}
              onSelect={setCurrent}
            />
          </div>
        </aside>

        {/* Question */}
        <main className="flex-1 min-w-0">
          {questao ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#C9A24A]">
                    {questao.disciplina}
                  </span>
                  <h2 className="text-sm font-bold text-gray-400 mt-0.5">
                    Questão {questao.numero} de {total}
                  </h2>
                </div>
              </div>

              <p className="text-gray-800 text-base leading-relaxed mb-6">{questao.enunciado}</p>

              <div className="space-y-3">
                {ALTS.map((alt) => {
                  const text = questao.alternativas[alt];
                  if (!text) return null;
                  const selected = questao.resposta_usuario === alt;
                  return (
                    <button
                      key={alt}
                      onClick={() => handleAnswer(alt)}
                      className={clsx(
                        "w-full text-left flex items-start gap-3 p-4 rounded-lg border-2 transition-all",
                        selected
                          ? "border-[#003087] bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <span className={clsx(
                        "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                        selected ? "bg-[#003087] text-white" : "bg-gray-100 text-gray-600"
                      )}>
                        {alt}
                      </span>
                      <span className="text-gray-700 text-sm leading-relaxed">{text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setCurrent((c) => Math.max(1, c - 1))}
                  disabled={current === 1}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>

                {/* Mobile navigator */}
                <div className="flex gap-1 lg:hidden overflow-x-auto max-w-xs">
                  {sessao.questoes.slice(Math.max(0, current - 3), current + 2).map((q) => (
                    <button key={q.numero} onClick={() => setCurrent(q.numero)}
                      className={clsx("w-8 h-8 rounded text-xs font-medium flex-shrink-0",
                        q.numero === current ? "bg-[#003087] text-white" :
                        q.resposta_usuario ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600")}>
                      {q.numero}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrent((c) => Math.min(total, c + 1))}
                  disabled={current === total}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">Questão não encontrada</div>
          )}
        </main>
      </div>

      {/* Confirm finish modal */}
      {confirmFinish && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Finalizar prova?</h2>
            <p className="text-gray-600 text-sm mb-2">
              Você respondeu <strong>{answeredCount}</strong> de <strong>{total}</strong> questões.
            </p>
            {answeredCount < total && (
              <p className="text-amber-600 text-sm mb-4">
                ⚠ Ainda há {total - answeredCount} questões sem resposta.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setConfirmFinish(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50">
                Continuar
              </button>
              <button onClick={() => { setConfirmFinish(false); handleFinish(); }}
                disabled={finishing}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-60 font-medium">
                {finishing ? "Finalizando..." : "Finalizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
