import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Users } from 'lucide-react';
import * as api from '../services/apiService';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    api.fetchAdminUsers().then(setUsers).catch(console.error);
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

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8">
      <div className="max-w-4xl mx-auto">
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
        
        <div className="bg-[#1e293b] rounded-3xl p-6 border border-slate-700 shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-widest">
                <th className="py-4">ID</th>
                <th className="py-4">Nombre</th>
                <th className="py-4">Email</th>
                <th className="py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-4 font-mono text-slate-500">{u.id}</td>
                  <td className="py-4 font-bold">{u.name}</td>
                  <td className="py-4 text-slate-300">{u.email}</td>
                  <td className="py-4 text-right">
                    <button onClick={() => handleDelete(u.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center text-slate-500 py-8">No hay usuarios</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
