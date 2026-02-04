import React, { useState } from 'react';
import { Category, Expense, User } from '../types';
import { parseExpenseString } from '../services/geminiService';
import { X, Sparkles, Loader2, Save } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: Omit<Expense, 'id' | 'monthId'>) => void;
    defaultPayer: User;
}

const AddExpenseModal: React.FC<Props> = ({ isOpen, onClose, onSave, defaultPayer }) => {
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [payer, setPayer] = useState<User>(defaultPayer);
    const [category, setCategory] = useState<Category>(Category.Misc);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    if (!isOpen) return null;

    const handleAiParse = async () => {
        if (!aiPrompt.trim()) return;
        setIsAiLoading(true);
        const result = await parseExpenseString(aiPrompt);
        setIsAiLoading(false);

        if (result) {
            setTitle(result.title);
            setAmount(result.amount.toString());
            setPayer(result.payer);
            setCategory(result.category);
            setDate(result.date);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !amount) return;
        onSave({
            title,
            amount: parseFloat(amount),
            payer,
            category,
            date,
        });
        // Reset
        setTitle('');
        setAmount('');
        setAiPrompt('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-800">Nuevo Gasto</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>

                {/* AI Input */}
                <div className="bg-purple-50 p-4 border-b border-purple-100">
                    <label className="text-xs font-bold text-purple-700 mb-1 block flex items-center gap-1">
                        <Sparkles size={12} /> Carga Rápida con IA
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Ej: Cena anoche 45 pagó ella"
                            className="flex-1 text-sm rounded-lg border-purple-200 focus:border-purple-500 focus:ring-purple-500 p-2 border text-gray-900 bg-white"
                        />
                        <button
                            onClick={handleAiParse}
                            disabled={isAiLoading || !aiPrompt}
                            className="bg-purple-600 text-white p-2 rounded-lg disabled:opacity-50"
                        >
                            {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        </button>
                    </div>
                </div>

                {/* Manual Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                        <input
                            required
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            placeholder="¿Qué compraste?"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500">$</span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full p-3 pl-7 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg text-gray-900"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="w-1/3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pagado por</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setPayer(User.Me)}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${payer === User.Me ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                >
                                    Yo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayer(User.Partner)}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${payer === User.Partner ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                >
                                    Pareja
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as Category)}
                            className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none text-gray-900"
                        >
                            {Object.values(Category).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-4"
                    >
                        <Save size={20} /> Guardar Gasto
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddExpenseModal;