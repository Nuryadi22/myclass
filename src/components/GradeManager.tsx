'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { GraduationCap, Plus, X, Save, ChevronDown, BookOpen, Trash2, Filter, Search, Eye, Edit, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { storeGradesAction, deleteGradesBySubjectMaterialAction } from '@/app/actions/teacher';
import { SUBJECTS } from '@/lib/subjects';

interface Student {
  id: number;
  name: string;
  studentId: string;
}

interface GradeEntry {
  id: number;
  studentId: number;
  studentName: string;
  subject: string;
  material: string;
  score: number;
  createdAt: string;
}

interface GradeManagerProps {
  students: Student[];
  grades: GradeEntry[];
}

function getScoreColor(score: number) {
  if (score >= 90) return 'text-emerald-600 bg-emerald-50';
  if (score >= 80) return 'text-blue-600 bg-blue-50';
  if (score >= 70) return 'text-amber-600 bg-amber-50';
  if (score >= 60) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

function getScoreLabel(score: number) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

export default function GradeManager({ students, grades }: GradeManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [isPending, startTransition] = useTransition();
  const [actionState, setActionState] = useState<{ error?: string; success?: boolean; message?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ subject: string; material: string } | null>(null);
  const [viewGradeTarget, setViewGradeTarget] = useState<{ subject: string; material: string } | null>(null);
  const router = useRouter();

  // Form state
  const [formSubject, setFormSubject] = useState('');
  const [formMaterial, setFormMaterial] = useState('');
  const [scores, setScores] = useState<Record<number, string>>({});

  // Get distinct materials for selected subject filter
  const availableMaterials = useMemo(() => {
    if (!filterSubject) return [];
    const mats = grades
      .filter((g) => g.subject === filterSubject)
      .map((g) => g.material);
    return [...new Set(mats)];
  }, [grades, filterSubject]);

  // Filtered grades
  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      const matchSubject = filterSubject ? g.subject === filterSubject : true;
      const matchMaterial = filterMaterial ? g.material === filterMaterial : true;
      const matchStudent = searchStudent
        ? g.studentName.toLowerCase().includes(searchStudent.toLowerCase())
        : true;
      return matchSubject && matchMaterial && matchStudent;
    });
  }, [grades, filterSubject, filterMaterial, searchStudent]);

  // Group grades by student for the filtered view
  const gradesByStudent = useMemo(() => {
    const map: Record<number, { name: string; scores: Record<string, number> }> = {};
    for (const student of students) {
      map[student.id] = { name: student.name, scores: {} };
    }
    for (const g of filteredGrades) {
      if (map[g.studentId]) {
        const key = `${g.subject}__${g.material}`;
        map[g.studentId].scores[key] = g.score;
      }
    }
    return map;
  }, [students, filteredGrades]);

  // Get existing scores for the modal (pre-fill if editing)
  const existingScoresForForm = useMemo(() => {
    if (!formSubject || !formMaterial) return {};
    const map: Record<number, number> = {};
    for (const g of grades) {
      if (g.subject === formSubject && g.material === formMaterial) {
        map[g.studentId] = g.score;
      }
    }
    return map;
  }, [grades, formSubject, formMaterial]);

  const handleOpenModal = () => {
    setFormSubject('');
    setFormMaterial('');
    setScores({});
    setActionState(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActionState(null);
  };

  const handleSubjectChange = (subject: string) => {
    setFormSubject(subject);
    setFormMaterial('');
    // Pre-fill scores if existing
    setScores({});
  };

  const handleMaterialChange = (material: string) => {
    setFormMaterial(material);
    // Pre-fill existing scores
    const existing: Record<number, string> = {};
    for (const g of grades) {
      if (g.subject === formSubject && g.material === material) {
        existing[g.studentId] = g.score.toString();
      }
    }
    setScores(existing);
  };

  const handleScoreChange = (studentId: number, value: string) => {
    setScores((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionState(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await storeGradesAction(null, formData);
      setActionState(result as any);
      if ((result as any).success) {
        setTimeout(() => {
          setIsModalOpen(false);
          router.refresh();
        }, 1200);
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteGradesBySubjectMaterialAction(deleteTarget.subject, deleteTarget.material);
    setIsDeleting(false);
    setDeleteTarget(null);
    if ((result as any).success) {
      router.refresh();
    }
  };

  // Unique subject+material combos from filtered grades (for table header)
  const subjectMaterialCols = useMemo(() => {
    const seen = new Set<string>();
    const cols: { subject: string; material: string }[] = [];
    for (const g of filteredGrades) {
      const key = `${g.subject}__${g.material}`;
      if (!seen.has(key)) {
        seen.add(key);
        cols.push({ subject: g.subject, material: g.material });
      }
    }
    return cols;
  }, [filteredGrades]);

  const handleEditGrade = () => {
    if (!viewGradeTarget) return;
    setFormSubject(viewGradeTarget.subject);
    setFormMaterial(viewGradeTarget.material);
    
    // pre-fill scores
    const existing: Record<number, string> = {};
    for (const g of grades) {
      if (g.subject === viewGradeTarget.subject && g.material === viewGradeTarget.material) {
        existing[g.studentId] = g.score.toString();
      }
    }
    setScores(existing);
    
    setViewGradeTarget(null);
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    let title = 'Laporan Nilai Murid';
    
    const subjectText = filterSubject ? filterSubject : 'Semua Mata Pelajaran';

    const data: any[][] = [];
    data.push([title]);
    data.push([`Mata Pelajaran: ${subjectText}`]);
    data.push([]); // Empty row

    const headerRow = ['No', 'Nama Murid', 'NISN'];
    subjectMaterialCols.forEach(col => {
      headerRow.push(col.material);
    });
    data.push(headerRow);

    const filteredStudents = students.filter((s) => !searchStudent || s.name.toLowerCase().includes(searchStudent.toLowerCase()));

    filteredStudents.forEach((student, index) => {
      const rowData: any[] = [
        index + 1,
        student.name,
        student.studentId
      ];
      
      subjectMaterialCols.forEach(col => {
        const key = `${col.subject}__${col.material}`;
        const score = gradesByStudent[student.id]?.scores[key];
        rowData.push(score !== undefined ? score : '');
      });
      
      data.push(rowData);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } });
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } });
    
    XLSX.utils.book_append_sheet(wb, ws, "Nilai");
    XLSX.writeFile(wb, `${title.replace(/[\s/]/g, '_')}_${subjectText.replace(/[\s/]/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-8">
      {/* Header + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            Manajemen Nilai Murid
          </h2>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            Input, kelola, dan pantau nilai seluruh murid berdasarkan mata pelajaran.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Cetak Nilai
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Input Nilai Baru
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filter:</span>

          {/* Subject Filter */}
          <div className="relative">
            <select
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value);
                setFilterMaterial('');
              }}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none cursor-pointer"
            >
              <option value="">Semua Mata Pelajaran</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Material Filter */}
          {filterSubject && (
            <div className="relative">
              <select
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none cursor-pointer"
              >
                <option value="">Semua Materi</option>
                {availableMaterials.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Search Student */}
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Cari nama murid..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            />
          </div>

          {(filterSubject || filterMaterial || searchStudent) && (
            <button
              onClick={() => { setFilterSubject(''); setFilterMaterial(''); setSearchStudent(''); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 font-semibold cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Grade Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {subjectMaterialCols.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-slate-400 font-bold text-sm">
              {grades.length === 0 ? 'Belum ada data materi yang diinput.' : 'Tidak ada data ditemukan untuk filter yang dipilih.'}
            </p>
            {grades.length === 0 && students.length > 0 && (
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-bold text-xs transition-colors cursor-pointer mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> Input Nilai Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  <th className="px-5 py-4 font-extrabold text-slate-600">Mata Pelajaran</th>
                  <th className="px-5 py-4 font-extrabold text-slate-600">Materi / KD</th>
                  <th className="px-5 py-4 font-extrabold text-slate-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {subjectMaterialCols.map((col, idx) => (
                  <tr
                    key={`${col.subject}__${col.material}`}
                    className={`border-b border-slate-50 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                  >
                    <td className="px-5 py-4 font-bold text-indigo-700">
                      {col.subject}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {col.material}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewGradeTarget({ subject: col.subject, material: col.material })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Nilai
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ subject: col.subject, material: col.material })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Grades Modal */}
      {viewGradeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-100 shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 leading-tight">Detail Nilai Murid</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{viewGradeTarget.subject} - {viewGradeTarget.material}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditGrade}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-all cursor-pointer text-xs font-bold"
                >
                  <Edit className="w-4 h-4" /> Edit Nilai
                </button>
                <button
                  onClick={() => setViewGradeTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left font-extrabold pb-3 text-slate-600">Nama Murid</th>
                    <th className="text-center font-extrabold pb-3 text-slate-600">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter((s) => !searchStudent || s.name.toLowerCase().includes(searchStudent.toLowerCase()))
                    .map((student, idx) => {
                      const key = `${viewGradeTarget.subject}__${viewGradeTarget.material}`;
                      const score = gradesByStudent[student.id]?.scores[key];
                      return (
                        <tr key={student.id} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="py-3 px-2 font-bold text-slate-800">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                                {student.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 leading-tight">{student.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{student.studentId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {score !== undefined ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-extrabold ${getScoreColor(score)}`}>
                                  {score}
                                  <span className="text-[10px] opacity-70">{getScoreLabel(score)}</span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
            <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setViewGradeTarget(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Hapus Data Nilai?</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                Semua nilai <strong>{deleteTarget.subject}</strong> - <em>{deleteTarget.material}</em> untuk seluruh murid akan dihapus.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-md shadow-red-100 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Nilai Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-100 shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 leading-tight">Input Nilai Murid</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Isi nilai untuk seluruh murid dalam satu form.</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {/* Subject + Material */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Mata Pelajaran <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="subject"
                        required
                        value={formSubject}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Pilih Mata Pelajaran --</option>
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Materi / KD <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="material"
                      type="text"
                      required
                      value={formMaterial}
                      onChange={(e) => handleMaterialChange(e.target.value)}
                      placeholder="Contoh: Bab 1, UTS, PTS..."
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Score inputs per student */}
                {formSubject && formMaterial && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Nilai Murid <span className="text-slate-400 font-semibold">(0 - 100)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">{students.length} murid</span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                      {students.map((student, idx) => {
                        const currentScore = scores[student.id] ?? '';
                        const scoreNum = parseFloat(currentScore);
                        const isValid = currentScore === '' || (!isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 100);

                        return (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between px-4 py-3 ${idx !== students.length - 1 ? 'border-b border-slate-100' : ''}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                                {student.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 leading-tight">{student.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{student.studentId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {currentScore && !isNaN(scoreNum) && (
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${getScoreColor(scoreNum)}`}>
                                  {getScoreLabel(scoreNum)}
                                </span>
                              )}
                              <input
                                name={`score_${student.id}`}
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={currentScore}
                                onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                placeholder="—"
                                className={`w-20 px-2.5 py-2 text-center font-extrabold text-sm rounded-xl border focus:ring-2 focus:outline-none transition-all ${
                                  !isValid
                                    ? 'border-red-300 bg-red-50 text-red-600 focus:ring-red-200'
                                    : currentScore
                                    ? 'border-indigo-200 bg-indigo-50 text-indigo-800 focus:ring-indigo-200'
                                    : 'border-slate-200 bg-white text-slate-700 focus:ring-indigo-200'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!formSubject && (
                  <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                    Pilih mata pelajaran dan isi materi terlebih dahulu untuk menampilkan daftar murid.
                  </div>
                )}

                {/* Action state */}
                {actionState?.error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-700">
                    {actionState.error}
                  </div>
                )}
                {actionState?.success && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-700">
                    ✓ {actionState.message}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formSubject || !formMaterial}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Nilai
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
