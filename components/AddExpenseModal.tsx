import React, { useState, useEffect, useRef } from 'react';
import { Category, Expense, Participant } from '../types';
import { X, Search, Save, ChevronDown } from 'lucide-react';
import './AddExpenseModal.css';

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
    
    setTitle('');
    setAmount('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose}></div>
      
      <div className="modal-container">

        <div className="modal-header">
          <h2 className="modal-title">
            {expenseToEdit ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h2>
          <button onClick={onClose} className="modal-close-btn"><X size={20} /></button>
        </div>

        <div className="modal-body custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
               <label className="input-label">Título</label>
               <input 
                  ref={titleInputRef}
                  required 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="input-field" 
                  placeholder="¿Que compraste?" 
                />
            </div>

          <div className="flex gap-4">
              <div className="flex-1">
                 <label className="input-label">Monto</label>
                 <div className="relative">
                    <span className="absolute left-4 top-[11px] text-slate-500 font-bold text-sm">€</span>
                    <input required type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} className="input-amount" placeholder="0.00" />
                 </div>
              </div>
              <div className="w-1/3">
                 <label className="input-label">Fecha</label>
                 <input
                   type="date"
                   value={date}
                   onChange={e => setDate(e.target.value)}
                   className="input-field"
                   style={{ colorScheme: 'dark' }}
                 />
             </div>
          </div>

          <div>
             <label className="input-label">Pagado por</label>
             <select value={payerId} onChange={e => setPayerId(e.target.value)} required className="input-field appearance-none">
                 {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
          </div>

            <div className="relative">
               <label className="input-label">Categoría</label>
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
                        className="search-field"
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
                      <div className="dropdown-menu">
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
                <button type="submit" className="btn-primary">
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