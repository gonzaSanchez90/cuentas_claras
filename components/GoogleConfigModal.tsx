import React, { useState, useEffect } from 'react';
import { X, Save, Key, AlertTriangle, Copy, Check } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const GoogleConfigModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [clientId, setClientId] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('google_client_id');
        if (stored) setClientId(stored);

        // Detectar URL actual limpia (sin path, solo dominio y puerto)
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.origin);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!clientId.trim()) return;
        localStorage.setItem('google_client_id', clientId.trim());
        window.location.reload();
    };

    const copyUrl = () => {
        navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gray-100 p-4 border-b flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Key size={20} className="text-orange-600" />
                        Configuración Google
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">

                    {/* Alerta de Entorno */}
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                        <h3 className="text-blue-800 font-bold text-sm mb-2">Paso 1: Autorizar esta URL</h3>
                        <p className="text-xs text-blue-700 mb-3">
                            Google necesita saber exactamente desde dónde te conectas. Si estás en Vercel, será tu dominio de Vercel. Si estás probando ahora, es esta URL temporal:
                        </p>

                        <div className="flex items-center gap-2 bg-white border border-blue-200 p-2 rounded-lg">
                            <code className="flex-1 text-xs font-mono text-gray-600 truncate select-all">
                                {currentUrl}
                            </code>
                            <button
                                onClick={copyUrl}
                                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                                title="Copiar URL"
                            >
                                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-500" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-blue-500 mt-2">
                            * Pega esto en "Orígenes autorizados de JavaScript" en tu consola de Google Cloud.
                        </p>
                    </div>

                    {/* Instrucciones Error 400 */}
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                            <AlertTriangle size={18} />
                            ¿Error 400: invalid_request?
                        </div>
                        <ol className="list-decimal list-inside text-xs text-red-900 space-y-1 pl-1">
                            <li>Ve a "Pantalla de consentimiento" (OAuth consent screen).</li>
                            <li>Asegúrate de que esté en modo <strong>"Prueba" (Testing)</strong>.</li>
                            <li>En <strong>"Test users"</strong>, agrega TU correo: <code>gonza.fede.sanchezg@gmail.com</code>.</li>
                            <li><strong>IMPORTANTE:</strong> Si estás editando código, <a href={currentUrl} target="_blank" rel="noreferrer" className="underline font-bold">abre esta app en una PESTAÑA NUEVA</a> antes de loguearte.</li>
                        </ol>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Paso 2: Tu Client ID</label>
                        <input
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="7803...apps.googleusercontent.com"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 text-xs font-mono break-all"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <Save size={20} /> Guardar y Recargar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoogleConfigModal;