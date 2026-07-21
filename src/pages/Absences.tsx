import React, { useEffect, useState } from 'react';
import { supabase, Ausencias, BACKEND_URL } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from '../components/FileUpload';
import PDFViewer from '../components/PDFViewer';
import { Layout } from '../components/Layout';
import { FieldHelp } from '../components/FieldHelp';
import { Plus, CheckCircle, XCircle, Clock, Eye, Upload, Trash2, CalendarRange, FileWarning, ShieldAlert, ClipboardX, BookMarked } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Absences: React.FC = () => {
  const { profile, userRole } = useAuth();
  const [absences, setAbsences] = useState<Ausencias[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Ausencias | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{ url: string; name: string } | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);
  
  // Estados para organizar la vista agrupada por año y sección
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [activeSections, setActiveSections] = useState<Record<string, string>>({});

  // Estados para búsqueda, filtro de estado y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'aprobada' | 'rechazada'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [newAbsence, setNewAbsence] = useState({
    nombre_alumno_descripcion: '',
    ano_escolar: '',
    seccion: '',
    telefono_representante: '',
    motivo: '',
    fecha_desde: '',
    fecha_hasta: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comentarioInstitucion, setComentarioInstitucion] = useState('');

  useEffect(() => {
    fetchAbsences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, userRole]);

  const fetchAbsences = async () => {
    if (!profile) return;
    try {
      let query = supabase.from('ausencias').select('*').order('created_at', { ascending: false });

      // If parent, only see theirs. Admin/Secretary see all.
      if (userRole === 'parent') {
        query = query.eq('id_representante', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAbsences(data || []);
    } catch (error) {
      console.error('Error fetching absences:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDFReport = async () => {
    try {
      setDownloadingPDF(true);

      // 1. Obtener datos agrupados
      let reportData: any[] = [];
      try {
        const res = await fetch(`${BACKEND_URL}/api/ausencias/reporte-acumulado`);
        const json = await res.json();
        if (json.data) {
          reportData = json.data;
        } else {
          throw new Error(json.error?.message || 'Error en respuesta de reporte');
        }
      } catch (err) {
        console.warn('Fallo al obtener reporte desde el backend, agrupando en memoria:', err);
        // Agrupar localmente en memoria (fallback)
        const groups: Record<string, { nombre: string; ano: string; seccion: string; telefono: string; count: number }> = {};
        absences.forEach(abs => {
          const name = abs.nombre_alumno_descripcion.trim();
          if (!groups[name]) {
            groups[name] = {
              nombre: name,
              ano: abs.ano_escolar || 'N/A',
              seccion: abs.seccion || 'N/A',
              telefono: abs.telefono_representante || 'N/D',
              count: 0
            };
          }
          groups[name].count += 1;
        });
        reportData = Object.values(groups).map(g => ({
          nombre_alumno_descripcion: g.nombre,
          ano_escolar: g.ano,
          seccion: g.seccion,
          telefono_representante: g.telefono,
          total_inasistencias: g.count
        })).sort((a, b) => b.total_inasistencias - a.total_inasistencias);
      }

      if (reportData.length === 0) {
        toast.error('No hay inasistencias registradas para generar el reporte.');
        setDownloadingPDF(false);
        return;
      }

      // 2. Cargar Logo
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = src;
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
        });
      };

      let logoImg: HTMLImageElement | null = null;
      try {
        logoImg = await loadImage('/logo_liceo.jpg.jpeg');
      } catch (imgErr) {
        console.error('Error cargando el logo para el PDF:', imgErr);
      }

      // 3. Crear documento PDF (Letter, mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      // 4. Dibujar membrete en la página inicial
      // Recuadro exterior
      doc.setDrawColor(10, 22, 40); // Azul oscuro
      doc.setLineWidth(0.5);
      doc.rect(15, 15, 185.9, 35); // Margen de 15 mm en los lados. Ancho = 215.9 - 30 = 185.9 mm

      // Logo del liceo
      if (logoImg) {
        doc.addImage(logoImg, 'JPEG', 18, 17.5, 30, 30);
      }

      // Texto del membrete
      doc.setTextColor(10, 22, 40); // Azul oscuro
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('LICEO NACIONAL JOAQUINA SÁNCHEZ', 52, 26);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('CÓDIGO DEL PLANTEL: S1140D0701', 52, 33);
      doc.text('BOLÍVAR, SAN FÉLIX', 52, 40);

      // Fecha y hora de emisión (dinámica)
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // Gray slate
      doc.text('FECHA DE EMISIÓN:', 195, 25, { align: 'right' });
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(10, 22, 40);
      doc.text(dateStr, 195, 30, { align: 'right' });
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Hora: ${timeStr}`, 195, 36, { align: 'right' });

      // 5. Título del Reporte
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(10, 22, 40);
      doc.text('CONTROL ACUMULATIVO DE INASISTENCIAS', 107.95, 62, { align: 'center' });

      // 6. Generar datos de la tabla
      const bodyData = reportData.map((item, index) => [
        (index + 1).toString(),
        item.nombre_alumno_descripcion,
        `${item.ano_escolar} - ${item.seccion}`,
        item.telefono_representante || 'N/D',
        item.total_inasistencias.toString()
      ]);

      // 7. Renderizar Tabla Autotable
      autoTable(doc, {
        startY: 70,
        head: [['N°', 'Estudiante', 'Año / Sección', 'Teléfono Representante', 'Total Inasistencias']],
        body: bodyData,
        theme: 'striped',
        headStyles: {
          fillColor: [10, 22, 40], // Azul oscuro (#0a1628)
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // N°
          1: { cellWidth: 'auto', halign: 'left' }, // Estudiante
          2: { cellWidth: 35, halign: 'center' }, // Año / Sección
          3: { cellWidth: 45, halign: 'center' }, // Teléfono Representante
          4: { cellWidth: 35, halign: 'center' }  // Total Inasistencias
        },
        styles: {
          fontSize: 9,
          cellPadding: 3.5,
          lineColor: [226, 232, 240], // Bordes delgados y limpios
          lineWidth: 0.1
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Alternancia limpia
        },
        margin: { left: 15, right: 15 }
      });

      // 8. Nota Legal al Final de la Tabla
      const finalY = (doc as any).lastAutoTable.finalY || 70;
      let noteY = finalY + 10;

      if (noteY > 255) {
        doc.addPage();
        noteY = 20;
      }

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      
      const legalText = 'Nota: Este documento refleja estrictamente el total acumulado de inasistencias procesadas de forma digital en el sistema hasta la fecha y hora de su emisión. Uso meramente informativo para el personal administrativo y docente.';
      const splitText = doc.splitTextToSize(legalText, 185.9);
      doc.text(splitText, 15, noteY);

      // 9. Añadir Paginación Dinámica (Página X de Y)
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${totalPages}`, 107.95, 272, { align: 'center' });
      }

      // 10. Guardar y Descargar PDF
      const formattedDate = dateStr.replace(/\//g, '-');
      doc.save(`Reporte_Inasistencias_${formattedDate}.pdf`);
      toast.success('Reporte PDF descargado con éxito.');
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      toast.error('Error al generar el reporte en PDF: ' + (err.message || ''));
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleCreateAbsence = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecciona un archivo PDF justificativo');
      return;
    }

    if (!newAbsence.nombre_alumno_descripcion || !newAbsence.ano_escolar || !newAbsence.seccion || !newAbsence.telefono_representante || !newAbsence.motivo || !newAbsence.fecha_desde || !newAbsence.fecha_hasta) {
      toast.error('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (newAbsence.fecha_hasta < newAbsence.fecha_desde) {
      toast.error('La fecha de fin (hasta) no puede ser anterior a la fecha de inicio (desde).');
      return;
    }

    try {
      setUploading(true);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`;
      const filePath = `ausencias/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos_pdf')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        toast.error(`Error al subir el justificativo: ${uploadError.message}`);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('documentos_pdf')
        .getPublicUrl(filePath);

      const { error: absenceError } = await supabase
        .from('ausencias')
        .insert([
          {
            id_representante: profile?.id,
            nombre_alumno_descripcion: newAbsence.nombre_alumno_descripcion,
            ano_escolar: newAbsence.ano_escolar,
            seccion: newAbsence.seccion,
            telefono_representante: newAbsence.telefono_representante,
            motivo: newAbsence.motivo,
            fecha_desde: newAbsence.fecha_desde,
            fecha_hasta: newAbsence.fecha_hasta,
            ruta_pdf_justificativo: urlData.publicUrl,
            estado: 'pendiente'
          },
        ]);

      if (absenceError) {
        console.error('Error inserting absence row:', absenceError);
        toast.error(`Error al registrar los datos en la base de datos: ${absenceError.message}`);
        throw absenceError;
      }

      setShowCreateModal(false);
      setNewAbsence({
        nombre_alumno_descripcion: '',
        ano_escolar: '',
        seccion: '',
        telefono_representante: '',
        motivo: '',
        fecha_desde: '',
        fecha_hasta: '',
      });
      setSelectedFile(null);
      fetchAbsences();
      toast.success('Solicitud enviada con éxito. El plantel procesará su caso a la brevedad.');
    } catch (error) {
      console.error('Error creating absence:', error);
      toast.error('Error al crear la inasistencia. Por favor, intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedAbsence) return;

    let comment = '';
    if (modalAction === 'approve') {
      comment = 'Su solicitud de inasistencia ha sido aprobada satisfactoriamente.';
    } else {
      if (!comentarioInstitucion.trim()) {
        toast.error('Por favor, indique la razón del rechazo.');
        return;
      }
      comment = comentarioInstitucion;
    }

    try {
      const { error } = await supabase
        .from('ausencias')
        .update({
          estado: modalAction === 'approve' ? 'aprobada' : 'rechazada',
          comentario_institucion: comment
        })
        .eq('id', selectedAbsence.id);

      if (error) throw error;

      toast.success(modalAction === 'approve' ? 'Inasistencia aprobada con éxito.' : 'Inasistencia rechazada con éxito.');
      setShowModal(false);
      setSelectedAbsence(null);
      setComentarioInstitucion('');
      fetchAbsences();
    } catch (error) {
      console.error('Error updating absence:', error);
      toast.error('Error al actualizar el estado de la inasistencia.');
    }
  };

  const handleViewPdf = (fileUrl: string, fileName: string) => {
    setSelectedPdf({ url: fileUrl, name: fileName });
    setPdfViewerOpen(true);
  };

  const handleDeleteAbsence = async () => {
    if (!selectedAbsence) return;

    try {
      setDeleting(true);

      if (selectedAbsence.ruta_pdf_justificativo) {
        const filePath = selectedAbsence.ruta_pdf_justificativo.split('/documentos_pdf/')[1];
        if (filePath) {
          await supabase.storage
            .from('documentos_pdf')
            .remove([filePath]);
        }
      }

      const { error } = await supabase
        .from('ausencias')
        .delete()
        .eq('id', selectedAbsence.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setSelectedAbsence(null);
      fetchAbsences();
    } catch (error) {
      console.error('Error deleting absence:', error);
      toast.error('Error al eliminar la inasistencia. Por favor, intenta nuevamente.');
    } finally {
      setDeleting(false);
    }
  };

  // Group absences by student for Admin/Secretary
  const studentGroups = React.useMemo(() => {
    const groups: Record<string, { count: number; absences: Ausencias[]; ano: string; seccion: string }> = {};
    absences.forEach(abs => {
      const name = abs.nombre_alumno_descripcion.trim();
      if (!groups[name]) {
        groups[name] = { count: 0, absences: [], ano: abs.ano_escolar || 'N/A', seccion: abs.seccion || 'N/A' };
      }
      groups[name].count += 1;
      groups[name].absences.push(abs);
    });
    return Object.entries(groups).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.count - a.count);
  }, [absences]);

  // Agrupación jerárquica por Año y Sección para la nueva vista estructurada
  const groupedByYearAndSection = React.useMemo(() => {
    const hierarchy: Record<string, Record<string, typeof studentGroups>> = {};
    const yearOrder = ['1er Año', '2do Año', '3er Año', '4to Año', '5to Año'];

    // Inicializar para mantener el orden
    yearOrder.forEach(yr => {
      hierarchy[yr] = {};
    });

    studentGroups.forEach(student => {
      const yr = student.ano || 'Otro';
      const sec = student.seccion || 'Sin Sección';

      if (!hierarchy[yr]) {
        hierarchy[yr] = {};
      }
      if (!hierarchy[yr][sec]) {
        hierarchy[yr][sec] = [];
      }
      hierarchy[yr][sec].push(student);
    });

    const result: Array<{
      year: string;
      totalStudents: number;
      sections: Array<{ sectionName: string; students: typeof studentGroups }>;
    }> = [];

    // Agregar años ordenados
    yearOrder.forEach(yr => {
      if (hierarchy[yr] && Object.keys(hierarchy[yr]).length > 0) {
        const sectionsArr: Array<{ sectionName: string; students: typeof studentGroups }> = [];
        let totalStudents = 0;

        // Ordenar secciones alfabéticamente
        const sortedSecNames = Object.keys(hierarchy[yr]).sort();
        sortedSecNames.forEach(secName => {
          const students = hierarchy[yr][secName].sort((a, b) => a.name.localeCompare(b.name));
          totalStudents += students.length;
          sectionsArr.push({
            sectionName: secName,
            students
          });
        });

        result.push({
          year: yr,
          totalStudents,
          sections: sectionsArr
        });
      }
    });

    // Agregar otros años no contemplados
    Object.keys(hierarchy).forEach(yr => {
      if (!yearOrder.includes(yr) && Object.keys(hierarchy[yr]).length > 0) {
        const sectionsArr: Array<{ sectionName: string; students: typeof studentGroups }> = [];
        let totalStudents = 0;

        const sortedSecNames = Object.keys(hierarchy[yr]).sort();
        sortedSecNames.forEach(secName => {
          const students = hierarchy[yr][secName].sort((a, b) => a.name.localeCompare(b.name));
          totalStudents += students.length;
          sectionsArr.push({
            sectionName: secName,
            students
          });
        });

        result.push({
          year: yr,
          totalStudents,
          sections: sectionsArr
        });
      }
    });

    return result;
  }, [studentGroups]);

  // Efecto para abrir automáticamente el primer año y la primera sección que contengan datos
  useEffect(() => {
    if (groupedByYearAndSection.length > 0) {
      if (!expandedYear || !groupedByYearAndSection.some(g => g.year === expandedYear)) {
        setExpandedYear(groupedByYearAndSection[0].year);
      }

      setActiveSections(prev => {
        const updated = { ...prev };
        let changed = false;
        groupedByYearAndSection.forEach(g => {
          if (g.sections.length > 0 && !updated[g.year]) {
            updated[g.year] = g.sections[0].sectionName;
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }
  }, [groupedByYearAndSection, expandedYear]);

  // Reiniciar página a 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedStudentFilter]);

  const displayedAbsences = React.useMemo(() => {
    let result = absences;

    if (selectedStudentFilter) {
      result = result.filter(abs => abs.nombre_alumno_descripcion.trim() === selectedStudentFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(abs => abs.nombre_alumno_descripcion.toLowerCase().includes(term));
    }

    if (statusFilter !== 'todos') {
      result = result.filter(abs => abs.estado === statusFilter);
    }

    return result;
  }, [absences, selectedStudentFilter, searchTerm, statusFilter]);

  const paginatedAbsences = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return displayedAbsences.slice(startIndex, startIndex + itemsPerPage);
  }, [displayedAbsences, currentPage]);

  const totalPages = Math.ceil(displayedAbsences.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    const badges = {
      pendiente: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock, text: 'Pendiente' },
      aprobada: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, text: 'Aprobada' },
      rechazada: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, text: 'Rechazada' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pendiente;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${badge.color}`}>
        <Icon className="w-4 h-4 mr-1.5" />
        {badge.text}
      </span>
    );
  };

  const getCardBorderColor = (status: string) => {
    switch (status) {
      case 'aprobada': return 'border-l-green-500';
      case 'rechazada': return 'border-l-red-500';
      default: return 'border-l-orange-500';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Corporate Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0a1628] via-[#0d2b5e] to-blue-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white rounded-full" />
          <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-white rounded-full" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 border border-white/20 backdrop-blur-sm p-3.5 rounded-2xl shadow-inner">
              <ClipboardX className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Gestión de Inasistencias</h1>
              <p className="text-blue-200/70 text-sm mt-0.5 font-medium">
                {userRole === 'parent'
                  ? 'Administra y envía justificativos de inasistencia'
                  : 'Revisa y gestiona las solicitudes de inasistencias recibidas'}
              </p>
            </div>
          </div>
          {userRole === 'parent' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-white text-blue-900 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all shadow-lg font-bold text-sm w-fit shrink-0"
            >
              <Plus className="w-4 h-4" />
              Reportar Inasistencia
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
      {userRole !== 'parent' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-4 bg-white p-2 rounded-xl border border-gray-100 w-fit">
            <button
              onClick={() => { setViewMode('list'); setSelectedStudentFilter(null); }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'list' && !selectedStudentFilter ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Todas las Solicitudes
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'grouped' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Resumen por Alumno ({studentGroups.length})
            </button>
          </div>
          <button
            onClick={generatePDFReport}
            disabled={downloadingPDF}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            {downloadingPDF ? 'Generando Reporte...' : 'Descargar Reporte PDF'}
          </button>
        </div>
      )}
      {viewMode === 'list' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Buscador — solo visible para admin y secretaría */}
          {userRole !== 'parent' && (
          <div className="relative flex-1 max-w-md w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar alumno por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition outline-none text-sm font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                Limpiar
              </button>
            )}
          </div>
          )}

          {/* Filtro de Estado */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Filtrar por:</span>
            {(['todos', 'pendiente', 'aprobada', 'rechazada'] as const).map((status) => {
              const isActive = statusFilter === status;
              const statusStyles = {
                todos: { active: 'bg-blue-600 text-white shadow-blue-100', inactive: 'bg-white hover:bg-gray-50 text-gray-600 border-gray-250/70' },
                pendiente: { active: 'bg-orange-500 text-white shadow-orange-100', inactive: 'bg-orange-50/50 hover:bg-orange-50 text-orange-700 border-orange-150' },
                aprobada: { active: 'bg-green-600 text-white shadow-green-100', inactive: 'bg-green-50/50 hover:bg-green-50 text-green-700 border-green-150' },
                rechazada: { active: 'bg-red-600 text-white shadow-red-100', inactive: 'bg-red-50/50 hover:bg-red-50 text-red-700 border-red-150' },
              };
              const style = statusStyles[status];
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase transition-all border ${
                    isActive ? `${style.active} scale-105 border-transparent` : `${style.inactive}`
                  }`}
                >
                  {status === 'todos' ? 'Todos' : status === 'pendiente' ? 'Pendientes' : status === 'aprobada' ? 'Aprobadas' : 'Rechazadas'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedStudentFilter && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
          <span className="text-sm font-bold text-blue-800">
            Mostrando justificativos para: <span className="underline">{selectedStudentFilter}</span>
          </span>
          <button
            onClick={() => setSelectedStudentFilter(null)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
          >
            Mostrar Todos
          </button>
        </div>
      )}

      {viewMode === 'grouped' ? (
            studentGroups.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
                <BookMarked className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">No hay inasistencias registradas</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedByYearAndSection.map((yearGroup) => {
                  const isExpanded = expandedYear === yearGroup.year;
                  return (
                    <div key={yearGroup.year} className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden transition-all duration-300">
                      {/* Cabecera del año escolar */}
                      <button
                        onClick={() => setExpandedYear(isExpanded ? null : yearGroup.year)}
                        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-[#0a1628] to-[#122644] text-white hover:from-[#11233d] hover:to-[#1a3359] transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎓</span>
                          <div>
                            <h3 className="font-extrabold text-base tracking-wide">{yearGroup.year}</h3>
                            <p className="text-xs text-blue-200/70 font-semibold">
                              {yearGroup.totalStudents} {yearGroup.totalStudents === 1 ? 'estudiante con inasistencias' : 'estudiantes con inasistencias'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                            {yearGroup.sections.length} {yearGroup.sections.length === 1 ? 'sección' : 'secciones'}
                          </span>
                          <span className={`transform transition-transform duration-300 text-xs text-blue-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </div>
                      </button>

                      {/* Contenido expandible */}
                      {isExpanded && (
                        <div className="p-6 bg-slate-50/40 border-t border-gray-100 space-y-6">
                          {/* Selector de Sección (Pestañas) */}
                          <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
                            {yearGroup.sections.map((sec) => {
                              const isActive = activeSections[yearGroup.year] === sec.sectionName;
                              return (
                                <button
                                  key={sec.sectionName}
                                  onClick={() => setActiveSections(prev => ({ ...prev, [yearGroup.year]: sec.sectionName }))}
                                  className={`px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-sm ${
                                    isActive
                                      ? 'bg-blue-600 text-white shadow-blue-100 scale-105'
                                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
                                  }`}
                                >
                                  {sec.sectionName} ({sec.students.length})
                                </button>
                              );
                            })}
                          </div>

                          {/* Cuadrícula de alumnos filtrados por sección */}
                          {(() => {
                            const currentSection = yearGroup.sections.find(s => s.sectionName === activeSections[yearGroup.year]);
                            if (!currentSection) return null;

                            return (
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {currentSection.students.map((student) => (
                                  <div
                                    key={student.name}
                                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex flex-col justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-widest">
                                          {student.ano} - {student.seccion}
                                        </span>
                                        <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                                          {student.count} {student.count === 1 ? 'reposo' : 'reposos'}
                                        </span>
                                      </div>
                                      <h3 className="text-base font-black text-gray-900 mb-2 truncate" title={student.name}>
                                        {student.name}
                                      </h3>
                                      <p className="text-xs text-gray-400 font-medium mb-4">
                                        Última inasistencia el {new Date(student.absences[0].created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSelectedStudentFilter(student.name);
                                        setViewMode('list');
                                      }}
                                      className="w-full py-2.5 px-4 bg-gradient-to-r from-[#0a1628] to-blue-800 text-white font-bold text-xs rounded-xl hover:opacity-95 transition-all text-center tracking-wider uppercase"
                                    >
                                      Ver Expediente Completo
                                    </button>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : displayedAbsences.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-5">
              <BookMarked className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sin inasistencias registradas</h3>
            <p className="text-gray-400 max-w-sm mx-auto text-sm">
              {userRole === 'parent'
                ? 'Aún no has registrado ninguna solicitud de inasistencia en el sistema.'
                : 'No se encontraron solicitudes de inasistencias registradas.'}
            </p>
          </div>
        ) : (
          paginatedAbsences.map((absence) => (
            <div
              key={absence.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${getCardBorderColor(absence.estado)} p-6 hover:shadow-md transition-all group`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-4 mb-2">
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                      {absence.nombre_alumno_descripcion}
                    </h3>
                    {getStatusBadge(absence.estado)}
                  </div>
                  {(absence.ano_escolar || absence.seccion) && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {absence.ano_escolar && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full">
                          🎓 {absence.ano_escolar}
                        </span>
                      )}
                      {absence.seccion && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1 rounded-full">
                          📚 {absence.seccion}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-red-50 rounded text-red-500 mt-1">
                        <FileWarning size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Motivo</p>
                        <p className="text-gray-700 font-medium">{absence.motivo}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-orange-50 rounded text-orange-500 mt-1">
                        <CalendarRange size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Fechas</p>
                        <p className="text-gray-700 font-medium">
                          Desde: {new Date(absence.fecha_desde).toLocaleDateString()} Hasta: {new Date(absence.fecha_hasta).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {absence.telefono_representante && (
                      <div className="flex items-start gap-2">
                        <div className="p-1 bg-blue-50 rounded text-blue-500 mt-1">
                          📞
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Teléfono del Representante</p>
                          <p className="text-gray-700 font-medium">{absence.telefono_representante}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {absence.ruta_pdf_justificativo && (
                    <button
                      onClick={() => handleViewPdf(absence.ruta_pdf_justificativo!, `Justificativo_${absence.nombre_alumno_descripcion}.pdf`)}
                      className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition px-3 py-2 bg-blue-50 rounded-lg w-fit"
                    >
                      <Eye size={16} />
                      Ver Justificativo Médico
                    </button>
                  )}

                  {absence.comentario_institucion && (
                    <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 text-sm ${
                      absence.estado === 'aprobada'
                        ? 'bg-green-50/50 border-green-100 text-green-800'
                        : 'bg-red-50/50 border-red-100 text-red-800'
                    }`}>
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        absence.estado === 'aprobada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {absence.estado === 'aprobada' ? <CheckCircle size={16} /> : <ShieldAlert size={16} />}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-xs uppercase tracking-wider mb-0.5">
                          {absence.estado === 'aprobada' ? 'Comentario de Aprobación' : 'Razón del Rechazo'}
                        </p>
                        <p className="font-medium text-gray-700">{absence.comentario_institucion}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 md:bg-gray-50 md:p-3 rounded-xl">
                  {(userRole === 'admin' || userRole === 'secretary') && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAbsence(absence);
                          setModalAction('approve');
                          setShowModal(true);
                        }}
                        className="p-2.5 bg-white text-green-600 border border-green-100 rounded-lg hover:bg-green-600 hover:text-white transition shadow-sm"
                        title="Aprobar"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAbsence(absence);
                          setModalAction('reject');
                          setShowModal(true);
                        }}
                        className="p-2.5 bg-white text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition shadow-sm"
                        title="Rechazar"
                      >
                        <XCircle size={20} />
                      </button>
                    </>
                  )}
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        setSelectedAbsence(absence);
                        setShowDeleteModal(true);
                      }}
                      className="p-2.5 bg-white text-gray-400 border border-gray-100 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition shadow-sm"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Paginación de Solicitudes */}
        {viewMode === 'list' && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Mostrando {Math.min(displayedAbsences.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(displayedAbsences.length, currentPage * itemsPerPage)} de {displayedAbsences.length} solicitudes
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS PERSISTED FROM ORIGINAL VERSION BUT WITH STYLING UPDATES */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="text-blue-600" /> Reportar Inasistencia
            </h2>
            <div className="grid gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Estudiante</label>
                <FieldHelp
                  hint="Escribe el nombre completo del estudiante tal como aparece en la lista de clase."
                  example="María González"
                  position="bottom"
                >
                  <input
                    type="text"
                    value={newAbsence.nombre_alumno_descripcion}
                    onChange={(e) => setNewAbsence({ ...newAbsence, nombre_alumno_descripcion: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition outline-none"
                  />
                </FieldHelp>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Año Escolar *</label>
                  <FieldHelp
                    hint="Selecciona el año que cursa el estudiante. Va desde 1er Año hasta 5to Año."
                    example="3er Año"
                    position="bottom"
                  >
                    <select
                      value={newAbsence.ano_escolar}
                      onChange={(e) => setNewAbsence({ ...newAbsence, ano_escolar: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition outline-none"
                      required
                    >
                      <option value="">Seleccione el año...</option>
                      <option value="1er Año">1er Año</option>
                      <option value="2do Año">2do Año</option>
                      <option value="3er Año">3er Año</option>
                      <option value="4to Año">4to Año</option>
                      <option value="5to Año">5to Año</option>
                    </select>
                  </FieldHelp>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Sección *</label>
                  <FieldHelp
                    hint="Selecciona la sección a la que pertenece el estudiante (letra del aula)."
                    example="Sección C"
                    position="bottom"
                  >
                    <select
                      value={newAbsence.seccion}
                      onChange={(e) => setNewAbsence({ ...newAbsence, seccion: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition outline-none"
                      required
                    >
                      <option value="">Seleccione la sección...</option>
                      {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letra => (
                        <option key={letra} value={`Sección ${letra}`}>Sección {letra}</option>
                      ))}
                    </select>
                  </FieldHelp>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Fecha Inicio</label>
                  <FieldHelp
                    hint="Selecciona el primer día de la inasistencia del estudiante."
                    example="2025-03-10 (lunes)"
                    position="bottom"
                  >
                    <input
                      type="date"
                      value={newAbsence.fecha_desde}
                      onChange={(e) => setNewAbsence({ ...newAbsence, fecha_desde: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none"
                    />
                  </FieldHelp>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Fecha Fin</label>
                  <FieldHelp
                    hint="Selecciona el último día de la inasistencia. Si fue solo un día, usa la misma fecha de inicio."
                    example="2025-03-12 (miércoles)"
                    position="bottom"
                  >
                    <input
                      type="date"
                      value={newAbsence.fecha_hasta}
                      min={newAbsence.fecha_desde || undefined}
                      onChange={(e) => setNewAbsence({ ...newAbsence, fecha_hasta: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none"
                    />
                  </FieldHelp>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  📞 Teléfono del Representante *
                </label>
                <FieldHelp
                  hint="Número de contacto del representante. Incluye el prefijo de la operadora (04xx)."
                  example="0412-7654321"
                  position="bottom"
                >
                  <input
                    type="tel"
                    value={newAbsence.telefono_representante}
                    onChange={(e) => setNewAbsence({ ...newAbsence, telefono_representante: e.target.value })}
                    placeholder="Ej. 0412-1234567"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition outline-none"
                    required
                  />
                </FieldHelp>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Motivo / Descripción</label>
                <FieldHelp
                  hint="Describe brevemente la causa de la inasistencia. Este texto acompaña el justificativo PDF."
                  example="Reposo médico por gripe, indicado por el Dr. Ramírez."
                  position="bottom"
                >
                  <textarea
                    value={newAbsence.motivo}
                    onChange={(e) => setNewAbsence({ ...newAbsence, motivo: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition outline-none"
                    placeholder="Explique el motivo de la inasistencia..."
                  />
                </FieldHelp>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Justificativo (PDF)</label>
                <FieldHelp
                  hint="Adjunta el reposo médico u otro documento oficial en formato PDF. Máximo 5 MB."
                  example="reposo_medico_maria.pdf"
                  position="bottom"
                >
                  <FileUpload
                    onFileSelect={setSelectedFile}
                    maxSize={5 * 1024 * 1024}
                    accept=".pdf"
                    disabled={uploading}
                  />
                </FieldHelp>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
              <button
                onClick={() => { setShowCreateModal(false); setSelectedFile(null); }}
                className="px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAbsence}
                disabled={uploading || !selectedFile}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? 'Procesando...' : <><Upload size={20} /> Enviar Solicitud</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE/REJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${modalAction === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {modalAction === 'approve' ? <CheckCircle size={40} /> : <ShieldAlert size={40} />}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {modalAction === 'approve' ? '¿Aprobar Inasistencia?' : '¿Rechazar Inasistencia?'}
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
              Esta acción actualizará el estado de la solicitud y el representante podrá ver la resolución.
            </p>

            {modalAction === 'reject' && (
              <div className="mb-6 text-left">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Motivo de rechazo (Obligatorio)
                </label>
                <textarea
                  value={comentarioInstitucion}
                  onChange={(e) => setComentarioInstitucion(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition outline-none text-sm text-gray-800"
                  placeholder="Ej: Sus campos no cumplen con los requisitos, por favor diríjase hasta la institución..."
                  required
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setComentarioInstitucion(''); }}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateStatus}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition shadow-lg ${modalAction === 'approve' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Eliminar Registro</h3>
            <p className="text-gray-500 mb-8">
              ¿Estás seguro de que deseas eliminar permanentemente esta inasistencia y su archivo adjunto?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAbsence}
                disabled={deleting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-100"
              >
                {deleting ? 'Eliminando...' : 'Eliminar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfViewerOpen && selectedPdf && (
        <PDFViewer
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false);
            setSelectedPdf(null);
          }}
          fileUrl={selectedPdf.url}
          fileName={selectedPdf.name}
        />
      )}
    </Layout>
  );
};

