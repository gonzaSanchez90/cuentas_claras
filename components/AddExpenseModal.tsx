import React, { useState, useEffect, useRef } from 'react';
import { Category, Expense, Participant } from '../types';
import { X, Search, Save, ChevronDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: any) => void;
  participants: Participant[];
  expenseToEdit?: Expense | null;
  currentUser?: { id: number; name: string };
}

const AddExpenseModal: React.FC<Props> = ({ isOpen, onClose, onSave, participants, expenseToEdit, currentUser }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState<string>('');
  const [category, setCategory] = useState<Category | string>(Category.Misc);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [showCatPicker, setShowCatPicker] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setTitle(expenseToEdit.title);
        setAmount(expenseToEdit.amount.toString());
        setPayerId(expenseToEdit.payerParticipantId);
        setCategory(expenseToEdit.category);
        setDate(expenseToEdit.date);
      } else if (participants.length > 0) {
        // Reset only if creating new - default payer to the current logged-in user's participant
        const meParticipant = participants.find(p => currentUser ? p.userId === currentUser.id : p.userId);
        setPayerId(meParticipant?.id || participants[0].id || '');
        setCategory(Category.Misc);
        setDate(new Date().toISOString().split('T')[0]);
      }
      // Focus the title input when modal opens
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen, participants, expenseToEdit]);

  if (!isOpen) return null;


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !payerId) return;
    
    // Convert comma to dot
    const cleanAmount = parseFloat(amount.replace(',', '.'));
    if(isNaN(cleanAmount)) return;

    onSave({
      title,
      amount: cleanAmount,
      payerParticipantId: payerId,
      category,
      date,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#020617]/75 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-700 bg-[#1e293b] shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-10 duration-200">

        <div className="flex items-center justify-between border-b border-slate-800 bg-[#1e293b]/95 px-5 py-4 sm:px-6 sm:py-5">
          <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
            {expenseToEdit ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"><X size={20} /></button>
        </div>

        <div className="max-h-[85vh] overflow-y-auto p-5 custom-scrollbar sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
               <label className="mb-2 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Título</label>
               <input 
                  ref={titleInputRef}
                  required 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" 
                  placeholder="¿Que compraste?" 
                />
            </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
              <div className="min-w-0">
                 <label className="mb-2 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Monto</label>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">€</span>
                    <input required type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-3 pl-9 pr-4 text-base font-black text-white outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" placeholder="0,00" />
                 </div>
              </div>
              <div>
                 <label className="mb-2 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Fecha</label>
                 <input
                   type="date"
                   value={date}
                   onChange={e => setDate(e.target.value)}
                   className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                   style={{ colorScheme: 'dark' }}
                 />
             </div>
          </div>

          <div>
             <label className="mb-2 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pagado por</label>
             <div className="relative">
               <select value={payerId} onChange={e => setPayerId(e.target.value)} required className="w-full appearance-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pr-11 text-sm font-semibold text-white outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30">
                   {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
               <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
             </div>
          </div>

            <div className="relative">
               <label className="mb-2 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Categoría</label>
               <div className="relative">
                  <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                          <Search size={14} />
                      </div>
                      <input 
                        type="text" 
                        value={showCatPicker ? catSearch : (category as string)}
                        onFocus={() => { setShowCatPicker(true); setCatSearch(''); }}
                        onChange={(e) => setCatSearch(e.target.value)}
                        placeholder="Buscar o escribir categoría..."
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-3 pl-11 pr-11 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                      />
                      <button 
                         type="button"
                         onClick={() => setShowCatPicker(!showCatPicker)}
                         className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                      >
                         <ChevronDown size={16} className={`transition-transform duration-200 ${showCatPicker ? 'rotate-180' : ''}`} />
                      </button>
                  </div>

                  {showCatPicker && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowCatPicker(false)}></div>
                       <div className="absolute bottom-full left-0 right-0 z-[70] mb-2 overflow-hidden rounded-2xl border border-slate-700 bg-[#0f172a] shadow-2xl ring-1 ring-black/50 animate-in slide-in-from-bottom-2 duration-200">
                          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                              {Object.values(Category).sort((a,b) => a.localeCompare(b)).filter(c => c.toLowerCase().includes(catSearch.toLowerCase())).map(cat => (
                                  <button
                                      key={cat}
                                      type="button"
                                      onClick={() => { setCategory(cat); setShowCatPicker(false); }}
                                      className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-colors flex items-center justify-between group ${category === cat ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                                  >
                                      {cat}
                                      {category === cat && <Save size={12} className="opacity-60" />}
                                  </button>
                              ))}
                              {catSearch && !Object.values(Category).some(c => c.toLowerCase() === catSearch.toLowerCase()) && (
                                  <button
                                      type="button"
                                      onClick={() => { setCategory(catSearch); setShowCatPicker(false); }}
                                      className="w-full px-4 py-2.5 text-left text-sm rounded-xl transition-colors flex items-center justify-between text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10"
                                  >
                                      <span className="truncate">Usar: "{catSearch}"</span>
                                      <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500 text-white px-2 py-0.5 rounded">Nueva</span>
                                  </button>
                              )}
                          </div>
                      </div>
                    </>
                  )}
               </div>
            </div>

            <div className="pt-2">
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 focus:ring-4 focus:ring-indigo-500/30">
                  <Save size={18} /> <span className="pt-0.5 tracking-wide">CONFIRMAR GASTO</span>
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;