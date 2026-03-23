import React from 'react';
import { Trash2, AlertCircle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  type: 'month' | 'expense';
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ type, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md" onClick={onCancel}></div>
      <div className={`border border-white/10 w-full max-w-sm rounded-[32px] shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden text-center p-8 ${type === 'month' ? 'bg-[#1e293b]' : 'bg-slate-900 border-slate-800'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border ${type === 'month' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
              {type === 'month' ? <Trash2 size={32} /> : <AlertCircle size={32} />}
          </div>
          <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">{type === 'month' ? '¿Borrar grupo?' : '¿Borrar gasto?'}</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">{type === 'month' ? 'Se borrarán todos los movimientos y personas de este mes permanentemente.' : 'Este movimiento se eliminará del registro actual.'}</p>
          <div className="flex flex-col gap-3">
              <button onClick={onConfirm} className={`w-full text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all outline-none ${type === 'month' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'}`}>{type === 'month' ? 'Eliminar Ahora' : 'Confirmar Borrado'}</button>
              <button onClick={onCancel} className="w-full bg-white/5 text-slate-400 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:text-white transition-all outline-none">Cancelar</button>
          </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
