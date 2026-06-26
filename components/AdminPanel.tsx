import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Users, ShieldOff, Clock, Infinity } from 'lucide-react';
import * as api from '../services/apiService';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    api.checkAdminAccess()
      .then(({ isAdmin }) => {
        setIsAdmin(isAdmin);
        if (isAdmin) api.fetchAdminUsers().then(setUsers).catch(console.error);
      })
      .catch(() => setIsAdmin(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm('¿Seguro que deseas eliminar este usuario? Esa acción no se puede deshacer.')) {
      try {
        await api.deleteAdminUser(id);
        setUsers(users.filter(u => u.id !== id));
        setMessage({ type: 'success', text: 'Usuario eliminado correctamente.' });
      } catch (e: any) {
        setMessage({ type: 'error', text: 'Error: ' + e.message });
      }
    }
  };

  const handleExtend = async (id: number, days: number | null) => {
    try {
      const result = await api.extendUserAccess(id, days);
      setUsers(users.map(u => u.id === id ? { ...u, expires_at: result.expires_at } : u));
      setMessage({ type: 'success', text: days ? `Acceso extendido ${days} días.` : 'Acceso permanente activado.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Error: ' + e.message });
    }
  };

  const expiryStatus = (expires_at: string | null) => {
    if (!expires_at) return { label: 'Permanente', color: 'text-emerald-400' };
    const exp = new Date(expires_at);
    const now = new Date();
    if (exp < now) return { label: 'Expirado', color: 'text-rose-400' };
    const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { label: `${days}d restantes`, color: days <= 5 ? 'text-amber-400' : 'text-blue-400' };
  };

  if (isAdmin === null) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Verificando acceso...</div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white gap-4">
      <ShieldOff size={48} className="text-rose-500" />
      <h2 className="text-xl font-bold">Acceso denegado</h2>
      <p className="text-gray-400 text-sm">No tenés permisos para ver esta sección.</p>
      <button onClick={() => window.location.href = '/'} className="mt-2 px-4 py-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition text-sm">
        Volver al inicio
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => window.location.href = '/'} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-black flex items-center gap-3"><Users className="text-indigo-500" /> Panel de Administración</h1>
        </div>

        {message && (
          <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-[#1e293b] rounded-3xl p-6 border border-slate-700 shadow-2xl overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-widest">
                <th className="py-4 pr-4">Nombre</th>
                <th className="py-4 pr-4">Email</th>
                <th className="py-4 pr-4">Trial</th>
                <th className="py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const status = expiryStatus(u.expires_at);
                return (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="py-4 pr-4 font-bold">{u.name}</td>
                    <td className="py-4 pr-4 text-slate-300 text-sm">{u.email}</td>
                    <td className={`py-4 pr-4 text-sm font-semibold ${status.color}`}>{status.label}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleExtend(u.id, 30)} title="Extender 30 días"
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition text-xs font-bold flex items-center gap-1">
                          <Clock size={14} /> +30d
                        </button>
                        <button onClick={() => handleExtend(u.id, null)} title="Acceso permanente"
                          className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition">
                          <Infinity size={14} />
                        </button>
                        <button onClick={() => handleDelete(u.id)} title="Eliminar usuario"
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center text-slate-500 py-8">No hay usuarios</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
