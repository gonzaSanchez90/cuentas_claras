import React, { useState, useEffect } from 'react';
import { MonthConfig } from '../types';
import { X, Settings, Check } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    config: MonthConfig | null;
    onSave: (name: string, ratio: number) => void;
    isNew?: boolean;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, config, onSave, isNew }) => {
    const [name, setName] = useState('');
    const [ratio, setRatio] = useState(50);

    useEffect(() => {
        if (isOpen && config) {
            setName(config.name);
            setRatio(config.splitRatio);
        } else if (isOpen && isNew) {
            const now = new Date();
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            setName(`${monthNames[now.getMonth()]} ${now.getFullYear()}`);
            setRatio(50);
        }
    }, [isOpen, config, isNew]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Settings className="text-blue-500" size={24} />
                        {isNew ? 'Crear Nuevo Mes' : 'Configuración'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Evento / Mes</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            placeholder="Ej: Vacaciones 2024"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="text-blue-600">Yo ({ratio}%)</span>
                            <span className="text-purple-600">Pareja ({100 - ratio}%)</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={ratio}
                            onChange={(e) => setRatio(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Ajusta el porcentaje si los sueldos no son iguales.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            onSave(name, ratio);
                            onClose();
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <Check size={20} /> Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;