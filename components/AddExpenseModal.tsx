import React, { useState, useEffect } from 'react';
import { Category, Expense, Participant } from '../types';
import { parseExpenseString } from '../services/geminiService';
import { X, Sparkles, Loader2, Save } from 'lucide-react';

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

  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

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
        setTitle('');
        setAmount('');
        setAiPrompt('');
        setCategory(Category.Misc);
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, participants, expenseToEdit]);

  if (!isOpen) return null;

  const handleAiParse = async () => {
    if (!aiPrompt.trim() || participants.length === 0) return;
    setIsAiLoading(true);
    const result = await parseExpenseString(aiPrompt, participants);
    setIsAiLoading(false);

    if (result) {
      setTitle(result.title);
      setAmount(result.amount.toString());
      setCategory(result.category);
      setDate(result.date);
      
      const matchedPayer = participants.find(p => p.name.toLowerCase().includes(result.payerNameMatched.toLowerCase()));
      if (matchedPayer) {
         setPayerId(matchedPayer.id || '');
      }
    }
  };

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
    
    setTitle('');
    setAmount('');
    setAiPrompt('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto relative">

        <div className="flex justify-between items-center p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {expenseToEdit ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-800 rounded-full p-2 transition-colors"><X size={20} /></button>
        </div>

        {/* AI Input */}
        <div className="bg-[#0f172a]/50 p-6 border-b border-slate-800">
            <label className="text-[10px] font-black tracking-widest text-indigo-400 uppercase mb-3 flex items-center gap-1.5 shadow-sm">
                <Sparkles size={14} /> Carga Rapida Inteligente
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ej: Cena anoche 45 pago Gonza"
                    className="flex-1 text-xs rounded-xl border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-2.5 bg-slate-900 text-white outline-none shadow-inner placeholder-slate-500"
                />
                <button
                    onClick={handleAiParse}
                    disabled={isAiLoading || !aiPrompt}
                    className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-3 rounded-xl disabled:opacity-50 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                    {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                </button>
            </div>
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
             <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Título</label>
             <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white text-xs font-medium transition-all shadow-inner" placeholder="¿Que compraste?" />
          </div>

          <div className="flex gap-4">
             <div className="flex-1">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Monto</label>
                 <div className="relative">
                    <span className="absolute left-4 top-[11px] text-slate-500 font-bold text-sm">€</span>
                    <input required type="text" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-2.5 pl-8 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none font-mono text-white shadow-inner font-bold text-sm" placeholder="0.00" />
                 </div>
             </div>
             <div className="w-1/3">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Fecha</label>
                 <input
                   type="date"
                   value={date}
                   onChange={e => setDate(e.target.value)}
                   className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-xs text-slate-300 font-medium"
                   style={{ colorScheme: 'dark' }}
                 />
             </div>
          </div>

          <div>
             <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Pagado por</label>
             <select value={payerId} onChange={e => setPayerId(e.target.value)} required className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white text-xs font-bold appearance-none">
                 {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
          </div>

          <div className="relative">
             <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Categoría</label>
             <div className="relative group/cat">
                <button
                  type="button"
                  onClick={() => setShowCatPicker(!showCatPicker)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white text-sm font-medium flex justify-between items-center transition-all shadow-inner"
                >
                  {category}
                  <Sparkles size={14} className={showCatPicker ? 'text-indigo-400' : 'text-slate-600'} />
                </button>

                {showCatPicker && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowCatPicker(false)}></div>
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in slide-in-from-bottom-2 duration-200 ring-1 ring-black/50">
                        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {Object.values(Category).map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => { setCategory(cat); setShowCatPicker(false); }}
                                    className={`w-full px-4 py-2.5 text-left text-sm rounded-xl transition-colors flex items-center gap-2 ${category === cat ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                  </>
                )}
             </div>
          </div>

          <div className="pt-2">
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 focus:ring-4 focus:ring-indigo-500/30 text-white py-4 rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all outline-none">
                <Save size={18} /> <span className="pt-0.5 tracking-wide">CONFIRMAR GASTO</span>
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;