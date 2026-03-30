import React, { useState } from 'react';
import { ArrowLeft, Copy, CheckCircle2, Plus, Search, X, Filter, MoreVertical, Edit2, Trash2, PieChart, Award, Banknote, Hourglass, AlertCircle, Mail, Send, UserPlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { MonthConfig, Expense, BalanceResult, Category } from '../types';
import { formatCurrency, formatDateLong } from '../utils/format';

interface MonthDetailViewProps {
  activeMonth: MonthConfig;
  activeBalance: BalanceResult | null;
  activeMonthExpenses: Expense[];
  expensesByDay: [string, Expense[]][];
  chartData: any[];
  categoryFilter: string | null;
  searchQuery: string;
  copied: boolean;
  openExpenseMenuId: string | null;
  onBack: () => void;
    onEditDetails: () => void;
    onManageParticipants: () => void;
  onSettle: () => void;
  onCopyLink: () => void;
  onAddExpense: () => void;
  onSearch: (q: string) => void;
  onCategoryFilter: (c: string | null) => void;
  onEditExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onSetOpenMenu: (id: string | null) => void;
  onSendEmailInvite: (email: string) => Promise<void>;
}

const MonthDetailView: React.FC<MonthDetailViewProps> = ({ 
  activeMonth, activeBalance, activeMonthExpenses, expensesByDay, chartData, 
  categoryFilter, searchQuery, copied, openExpenseMenuId,
    onBack, onEditDetails, onManageParticipants, onSettle, onCopyLink, onAddExpense, onSearch, 
  onCategoryFilter, onEditExpense, onDeleteExpense, onSetOpenMenu, onSendEmailInvite
}) => {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async () => {
     if (!inviteEmail) return;
     setIsSending(true);
     await onSendEmailInvite(inviteEmail);
     setIsSending(false);
     setShowEmailModal(false);
     setInviteEmail('');
  };

  return (
    <div className="w-full md:w-[90%] lg:w-[85%] max-w-[1400px] mx-auto border-x border-white/5 md:shadow-2xl md:shadow-black/40 pb-24 min-h-screen">
      <header className="bg-[#0f172a] px-6 pt-10 pb-8 shadow-xl relative z-30 rounded-b-[40px] border-b border-white/5">
        <div className="flex justify-between items-center mb-10">
          <button onClick={onBack} className="p-3 border border-slate-700 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 outline-none shadow-sm">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center flex-1 mx-4 overflow-hidden">
             <h2 className="text-lg md:text-2xl font-black text-white truncate leading-tight uppercase tracking-tight">{activeMonth.emoji} {activeMonth.name}</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{activeMonth.participants.length} Participantes</p>
          </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onEditDetails} className="p-3 border border-slate-700 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 outline-none shadow-sm">
                            <Edit2 size={18} />
                        </button>
                        <button onClick={onManageParticipants} className="p-3 border border-slate-700 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 outline-none shadow-sm">
                            <UserPlus size={18} />
                        </button>
                    </div>
        </div>

        <div className="text-center mb-10">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Total Gastado Grupal</p>
            <p className="text-5xl md:text-7xl font-black tracking-tighter text-white">€{formatCurrency(activeBalance?.totalSpent || 0)}</p>
            <div className="flex flex-col items-center gap-6 mt-8 px-4">
                {/* Grupo de Invitaciones */}
                <div className="flex flex-col items-center bg-slate-900/30 p-4 border border-slate-800/80 rounded-[24px]">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5"><Plus size={12} className="text-indigo-400"/> Invitar a un amigo</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button onClick={onCopyLink} className="inline-flex items-center gap-2 bg-indigo-600 border border-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-500 hover:-translate-y-0.5 transition-all outline-none shadow-lg shadow-indigo-500/20 tracking-widest uppercase">
                           {copied ? <CheckCircle2 size={16} className="text-emerald-300"/> : <Copy size={16} />} 
                           {copied ? 'Link Copiado' : 'Copiar Link'}
                        </button>
                        <button onClick={() => setShowEmailModal(true)} className="inline-flex items-center gap-2 bg-indigo-600 border border-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-500 hover:-translate-y-0.5 transition-all outline-none shadow-lg shadow-indigo-500/20 tracking-widest uppercase">
                           <Mail size={16} /> 
                           Por Email
                        </button>
                    </div>
                </div>

                {/* Botón Principal Saldar Cuentas */}
                <button 
                  onClick={onSettle} 
                  className={`inline-flex items-center gap-2 border px-6 py-3 rounded-2xl text-xs md:text-sm font-black transition-all outline-none shadow-xl tracking-[0.15em] uppercase hover:-translate-y-0.5 ${activeMonth.isClosed ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/80 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500'}`}
                >
                   <CheckCircle2 size={18} className={activeMonth.isClosed ? 'text-emerald-400' : 'text-slate-400'} /> 
                   {activeMonth.isClosed ? 'Meso Saldado' : 'Saldar Cuentas'}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
             {activeBalance?.balances.map((b) => (
                <div key={b.participantId} className={`p-6 rounded-[28px] border bg-slate-900 border-slate-800 flex flex-col justify-between shadow-xl transition-all hover:scale-[1.02] cursor-default relative overflow-hidden group`}>
                   <div className="absolute -right-4 -bottom-4 text-white/5 rotate-12 transition-transform group-hover:rotate-0 duration-700 pointer-events-none">
                      {Math.abs(b.balance) < 0.1 ? <Award size={100} /> : b.balance > 0 ? <Banknote size={100} /> : <Hourglass size={100} />}
                   </div>
                   <div className="flex justify-between items-start mb-4 relative z-10">
                     <p className="font-black text-base text-slate-200 truncate pr-2">{b.name} {activeMonth.isClosed && ' 😊'}</p>
                     <span className="text-[10px] bg-slate-900 border border-slate-700 text-indigo-400 px-3 py-1 rounded-full font-black tracking-widest uppercase">{b.splitPercentage}%</span>
                   </div>
                   <div className="relative z-10">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lleva Gastado</p>
                      <p className="text-3xl font-black text-white shrink-0">€{formatCurrency(b.totalPaid)}</p>
                   </div>
                   <div className="mt-5 pt-5 border-t border-white/5 relative z-10">
                      <p className="text-[11px] text-slate-400 font-bold tracking-tight">Le corresponde aportar: €{formatCurrency(b.fairShare)}</p>
                      {Math.abs(b.balance) < 0.1 ? (
                          <p className="text-xs font-black text-emerald-500 mt-2 uppercase tracking-[0.15em] flex items-center gap-1.5"><CheckCircle2 size={12} /> Cuentas Claras</p>
                      ) : (
                          <div className="mt-2 space-y-1">
                             <p className={`text-sm font-black uppercase tracking-wide px-3 py-1.5 rounded-xl inline-block ${activeMonth.isClosed ? 'bg-emerald-500/10 text-emerald-400' : (b.balance > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400')}`}>
                                 {activeMonth.isClosed ? (b.balance > 0 ? 'Deuda Cobrada' : 'Deuda Pagada') : (b.balance > 0 ? `Le deben €${formatCurrency(Math.abs(b.balance))}` : `Debe €${formatCurrency(Math.abs(b.balance))}`)}
                             </p>
                             {b.balance < 0 && (b as any).owesTo?.length > 0 && (
                                 <div className="pl-1 pt-1 space-y-0.5">
                                    {(b as any).owesTo.map((debt: any, idx: number) => (
                                        <p key={idx} className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${activeMonth.isClosed ? 'text-emerald-500 opacity-60' : 'text-slate-500'}`}>
                                            {activeMonth.isClosed ? <CheckCircle2 size={10} /> : '💰'} {activeMonth.isClosed ? 'Saldado con ' : 'debe a '} <span className={activeMonth.isClosed ? '' : 'text-slate-300'}>{debt.name}</span> {(b as any).owesTo.length > 1 && <span className={activeMonth.isClosed ? 'ml-1' : 'text-indigo-400/60 ml-1'}>€{formatCurrency(debt.amount)}</span>}
                                        </p>
                                    ))}
                                 </div>
                             )}
                          </div>
                      )}
                   </div>
                </div>
             ))}
        </div>
      </header>

      <div className="p-6 md:p-10 relative z-10" onClick={() => onSetOpenMenu(null)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
                <button onClick={onAddExpense} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 md:py-5 rounded-2xl md:rounded-[24px] text-base md:text-lg font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 transition-all outline-none hover:-translate-y-1">
                    <Plus size={20} className="md:w-6 md:h-6" /> Añadir Gasto
                </button>
                <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"><Search size={18} className="md:w-5 md:h-5" /></div>
                    <input type="text" value={searchQuery} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por nombre o categoría" className="w-full pl-12 pr-10 py-3.5 md:py-5 bg-slate-900/50 border border-slate-800 rounded-xl md:rounded-[24px] text-sm md:text-base text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all shadow-inner backdrop-blur-sm" />
                    {searchQuery && <button onClick={() => onSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-full transition-all"><X size={20} /></button>}
                </div>

                <div className="overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 pl-1"><Filter size={14} className="text-slate-500"/><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtrar por Categoría</h3></div>
                    <div className="flex overflow-x-auto pb-4 gap-2.5 custom-scrollbar no-scrollbar-on-mobile">
                        <button onClick={() => onCategoryFilter(null)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap border transition-all uppercase tracking-wider ${!categoryFilter ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20 scale-105' : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:border-indigo-500/30 hover:text-slate-200'}`}>Ver Todos</button>
                        {Object.values(Category).sort((a,b) => a.localeCompare(b)).filter(cat => activeMonthExpenses.some(e => e.category === cat)).map(cat => (
                            <button key={cat} onClick={() => onCategoryFilter(cat === categoryFilter ? null : cat)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap border transition-all uppercase tracking-wider flex items-center gap-2 ${categoryFilter === cat ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20 scale-105' : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:border-indigo-500/30 hover:text-slate-200'}`}>{cat}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-10">
                    {expensesByDay.length === 0 ? (
                        <div className="bg-slate-900/30 p-20 rounded-[40px] text-center border-2 border-slate-800 border-dashed"><p className="text-slate-500 font-bold text-lg text-center">No se encontraron movimientos</p></div>
                    ) : (
                        expensesByDay.map(([date, dayExpenses]) => (
                            <div key={date} className="space-y-4">
                                <div className="flex items-center gap-4"><h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] bg-indigo-500/5 px-5 py-2 rounded-2xl border border-indigo-500/10 shadow-sm whitespace-nowrap">{formatDateLong(date)}</h4><div className="h-[1px] flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div></div>
                                <div className="space-y-3">
                                    {dayExpenses.map(expense => (
                                        <div key={expense.id} className={`bg-[#1e293b]/40 p-3.5 md:p-5 rounded-2xl md:rounded-[28px] border border-slate-800/80 flex justify-between items-center shadow-lg hover:bg-slate-800 hover:border-indigo-500/20 transition-all cursor-pointer group relative active:scale-[0.99] ${openExpenseMenuId === expense.id ? 'z-40 border-indigo-500/30 bg-slate-800' : 'z-auto'}`}>
                                            <div className="flex gap-3 md:gap-5 items-center overflow-hidden flex-1">
                                                <div className="w-10 h-10 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-[20px] bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center font-black text-[10px] md:text-sm uppercase shadow-inner group-hover:bg-slate-800 transition-colors">{(expense.payerName || ' ').substring(0,2)}</div>
                                                <div className="truncate pr-4"><p className="font-bold text-slate-100 text-sm md:text-lg mb-0.5 truncate">{expense.title}</p><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{expense.category}</p></div>
                                            </div>
                                            <div className="flex items-center gap-3 md:gap-5">
                                                <div className="text-right shrink-0"><p className="font-black text-slate-100 text-base md:text-2xl tracking-tighter">€{formatCurrency(expense.amount)}</p><p className="text-[10px] text-indigo-400 font-black uppercase mt-0.5 tracking-[0.1em]">{expense.payerName}</p></div>
                                                <button onClick={(e) => { e.stopPropagation(); onSetOpenMenu(openExpenseMenuId === expense.id ? null : expense.id); }} className="p-3 text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all"><MoreVertical size={22} /></button>
                                            </div>
                                            {openExpenseMenuId === expense.id && (
                                                <div className="absolute right-12 top-14 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 py-2 min-w-[150px] animate-in fade-in zoom-in-95 duration-100">
                                                    <button onClick={(e) => { e.stopPropagation(); onEditExpense(expense); onSetOpenMenu(null); }} className="w-full px-5 py-3 text-left text-sm font-bold text-slate-200 hover:bg-white/5 flex items-center gap-3 transition-colors"><Edit2 size={16} className="text-indigo-400" /> Editar Gasto</button>
                                                    <div className="h-px bg-white/5 mx-2 my-1"></div>
                                                    <button onClick={(e) => { e.stopPropagation(); onDeleteExpense(expense.id); }} className="w-full px-5 py-3 text-left text-sm font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-3 transition-colors"><Trash2 size={16} /> Eliminar</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            </div>

            <div className="hidden lg:block sticky top-32 space-y-8">
                {chartData.length > 0 && (
                <div className="bg-[#1e293b]/60 p-8 rounded-[40px] border border-white/5 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center justify-between mb-8 px-2"><h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Distribución por Categoría</h3><PieChart size={18} className="text-indigo-500" /></div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 60 }}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'black'}} interval={0} angle={-45} textAnchor="end" height={60} />
                            <YAxis hide domain={[0, 'auto']} />
                            <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                            {chartData.map((entry, index) => <Cell key={index} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />)}
                            <LabelList dataKey="value" position="top" content={(props: any) => (<text x={props.x + props.width / 2} y={props.y - 15} fill="#fff" fontSize={12} fontWeight="900" textAnchor="middle">€{formatCurrency(props.value)}</text>)} />
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                )}
            </div>

            <div className="lg:hidden">
                {chartData.length > 0 && (
                <div className="bg-[#1e293b]/40 p-6 rounded-[32px] border border-slate-800 shadow-xl">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 text-center">Resumen de Gastos</h3>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 50 }}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} interval={0} angle={-45} textAnchor="end" height={50} />
                            <YAxis hide domain={[0, 'auto']} />
                            <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={32}>
                            {chartData.map((entry, index) => <Cell key={index} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />)}
                            <LabelList dataKey="value" position="top" content={(props: any) => (<text x={props.x + props.width / 2} y={props.y - 12} fill="#fff" fontSize={11} fontWeight="black" textAnchor="middle">€{formatCurrency(props.value)}</text>)} />
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                )}
            </div>
        </div>
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md" onClick={() => setShowEmailModal(false)}></div>
          <div className="bg-[#1e293b] border border-slate-700 w-full max-w-sm rounded-[24px] shadow-2xl relative animate-in zoom-in-95 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-black text-white flex items-center gap-2"><Mail size={20} className="text-indigo-400" /> ¡Invita a un amigo!</h3>
               <button onClick={() => setShowEmailModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Correo electrónico de tu amigo..." className="w-full px-5 py-4 bg-slate-900 border border-slate-700 rounded-[16px] text-white outline-none mb-6 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
            <button onClick={handleSendEmail} disabled={isSending || !inviteEmail} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-4 rounded-[16px] font-black tracking-wider uppercase text-sm flex items-center justify-center gap-2 transition-all">
               {isSending ? 'Enviando...' : <><Send size={18} /> Enviar Invitación</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthDetailView;
