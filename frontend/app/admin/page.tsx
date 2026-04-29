"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getToken, getStoredUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Users, BookOpen, BarChart2, Database } from "lucide-react";

interface AdminStats {
  total_users: number;
  total_sessoes: number;
  total_finalizadas: number;
  total_questoes: number;
  questoes_com_gabarito: number;
  questoes_sem_gabarito: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (!token || user?.role !== "admin") { router.push("/dashboard"); return; }
    api.adminStats().then((s) => setStats(s as AdminStats));
  }, [router]);

  const cards = [
    { href: "/admin/usuarios", label: "Gestão de Usuários", icon: Users, color: "bg-blue-600",
      value: stats?.total_users, sub: "usuários cadastrados" },
    { href: "/admin/questoes", label: "Banco de Questões", icon: BookOpen, color: "bg-[#003087]",
      value: stats?.total_questoes, sub: `${stats?.questoes_com_gabarito ?? 0} com gabarito` },
    { href: "/admin/disciplinas", label: "Disciplinas", icon: BarChart2, color: "bg-green-600",
      value: null, sub: "cobertura por área" },
    { href: "#", label: "Banco de Dados", icon: Database, color: "bg-gray-600",
      value: stats?.total_sessoes, sub: `${stats?.total_finalizadas ?? 0} finalizados` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Painel Administrativo</h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <Link key={c.href} href={c.href}
              className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon size={20} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">{c.label}</p>
                {c.value !== null && c.value !== undefined && (
                  <p className="text-2xl font-bold text-gray-800 mt-1">{c.value}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {stats && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-700 mb-4">Cobertura do banco de questões</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="bg-green-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.total_questoes > 0 ? Math.round(stats.questoes_com_gabarito / stats.total_questoes * 100) : 0}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {stats.questoes_com_gabarito}/{stats.total_questoes} com gabarito
                ({stats.total_questoes > 0 ? Math.round(stats.questoes_com_gabarito / stats.total_questoes * 100) : 0}%)
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {stats.questoes_sem_gabarito} questões aguardando gabarito. Adicione pelo banco de questões.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
