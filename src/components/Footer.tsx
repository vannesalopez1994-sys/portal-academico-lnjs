import React from 'react';
import { Instagram, Mail, MapPin, ChevronRight, School2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-[#050d1a] border-t border-blue-900/30 text-white pt-8 pb-3 mt-auto">
            <div className="max-w-[95%] mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">

                    {/* Identity & Brand */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo_liceo.jpg.jpeg"
                                alt="Logo Liceo"
                                className="w-9 h-9 object-contain rounded-lg"
                            />
                            <div>
                                <div className="font-bold text-sm text-white tracking-wide">Aplicación Académica</div>
                                <div className="text-[10px] text-blue-400/60 font-medium tracking-widest uppercase">L.N. Joaquina Sánchez</div>
                            </div>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed border-l-2 border-blue-800/50 pl-3 italic">
                            "Formando líderes del mañana | Educación de calidad y valores"
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <a
                                href="https://www.instagram.com/liceojoaquina"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-pink-600 hover:border-pink-500 hover:scale-110 transition-all text-gray-400 hover:text-white"
                                title="Instagram"
                            >
                                <Instagram className="w-3.5 h-3.5" />
                            </a>
                            <a
                                href="mailto:l.n.joaquinasanchez@gmail.com"
                                className="w-8 h-8 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 hover:scale-110 transition-all text-gray-400 hover:text-white"
                                title="Correo"
                            >
                                <Mail className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-xs font-bold mb-3 text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-3 h-px bg-blue-600 inline-block" />
                            Atajos Rápidos
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    to="/documents"
                                    className="group flex items-center gap-2 text-gray-500 hover:text-blue-400 transition-colors text-xs font-medium"
                                >
                                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-blue-700" />
                                    <span>Ver Reglamento Escolar</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/schedules"
                                    className="group flex items-center gap-2 text-gray-500 hover:text-blue-400 transition-colors text-xs font-medium"
                                >
                                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-blue-700" />
                                    <span>Ver Horario General</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/absences"
                                    className="group flex items-center gap-2 text-gray-500 hover:text-blue-400 transition-colors text-xs font-medium"
                                >
                                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-blue-700" />
                                    <span>Gestionar Inasistencias</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h3 className="text-xs font-bold mb-3 text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-3 h-px bg-blue-600 inline-block" />
                            Información de Contacto
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2.5">
                                <div className="p-1 bg-blue-900/40 rounded border border-blue-800/30 mt-0.5">
                                    <Mail className="w-3 h-3 text-blue-400" />
                                </div>
                                <a href="mailto:l.n.joaquinasanchez@gmail.com" className="text-gray-500 hover:text-white transition-colors text-xs leading-relaxed">
                                    l.n.joaquinasanchez@gmail.com
                                </a>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <div className="p-1 bg-red-900/30 rounded border border-red-800/20 mt-0.5 flex-shrink-0">
                                    <MapPin className="w-3 h-3 text-red-400" />
                                </div>
                                <span className="text-gray-500 text-[11px] leading-relaxed">
                                    Urb. Nueva Chirica, Calle 07, Parroquia Chirica,<br />Ciudad Guayana, Bolívar
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Divider + Copyright */}
                <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-gray-600 text-[10px]">
                        © 2026 L.N. Joaquina Sánchez. Todos los derechos reservados.
                    </p>
                    <div className="flex items-center gap-1.5 text-gray-700 text-[10px]">
                        <School2 className="w-3 h-3" />
                        <span>Liceo Nacional Joaquina Sánchez · Ciudad Guayana, Venezuela</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
