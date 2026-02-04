import React from 'react';
import { MonthConfig, BalanceResult } from '../types';
import { ChevronRight, Calendar, PiggyBank } from 'lucide-react';

interface Props {
    month: MonthConfig;
    balance: BalanceResult;
    onClick: () => void;
}

const MonthCard: React.FC<Props> = ({ month, balance, onClick }) => {
    const owesMe = balance.balance > 0;
    const absBalance = Math.abs(balance.balance);

    return (
        <div
            onClick={onClick}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors mb-3"
        >
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${month.name.toLowerCase().includes('vacaciones') ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {month.name.toLowerCase().includes('vacaciones') ? <PiggyBank size={20} /> : <Calendar size={20} />}
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800">{month.name}</h3>
                    <p className="text-xs text-gray-500">
                        Total: ${balance.totalSpent.toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="text-right">
                {absBalance < 0.01 ? (
                    <span className="text-sm font-medium text-green-600">Saldado</span>
                ) : (
                    <>
                        <p className={`text-sm font-bold ${owesMe ? 'text-green-600' : 'text-red-500'}`}>
                            {owesMe ? 'Te deben' : 'Debes'}
                        </p>
                        <p className="text-lg font-bold text-gray-900">${absBalance.toFixed(2)}</p>
                    </>
                )}
            </div>

            <ChevronRight className="text-gray-300 ml-2" size={20} />
        </div>
    );
};

export default MonthCard;