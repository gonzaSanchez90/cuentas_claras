import React, { useState } from 'react';
import { MonthConfig, BalanceResult, ParticipantBalance } from '../types';
import { ChevronRight, Users, CheckCircle2, MoreVertical, Edit2, Trash2, Calendar, CreditCard } from 'lucide-react';

interface Props {
  month: MonthConfig;
  balance: BalanceResult;
  myBalance?: ParticipantBalance;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const formatCurrency = (amount: number) => {
  const rounded = Math.abs(amount) < 0.001 ? 0 : amount;
  const isInteger = Math.abs(rounded - Math.round(rounded)) < 0.001;
  return rounded.toLocaleString('es-ES', { 
    minimumFractionDigits: isInteger ? 0 : 2, 
    maximumFractionDigits: 2 
  });
};

const MonthCard: React.FC<Props> = ({ month, balance, myBalance, onClick, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const isPositive = myBalance && myBalance.balance > 0;
  const isZero = myBalance ? Math.abs(myBalance.balance) < 0.1 : true;
  const displayValue = myBalance ? formatCurrency(Math.abs(myBalance.balance)) : '0';

  return (
    <div className="relative group/card h-full">
      <div
        onClick={onClick}
        className={`p-6 rounded-[32px] border flex flex-col h-full cursor-pointer transition-all shadow-xl active:scale-[0.98] relative overflow-hidden group ${
          month.isClosed 
            ? 'bg-emerald-950/20 border-emerald-500/20 hover:bg-emerald-900/30' 
            : 'bg-slate-800/40 border-white/5 hover:bg-slate-800 hover:shadow-indigo-500/10 hover:-translate-y-1'
        } ${showMenu ? 'z-50 border-indigo-500/30 bg-slate-800 ring-1 ring-indigo-500/20' : 'z-auto'}`}
      >
        {/* Decorative Background Icon */}
        <div className="absolute -right-6 -bottom-6 text-white/5 rotate-12 transition-transform group-hover:rotate-0 duration-700">
            {month.isClosed ? <CheckCircle2 size={120} /> : <Calendar size={120} />}
        </div>

        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border ${
            month.isClosed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20'
          }`}>
             {month.isClosed ? <CheckCircle2 size={24} /> : <Users size={24} />}
          </div>
          {month.isClosed && (
              <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                  Saldado
              </div>
          )}
          <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                }}
                className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
             >
                <MoreVertical size={20} />
          </button>
        </div>

        <div className="flex-1 relative z-10">
            <h3 className="font-black text-white text-xl truncate mb-1">{month.emoji} {month.name}</h3>
            <div className="flex items-center gap-2 text-slate-500">
                <CreditCard size={14} />
                <p className="text-xs font-bold uppercase tracking-widest mt-0.5">
                   Total: €{formatCurrency(balance.totalSpent)}
                </p>
            </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-end relative z-10">
          <div>
             {myBalance ? (
                 month.isClosed ? (
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Todo Arreglado</span>
                    </div>
                 ) : isZero ? (
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Cuentas Claras</span>
                     </div>
                 ) : (
                     <div>
                         <p className={`text-[10px] uppercase tracking-[0.2em] font-black mb-1 ${isPositive ? 'text-emerald-500' : 'text-amber-500'}`}>
                             {isPositive ? 'A favor' : 'En contra'}
                         </p>
                         <p className={`text-2xl font-black tracking-tighter ${isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                             €{displayValue}
                         </p>
                     </div>
                 )
             ) : (
                 <span className="text-xs text-slate-600 font-black uppercase tracking-widest">Espectador</span>
             )}
          </div>
          
          <div className="bg-white/5 p-2 rounded-xl text-slate-500 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all">
             <ChevronRight size={20} />
          </div>
        </div>
      </div>

      {showMenu && (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
            <div className="absolute right-4 top-20 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 py-2 min-w-[170px] animate-in fade-in zoom-in-95 duration-150">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(e); }}
                    className="w-full px-5 py-3 text-left text-sm font-bold text-slate-200 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                    <Edit2 size={16} className="text-indigo-400" /> Editar Cálculo
                </button>
                <div className="h-px bg-white/5 mx-2 my-1"></div>
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(e); }}
                    className="w-full px-5 py-3 text-left text-sm font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-3 transition-colors"
                >
                    <Trash2 size={16} /> Eliminar
                </button>
            </div>
        </>
      )}
    </div>
  );
};

export default MonthCard;