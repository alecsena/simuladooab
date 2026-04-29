"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken, getStoredUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { User } from "@/lib/types";
import { Plus, Pencil, Trash2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

type Mode = "list" | "create" | "edit";

const EMPTY_FORM = { name: "", email: "", password: "", role: "user" };

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [mode, setMode] = useState<Mode>("list");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (!token || user?.role !== "admin") { router.push("/dashboard"); return; }
    load();
  }, [router]);

  async function load() {
    const data = await api.adminUsers();
    setUsers(data);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setError("");
    setMode("create");
  }

  function openEdit(u: User) {
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setEditId(u.id);
    setError("");
    setMode("edit");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (mode === "create") {
        await api.adminCreateUser(form);
      } else if (editId) {
        const payload: Record<string, string> = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await api.adminUpdateUser(editId, payload);
      }
      await load();
      setMode("list");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este usuário?")) return;
    await api.adminDeleteUser(id);
    await load();
  }

  async function toggleActive(u: User) {
    await api.adminUpdateUser(u.id, { is_active: !u.is_active });
    await load();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h1>
        </div>

        {mode === "list" ? (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={openCreate}
                className="flex items-center gap-2 bg-[#003087] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#002070]">
                <Plus size={16} /> Novo Usuário
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">E-mail</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Perfil</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Criado em</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={clsx("text-xs px-2 py-1 rounded-full font-medium",
                          u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600")}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(u)}
                          className={clsx("text-xs px-2 py-1 rounded-full font-medium cursor-pointer",
                            u.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200")}>
                          {u.is_active ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-[#003087]">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(u.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="max-w-md bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {mode === "create" ? "Novo Usuário" : "Editar Usuário"}
            </h2>
            <div className="space-y-4">
              {["name", "email"].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field === "name" ? "Nome" : "E-mail"}</label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {mode === "edit" && <span className="text-gray-400">(deixe vazio para não alterar)</span>}
                </label>
                <input type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003087]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003087]">
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setMode("list")}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-[#003087] text-white py-2.5 rounded-lg hover:bg-[#002070] disabled:opacity-60 font-medium">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
