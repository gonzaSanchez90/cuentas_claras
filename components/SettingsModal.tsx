import React, { useState, useEffect, useMemo } from 'react';
import { MonthConfig, Participant, Expense } from '../types';
import { X, Settings, Plus, Trash2, AlertCircle, ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: MonthConfig | null;
  onSave: (name: string, participants: Participant[], reassignments?: {from: string, to: string}[], emoji?: string) => void;
  isNew?: boolean;
  currentUser?: { name: string };
  expenses?: Expense[];
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, config, onSave, isNew, currentUser, expenses = [] }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📅');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [participants, setParticipants] = useState<{name: string, pStr: string, isMe?: boolean, id?: string}[]>([]);
  
  // Reassignment logic
  const [showDeletionAlert, setShowDeletionAlert] = useState<{index: number, name: string, id: string, count: number} | null>(null);
  const [reassignToId, setReassignToId] = useState<string>('');
  const [pendingReassignments, setPendingReassignments] = useState<{from: string, to: string}[]>([]);

  const EMOJI_LIST = ['📅', '🏠', '🍕', '🚗', '✈️', '🎁', '💡', '🛒', '🐾', '🍻', '💰', '🍔', '🛒', '🏔️', '🎉', '⚽'];

  useEffect(() => {
    if (isOpen && config) {
      setName(config.name);
      setEmoji(config.emoji || '📅');
      setParticipants((config.participants || []).map(p => ({ ...p, pStr: (p.splitPercentage || 0).toString() })));
      setPendingReassignments([]);
      setShowEmojiPicker(false);
    } else if (isOpen && isNew) {
      const now = new Date();
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      setName('');
      setEmoji('📅');
      setParticipants([
        { name: currentUser?.name || 'Mi Cuenta', pStr: '', isMe: true },
        { name: '', pStr: '' }
      ]);
      setPendingReassignments([]);
      setShowEmojiPicker(false);
    }
  }, [isOpen, config, isNew, currentUser]);

  const handlePercentageChange = (index: number, valHtml: string) => {
    const rawVal = valHtml.replace(',', '.');
    const newP = [...participants];
    newP[index].pStr = rawVal;
    setParticipants(newP);
  };

  const handleBlurAndBalance = (index: number) => {
    let raw = participants[index].pStr;
    if (!raw) return;
    let value = parseFloat(raw.replace(',', '.'));
    if (isNaN(value)) {
      value = 0;
    } else {
      if (value > 100) value = 100;
      if (value < 0) value = 0;
      value = Math.round(value);
    }

    let newParticipants = [...participants];
    newParticipants[index].pStr = value === 0 && raw === '' ? '' : value.toString();
    setParticipants(newParticipants);
  };

  const handleDeleteAttempt = (index: number) => {
    const p = participants[index];
    if (!p.id) {
       setParticipants(participants.filter((_, i) => i !== index));
       return;
    }
    const pExpensesCount = expenses.filter(e => e.payerParticipantId === p.id).length;
    if (pExpensesCount > 0) {
      setShowDeletionAlert({ index, name: p.name, id: p.id, count: pExpensesCount });
      const firstOther = participants.find((_, i) => i !== index);
      setReassignToId(firstOther?.id || '');
    } else {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const confirmReassignment = () => {
    if (!showDeletionAlert || !reassignToId) return;
    setPendingReassignments([...pendingReassignments, { from: showDeletionAlert.id, to: reassignToId }]);
    setParticipants(participants.filter((_, i) => i !== showDeletionAlert.index));
    setShowDeletionAlert(null);
    setReassignToId('');
  };

  const totalPercentage = participants.reduce((acc, p) => acc + (parseFloat(p.pStr.replace(',', '.')) || 0), 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.2 && name.trim().length > 0 && participants.length > 0 && participants.every(p => p.name.trim() !== '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="bg-[#1e293b] border border-white/10 w-full max-w-sm rounded-[32px] shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 border-b border-white/5 bg-[#1e293b]/50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-[14px] shadow-inner">
                   <Settings size={20} />
               </div>
               <h2 className="text-lg font-black text-white uppercase tracking-tight">
                 {isNew ? 'Crear Cálculo' : 'Crear cuentas'}
               </h2>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:bg-white/5 hover:text-white rounded-full transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Title & Emoji Section */}
          <div className="space-y-4">
             <div className="relative">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 pl-1">Título</label>
                <div className="flex gap-4">
                   <div className="relative w-16 h-16">
                      <button 
                         onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                         className="w-full h-full bg-slate-900 border border-slate-700 rounded-2xl text-2xl flex items-center justify-center transition-all hover:border-indigo-500 shadow-inner group"
                      >
                         {emoji}
                      </button>
                      
                      {showEmojiPicker && (
                          <>
                            <div className="fixed inset-0 z-[70]" onClick={() => setShowEmojiPicker(false)}></div>
                            <div className="absolute top-20 left-0 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl z-[80] p-4 w-[240px] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                                <div className="grid grid-cols-4 gap-2">
                                    {EMOJI_LIST.map(item => (
                                        <button 
                                            key={item}
                                            onClick={() => { setEmoji(item); setShowEmojiPicker(false); }}
                                            className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl transition-all ${emoji === item ? 'bg-indigo-500/20 border-indigo-500 ring-2 ring-indigo-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                    <div className="col-span-4 mt-2 h-px bg-white/5"></div>
                                    <input 
                                        type="text" 
                                        placeholder="Poner otro..." 
                                        maxLength={2}
                                        className="col-span-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                                        onChange={e => {
                                            if (e.target.value) {
                                                setEmoji(e.target.value.substring(0,2));
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                          </>
                      )}
                   </div>
                   <div className="flex-1">
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Nombre del cálculo..."
                        className="w-full h-16 px-5 bg-slate-900 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:border-indigo-500 transition-all shadow-inner"
                      />
                   </div>
                </div>
             </div>
          </div>

          {/* Participants section */}
          <div>
              <div className="flex items-center justify-between mb-4 pl-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Participantes</label>
                 <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${Math.abs(totalPercentage - 100) < 0.2 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                    {Math.round(totalPercentage)}%
                 </span>
              </div>
              <div className="space-y-3">
                  {participants.map((p, index) => (
                      <div key={index} className="flex gap-3 items-center group/row">
                          <input 
                             type="text" 
                             value={p.name} 
                             onChange={e => {
                                const newP = [...participants];
                                newP[index].name = e.target.value;
                                setParticipants(newP);
                             }}
                             className="flex-1 h-12 px-4 bg-slate-900/50 border border-slate-800 rounded-xl outline-none text-sm font-bold text-white focus:border-indigo-500/50 transition-all shadow-inner"
                             placeholder="Participante..."
                          />
                          <div className="relative w-23 h-12">
                            <input
                               type="text"
                               value={p.pStr}
                               onChange={e => handlePercentageChange(index, e.target.value)}
                               onBlur={() => handleBlurAndBalance(index)}
                               className="w-full h-full bg-slate-900 rounded-xl border border-slate-800 outline-none text-sm font-black text-indigo-400 text-center shadow-inner focus:border-indigo-500/30 transition-all px-2 pr-6"
                            />
                            <span className="absolute right-3 top-3.5 text-slate-600 text-[10px] font-black group-hover/row:text-indigo-600 transition-colors">%</span>
                          </div>
                          {participants.length > 1 && (
                             <button onClick={() => handleDeleteAttempt(index)} className="w-12 h-12 flex items-center justify-center text-slate-600 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all"><Trash2 size={18} /></button>
                          )}
                      </div>
                  ))}
              </div>
              <div className="mt-4">
                 {Math.abs(totalPercentage - 100) > 0.1 && (
                     <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-bold ${totalPercentage < 100 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                         <AlertCircle size={16} className="mt-0.5 shrink-0" />
                         <span>
                             {totalPercentage < 100 
                                 ? `Falta un ${Math.round(100 - totalPercentage)}% para llegar al 100%. Modifica los porcentajes.`
                                 : `Los porcentajes se exceden por ${Math.round(totalPercentage - 100)}%. Redúcelos para que sumen 100%.`}
                         </span>
                     </div>
                 )}
                 {Math.abs(totalPercentage - 100) <= 0.1 && (
                     <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20 flex items-center gap-2.5 text-xs font-bold text-emerald-500">
                         <CheckCircle2 size={16} className="shrink-0" />
                         <span>Los porcentajes suman 100% correctamente.</span>
                     </div>
                 )}
              </div>

              <button 
                onClick={() => setParticipants([...participants, { name: '', pStr: '' }])} 
                className="w-full mt-5 py-4 border border-dashed border-slate-800 text-slate-500 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-600/5 hover:border-indigo-500/30 hover:text-indigo-400 transition-all text-[10px] font-black uppercase tracking-widest outline-none"
              >
                  <Plus size={16} /> Añadir Participante
              </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 border-t border-white/5 bg-[#1e293b]/50">
          <button
            onClick={() => {
              if(isValid) {
                const finalParticipants = participants.map(p => ({
                   id: p.id,
                   name: p.name,
                   splitPercentage: parseFloat(p.pStr) || 0,
                   isMe: p.isMe
                }));
                onSave(name, finalParticipants, pendingReassignments, emoji);
                onClose();
              }
            }}
            disabled={!isValid}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-xl ${isValid ? 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-500/40 translate-y-0 active:scale-[0.98]' : 'bg-slate-800 text-slate-600 shadow-none cursor-not-allowed'}`}
          >
            {isNew ? 'Comenzar Mes' : 'Guardar Cambios'}
          </button>
        </div>

        {showDeletionAlert && (
            <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-[60] flex items-center justify-center p-8 animate-in fade-in duration-200">
                <div className="text-center w-full">
                    <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-rose-500/20">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Acción Necesaria</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        <span className="text-white font-bold">{showDeletionAlert.name}</span> tiene <span className="text-indigo-400 font-bold">{showDeletionAlert.count} gastos</span> registrados. ¿A quién se los quieres asignar?
                    </p>
                    
                    <div className="space-y-4 mb-8">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest text-left pl-1">Seleccionar Nuevo Propietario</label>
                        <select 
                            value={reassignToId} 
                            onChange={e => setReassignToId(e.target.value)}
                            className="w-full h-14 bg-slate-900 border border-slate-800 rounded-xl px-4 text-white font-bold outline-none ring-1 ring-white/5"
                        >
                            {participants.filter((p, i) => i !== showDeletionAlert.index).map((p, idx) => (
                                <option key={p.id || idx} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button onClick={confirmReassignment} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all">
                            Confirmar y Reasignar
                        </button>
                        <button onClick={() => setShowDeletionAlert(null)} className="w-full bg-white/5 text-slate-400 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:text-white transition-all">
                            Mejor no borrar
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
      <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SettingsModal;