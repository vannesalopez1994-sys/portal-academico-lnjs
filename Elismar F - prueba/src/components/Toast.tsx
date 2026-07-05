import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
    message: string;
    duration?: number;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, duration = 4000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div
            className={`fixed bottom-8 right-8 z-[100] transform transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
        >
            <div className="bg-white border-l-4 border-green-500 rounded-lg shadow-2xl p-4 pr-12 flex items-center gap-3 min-w-[300px]">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-900">¡Bienvenido!</p>
                    <p className="text-sm text-gray-600 font-medium">{message}</p>
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
