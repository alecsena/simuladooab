"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken, getStoredUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import clsx from "clsx";

interface DisciplinaRow {
  disciplina: string;
  total: number;
  com_gabarito: number;
  sem_gabarito: number;
  validas: number;
  taxa_acerto_media: number | null;
  required_per_exam: number;
}

export default function DisciplinasPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DisciplinaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (!token || user?.role !== "admin") { router.push("/dashboard"); return; }
    api.adminDisciplinas().then((d) => setRows(d as DisciplinaRow[])).finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">Disciplinas</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">Carregando...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Disciplina</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Total</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">c/ Gabarito</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Req./Prova</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Provas s/ repetir</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Taxa acerto média</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const provasSemRepetir = r.required_per_exam > 0
                    ? Math.floor(r.com_gabarito / r.required_per_exam) : null;
                  const alert = r.required_per_exam > 0 && r.com_gabarito < r.required_per_exam;
                  return (
                    <tr key={r.disciplina} className={clsx("border-b hover:bg-gray-50", alert && "bg-red-50")}>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {alert && <span className="mr-1 text-red-500">⚠</span>}
                        {r.disciplina}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.total}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx("font-medium", r.com_gabarito > 0 ? "text-green-600" : "text-gray-300")}>
                          {r.com_gabarito}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{r.required_per_exam || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {provasSemRepetir !== null ? (
                          <span className={clsx("font-medium",
                            provasSemRepetir === 0 ? "text-red-600" :
                            provasSemRepetir < 3 ? "text-amber-600" : "text-green-600")}>
                            {provasSemRepetir}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.taxa_acerto_media !== null ? (
                          <span className={clsx("font-medium",
                            r.taxa_acerto_media >= 60 ? "text-green-600" :
                            r.taxa_acerto_media >= 40 ? "text-amber-600" : "text-red-600")}>
                            {r.taxa_acerto_media}%
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
