import React from 'react';
import { Instagram, Mail, MapPin, ExternalLink, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-900 text-white pt-6 pb-2 mt-auto">
            <div className="max-w-[95%] mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                    {/* Identity & Motto */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-600 rounded">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-lg tracking-tight">L.N. Joaquina Sánchez</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed italic">
                            "Formando líderes del mañana | Educación de calidad y valores"
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                            <a
                                href="https://www.instagram.com/liceojoaquina"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 hover:scale-110 transition-all text-gray-300 hover:text-white"
                                title="Instagram"
                            >
                                <Instagram className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 border-b border-gray-800 pb-1">Atajos Rápidos</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    to="/documents"
                                    className="group flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors text-xs"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    <span>Ver Reglamento Escolar</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/schedules"
                                    className="group flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors text-xs"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    <span>Ver Horario General</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 border-b border-gray-800 pb-1">Información de Contacto</h3>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                                <Mail className="w-4 h-4 text-blue-500 mt-0.5" />
                                <a href="mailto:l.n.joaquinasanchez@gmail.com" className="text-gray-400 hover:text-white transition-colors text-xs">
                                    l.n.joaquinasanchez@gmail.com
                                </a>
                            </li>
                            <li className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-400 text-[11px] leading-relaxed">
                                    Urb. Nueva Chirica, Calle 07, Parroquia Chirica, Ciudad Guayana, Bolívar
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-gray-800 pt-4 text-center text-gray-500 text-[10px]">
                    <p>© 2026 L.N. Joaquina Sánchez - Todos los derechos reservados</p>
                </div>
            </div>
        </footer>
    );
};
