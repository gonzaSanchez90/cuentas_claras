import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, ArrowLeft, MoreVertical, PieChart, Info, Sheet, Loader2, Settings2, Share, DownloadCloud } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';

import { Expense, MonthConfig, User, BalanceResult } from './types';
import MonthCard from './components/MonthCard';
import AddExpenseModal from './components/AddExpenseModal';
import SettingsModal from './components/SettingsModal';
import GoogleConfigModal from './components/GoogleConfigModal';
import { analyzeSpendingHabits } from './services/geminiService';
import { syncExpensesToSheet, initGoogleClient, initGis } from './services/googleSheetsService';

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const calculateBalance = (expenses: Expense[], ratio: number): BalanceResult => {
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const paidByMe = expenses.filter(e => e.payer === User.Me).reduce((acc, curr) => acc + curr.amount, 0);
    const paidByPartner = expenses.filter(e => e.payer === User.Partner).reduce((acc, curr) => acc + curr.amount, 0);

    const myFairShare = totalSpent * (ratio / 100);
    const partnerFairShare = totalSpent * ((100 - ratio) / 100);

    const balance = paidByMe - myFairShare;

    return { totalSpent, paidByMe, paidByPartner, myFairShare, partnerFairShare, balance };
};

const App: React.FC = () => {
    // --- State ---
    const [months, setMonths] = useState<MonthConfig[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [activeMonthId, setActiveMonthId] = useState<string | null>(null);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
    const [isGoogleConfigOpen, setIsGoogleConfigOpen] = useState(false);

    const [aiInsight, setAiInsight] = useState<string | null>(null);

    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // PWA Install Prompt
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    // --- Persistence ---
    useEffect(() => {
        const storedMonths = localStorage.getItem('splitSmart_months');
        const storedExpenses = localStorage.getItem('splitSmart_expenses');
        if (storedMonths) setMonths(JSON.parse(storedMonths));
        if (storedExpenses) setExpenses(JSON.parse(storedExpenses));

        // Initialize Google Scripts
        initGoogleClient().catch(console.error);
        initGis().catch(console.error);

        // Listen for PWA install event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        });
    }, []);

    useEffect(() => {
        localStorage.setItem('splitSmart_months', JSON.stringify(months));
        localStorage.setItem('splitSmart_expenses', JSON.stringify(expenses));
    }, [months, expenses]);

    // --- Derived Data ---
    const activeMonth = useMemo(() =>
        months.find(m => m.id === activeMonthId),
        [months, activeMonthId]);

    const activeExpenses = useMemo(() =>
        expenses
            .filter(e => e.monthId === activeMonthId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [expenses, activeMonthId]);

    const activeBalance = useMemo(() => {
        if (!activeMonth) return null;
        return calculateBalance(activeExpenses, activeMonth.splitRatio);
    }, [activeExpenses, activeMonth]);

    // --- Handlers ---

    const handleCreateMonth = (name: string, ratio: number) => {
        const newMonth: MonthConfig = {
            id: generateId(),
            name,
            splitRatio: ratio,
            isClosed: false,
            createdAt: Date.now()
        };
        setMonths([newMonth, ...months]);
        setActiveMonthId(newMonth.id);
    };

    const handleUpdateMonth = (name: string, ratio: number) => {
        if (!activeMonthId) return;
        setMonths(months.map(m => m.id === activeMonthId ? { ...m, name, splitRatio: ratio } : m));
    };

    const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'monthId'>) => {
        if (!activeMonthId) return;
        const newExpense: Expense = {
            ...expenseData,
            id: generateId(),
            monthId: activeMonthId
        };
        setExpenses([newExpense, ...expenses]);
        setSyncStatus(null);
    };

    const handleGoogleSync = async () => {
        if (!activeMonth) return;
        setIsSyncing(true);
        setSyncStatus(null);
        try {
            const msg = await syncExpensesToSheet(activeExpenses, activeMonth.name);
            setSyncStatus({ msg, type: 'success' });
        } catch (error: any) {
            setSyncStatus({ msg: error.message || "Error desconocido", type: 'error' });
            if (error.message?.includes('Client ID')) {
                setIsGoogleConfigOpen(true);
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExportCSV = () => {
        if (!activeMonth || !activeBalance) return;

        const headers = ["Fecha", "Concepto", "Categoría", "Pagado Por", "Monto", "Mes"];
        const rows = activeExpenses.map(e => [
            e.date,
            `"${e.title}"`,
            e.category,
            e.payer === User.Me ? "Yo" : "Pareja",
            e.amount.toFixed(2),
            activeMonth.name
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Gastos_${activeMonth.name.replace(/\s/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleInstallApp = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        });
    };

    const handleAnalyze = async () => {
        if (activeExpenses.length === 0) return;
        setAiInsight("Analizando gastos...");
        const result = await analyzeSpendingHabits(activeExpenses);
        setAiInsight(result);
    };

    // --- Render: Dashboard (Home) ---
    if (!activeMonthId) {
        return (
            <div className="min-h-screen pb-24 max-w-lg mx-auto bg-gray-50">
                <header className="bg-white p-6 shadow-sm sticky top-0 z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                            SplitSmart
                        </h1>
                        <p className="text-gray-500 text-sm">Control de gastos pareja</p>
                    </div>
                    <div className="flex gap-2">
                        {installPrompt && (
                            <button
                                onClick={handleInstallApp}
                                className="p-2 text-blue-600 hover:bg-blue-50 bg-white border border-blue-100 rounded-full animate-bounce shadow-sm"
                                title="Instalar App"
                            >
                                <DownloadCloud size={20} />
                            </button>
                        )}
                        <button
                            onClick={() => setIsGoogleConfigOpen(true)}
                            className="p-2 text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full"
                        >
                            <Settings2 size={20} />
                        </button>
                    </div>
                </header>

                <div className="p-4">
                    {months.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <div className="bg-white p-6 rounded-full inline-block mb-4 shadow-sm">
                                <PieChart size={40} className="text-blue-200" />
                            </div>
                            <p>No tienes gastos cargados.</p>
                            <p className="text-sm">Crea un mes para empezar.</p>
                        </div>
                    ) : (
                        months.map(month => {
                            const mExpenses = expenses.filter(e => e.monthId === month.id);
                            const bal = calculateBalance(mExpenses, month.splitRatio);
                            return (
                                <MonthCard
                                    key={month.id}
                                    month={month}
                                    balance={bal}
                                    onClick={() => setActiveMonthId(month.id)}
                                />
                            );
                        })
                    )}
                </div>

                <button
                    onClick={() => setIsNewMonthModalOpen(true)}
                    className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-95 flex items-center gap-2 font-semibold z-20"
                >
                    <Plus size={24} /> Nuevo Mes
                </button>

                <SettingsModal
                    isOpen={isNewMonthModalOpen}
                    onClose={() => setIsNewMonthModalOpen(false)}
                    config={null}
                    onSave={handleCreateMonth}
                    isNew={true}
                />

                <GoogleConfigModal
                    isOpen={isGoogleConfigOpen}
                    onClose={() => setIsGoogleConfigOpen(false)}
                />
            </div>
        );
    }

    // --- Render: Active Month Details ---
    const chartData = activeExpenses.reduce((acc, curr) => {
        const existing = acc.find((i: any) => i.name === curr.category);
        if (existing) {
            existing.value += curr.amount;
        } else {
            acc.push({ name: curr.category, value: curr.amount });
        }
        return acc;
    }, [] as any[]);

    return (
        <div className="min-h-screen bg-gray-50 pb-24 max-w-lg mx-auto relative">
            {/* Header */}
            <header className="bg-blue-600 text-white p-4 sticky top-0 z-30 shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setActiveMonthId(null)} className="p-1 hover:bg-blue-500 rounded-full">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-lg font-bold truncate">{activeMonth?.name}</h2>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-1 hover:bg-blue-500 rounded-full">
                        <MoreVertical size={24} />
                    </button>
                </div>

                <div className="bg-white rounded-xl p-4 text-gray-800 shadow-lg flex flex-col gap-3">
                    <div className="flex justify-between items-end border-b pb-3 border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Gastado</p>
                            <p className="text-2xl font-bold">${activeBalance?.totalSpent.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">División</p>
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                                Yo: {activeMonth?.splitRatio}%
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex-1 border-r border-gray-100 pr-4">
                            <p className="text-xs text-gray-500">Tú pagaste</p>
                            <p className="font-semibold">${activeBalance?.paidByMe.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-400">Justo: ${activeBalance?.myFairShare.toFixed(2)}</p>
                        </div>
                        <div className="flex-1 pl-4 text-right">
                            {Math.abs(activeBalance?.balance || 0) < 0.1 ? (
                                <p className="text-green-600 font-bold">Cuentas Claras</p>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-500">
                                        {(activeBalance?.balance || 0) > 0 ? "Te deben" : "Debes"}
                                    </p>
                                    <p className={`text-xl font-bold ${(activeBalance?.balance || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        ${Math.abs(activeBalance?.balance || 0).toFixed(2)}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="p-4 space-y-6">

                {/* Actions Row */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleGoogleSync}
                        disabled={isSyncing}
                        className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-70 disabled:scale-100"
                    >
                        {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <Sheet size={20} />}
                        {isSyncing ? 'Sincronizando...' : 'Enviar a Excel (Drive)'}
                    </button>
                    {/* Status Message */}
                    {syncStatus && (
                        <div className={`col-span-2 p-3 rounded-lg text-sm text-center font-medium animate-in fade-in slide-in-from-top-2 ${syncStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {syncStatus.msg}
                        </div>
                    )}

                    <button
                        onClick={handleExportCSV}
                        className="bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm active:bg-gray-50"
                    >
                        <Download size={18} /> Backup CSV
                    </button>
                    <button
                        onClick={handleAnalyze}
                        className="bg-white border border-gray-200 text-purple-700 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm active:bg-gray-50"
                    >
                        <PieChart size={18} /> IA Insight
                    </button>
                </div>

                {/* AI Insight Box */}
                {aiInsight && (
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-sm text-purple-900 animate-in fade-in">
                        <div className="flex items-start gap-2">
                            <Info className="shrink-0 mt-0.5" size={16} />
                            <div className="whitespace-pre-line">{aiInsight}</div>
                        </div>
                    </div>
                )}

                {/* Chart */}
                {activeExpenses.length > 0 && (
                    <div className="h-48 w-full bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" hide />
                                <YAxis hide />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#8b5cf6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Expense List */}
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 ml-1">Historial</h3>
                    <div className="space-y-3">
                        {activeExpenses.length === 0 && <p className="text-center text-gray-400 py-4">No hay gastos aún.</p>}
                        {activeExpenses.map(expense => (
                            <div key={expense.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                                <div className="flex gap-3 items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${expense.payer === User.Me ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                        {expense.payer === User.Me ? 'YO' : 'PAR'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{expense.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{expense.category}</span>
                                            <span>•</span>
                                            <span>{expense.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900">${expense.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Add Button */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-300 hover:bg-blue-700 transition-transform active:scale-95 z-20"
            >
                <Plus size={28} />
            </button>

            {/* Modals */}
            <AddExpenseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddExpense}
                defaultPayer={User.Me}
            />

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                config={activeMonth || null}
                onSave={handleUpdateMonth}
            />

            <GoogleConfigModal
                isOpen={isGoogleConfigOpen}
                onClose={() => setIsGoogleConfigOpen(false)}
            />
        </div>
    );
};

export default App;