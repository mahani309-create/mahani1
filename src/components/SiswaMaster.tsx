/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { Siswa, UserRole } from '../types';

// Helper component for generating offline QR Code ("barcode kotak")
function StudentQrCode({ value, size = 68 }: { value: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(value, {
      margin: 1,
      width: size * 3, // High resolution for beautiful printing
      color: {
        dark: '#0f172a', // Deep slate/black
        light: '#ffffff'
      }
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error('Error generating QR Code:', err));
  }, [value, size]);

  if (!qrUrl) {
    return <div className="animate-pulse bg-slate-200 rounded-lg" style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={qrUrl}
      alt={`QR Code ${value}`}
      style={{ width: size, height: size }}
      className="object-contain rounded-lg border border-slate-200 shadow-xs"
    />
  );
}
import {
  Search,
  Plus,
  User,
  Phone,
  MapPin,
  Heart,
  Briefcase,
  Users,
  Printer,
  X,
  Edit2,
  FileText,
  BadgeAlert,
  AlertCircle,
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  QrCode,
  IdCard,
  Sliders,
  GraduationCap
} from 'lucide-react';
import { exportSiswaToExcel, importSiswaFromExcel, downloadSiswaExcelTemplate } from '../lib/dataHelper';
import { generateCode39Svg } from '../lib/barcodeHelper';

interface SiswaMasterProps {
  role: UserRole;
  kelasWali?: string;
  siswaList: Siswa[];
  onAddSiswa: (siswa: Omit<Siswa, 'id' | 'totalPoin'>) => void;
  onUpdateSiswa: (siswa: Siswa) => void;
  onBulkUpdateSiswa?: (updatedSiswaList: Siswa[]) => void;
  initialSelectedStudentId?: string;
}

export default function SiswaMaster({
  role,
  kelasWali,
  siswaList,
  onAddSiswa,
  onUpdateSiswa,
  onBulkUpdateSiswa,
  initialSelectedStudentId,
}: SiswaMasterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('SEMUA');
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(
    initialSelectedStudentId ? (siswaList.find(s => s.id === initialSelectedStudentId) || null) : null
  );

  // Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showCardPreview, setShowCardPreview] = useState(false);
  const [showBulkClassModal, setShowBulkClassModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<'class' | 'selected'>('class');
  const [bulkSourceClass, setBulkSourceClass] = useState('');
  const [bulkTargetClass, setBulkTargetClass] = useState('');
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);
  
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Form states
  const [formNama, setFormNama] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formKelas, setFormKelas] = useState('XI-IPA-1');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Alumni' | 'Pindah'>('Aktif');
  const [formTtl, setFormTtl] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formNoHp, setFormNoHp] = useState('');
  const [formNamaOrtu, setFormNamaOrtu] = useState('');
  const [formPekerjaanOrtu, setFormPekerjaanOrtu] = useState('');
  const [formKontakDarurat, setFormKontakDarurat] = useState('');
  const [formRiwayatMedis, setFormRiwayatMedis] = useState('');
  const [formFotoUrl, setFormFotoUrl] = useState('');

  // Setup edit form
  const handleOpenEdit = (student: Siswa) => {
    setFormNama(student.nama);
    setFormNisn(student.nisn);
    setFormKelas(student.kelas);
    setFormStatus(student.status);
    setFormTtl(student.ttl);
    setFormAlamat(student.alamat);
    setFormNoHp(student.noHp);
    setFormNamaOrtu(student.namaOrtu);
    setFormPekerjaanOrtu(student.pekerjaanOrtu);
    setFormKontakDarurat(student.kontakDarurat);
    setFormRiwayatMedis(student.riwayatMedis);
    setFormFotoUrl(student.fotoUrl || '');
    setShowEditModal(true);
  };

  const handleExecuteBulkUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onBulkUpdateSiswa) return;

    if (bulkMode === 'class') {
      if (!bulkSourceClass.trim() || !bulkTargetClass.trim()) {
        alert('Mohon masukkan kelas asal dan kelas tujuan!');
        return;
      }
      const studentsToUpdate = siswaList.filter(s => s.kelas.trim().toUpperCase() === bulkSourceClass.trim().toUpperCase());
      if (studentsToUpdate.length === 0) {
        alert(`Tidak ditemukan siswa aktif di kelas "${bulkSourceClass.toUpperCase()}"!`);
        return;
      }
      const updated = studentsToUpdate.map(s => ({
        ...s,
        kelas: bulkTargetClass.trim().toUpperCase()
      }));
      onBulkUpdateSiswa(updated);
      setBulkSuccessMessage(`Sukses! ${studentsToUpdate.length} siswa dari kelas ${bulkSourceClass.trim().toUpperCase()} dipindahkan ke kelas ${bulkTargetClass.trim().toUpperCase()}.`);
    } else {
      if (selectedStudentIds.length === 0) {
        alert('Tidak ada siswa terpilih! Centang siswa di tabel terlebih dahulu.');
        return;
      }
      if (!bulkTargetClass.trim()) {
        alert('Mohon tentukan kelas tujuan!');
        return;
      }
      const studentsToUpdate = siswaList.filter(s => selectedStudentIds.includes(s.id));
      const updated = studentsToUpdate.map(s => ({
        ...s,
        kelas: bulkTargetClass.trim().toUpperCase()
      }));
      onBulkUpdateSiswa(updated);
      setBulkSuccessMessage(`Sukses! ${studentsToUpdate.length} siswa terpilih dipindahkan ke kelas ${bulkTargetClass.trim().toUpperCase()}.`);
      setSelectedStudentIds([]); // Reset checklist
    }

    setBulkSourceClass('');
    setBulkTargetClass('');
    setTimeout(() => {
      setBulkSuccessMessage(null);
      setShowBulkClassModal(false);
    }, 2500);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSiswa({
      nama: formNama,
      nisn: formNisn,
      kelas: formKelas,
      status: formStatus,
      ttl: formTtl,
      alamat: formAlamat,
      noHp: formNoHp,
      namaOrtu: formNamaOrtu,
      pekerjaanOrtu: formPekerjaanOrtu,
      kontakDarurat: formKontakDarurat,
      riwayatMedis: formRiwayatMedis || 'Tidak ada catatan khusus.',
      fotoUrl: formFotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    });
    // Reset
    resetForm();
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    const updated: Siswa = {
      ...selectedStudent,
      nama: formNama,
      nisn: formNisn,
      kelas: formKelas,
      status: formStatus,
      ttl: formTtl,
      alamat: formAlamat,
      noHp: formNoHp,
      namaOrtu: formNamaOrtu,
      pekerjaanOrtu: formPekerjaanOrtu,
      kontakDarurat: formKontakDarurat,
      riwayatMedis: formRiwayatMedis,
      fotoUrl: formFotoUrl,
    };
    onUpdateSiswa(updated);
    setSelectedStudent(updated);
    setShowEditModal(false);
  };

  const resetForm = () => {
    setFormNama('');
    setFormNisn('');
    setFormKelas('XI-IPA-1');
    setFormStatus('Aktif');
    setFormTtl('');
    setFormAlamat('');
    setFormNoHp('');
    setFormNamaOrtu('');
    setFormPekerjaanOrtu('');
    setFormKontakDarurat('');
    setFormRiwayatMedis('');
    setFormFotoUrl('');
  };

  // Determine active class restriction based on user role
  const activeClassFilter = useMemo(() => {
    if (role === 'WALI_KELAS' && kelasWali) {
      return kelasWali;
    }
    return selectedClass;
  }, [role, kelasWali, selectedClass]);

  // Filtered Students list
  const filteredStudents = useMemo(() => {
    return siswaList.filter(s => {
      const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
      const matchClass = activeClassFilter === 'SEMUA' || s.kelas === activeClassFilter;
      return matchSearch && matchClass;
    });
  }, [siswaList, searchTerm, activeClassFilter]);

  // Classes list for dropdown
  const classList = useMemo(() => {
    const classes = new Set(siswaList.map(s => s.kelas));
    return Array.from(classes).sort();
  }, [siswaList]);

  const handleExportData = () => {
    exportSiswaToExcel(filteredStudents);
  };

  const handleDownloadTemplate = () => {
    downloadSiswaExcelTemplate();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    importSiswaFromExcel(file)
      .then(students => {
        if (students.length === 0) {
          setImportError('Tidak ada data siswa valid yang ditemukan di file Excel.');
          return;
        }

        // Add each student
        students.forEach(student => {
          onAddSiswa(student);
        });

        setImportSuccess(`Berhasil mengimpor ${students.length} data siswa baru dari Excel!`);
        setImportError(null);
        setTimeout(() => setImportSuccess(null), 4000);
        setShowImportModal(false);
      })
      .catch((err: any) => {
        setImportError(err.message || 'Terjadi kesalahan saat memproses file Excel.');
      });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="siswa-master-tab" className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Data Master Bio-Psikologis Siswa</h2>
          <p className="text-xs text-slate-500 mt-0.5">Daftar biodata diri, riwayat medis, profil keluarga, dan status akumulasi poin siswa SMP NEGERI 3 KRAS.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Button */}
          <button
            id="btn-export-siswa"
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs"
            title="Ekspor Data Siswa ke format Excel/CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Ekspor Excel</span>
          </button>

          {/* Import Button (BK Only) */}
          {role === 'GURU_BK' && (
            <button
              id="btn-import-siswa-modal"
              onClick={() => { setImportError(null); setImportSuccess(null); setShowImportModal(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-indigo-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs"
              title="Impor Data Siswa dari file Excel/CSV"
            >
              <Upload className="h-3.5 w-3.5 text-indigo-500" />
              <span>Impor Excel</span>
            </button>
          )}

          {role === 'GURU_BK' && (
            <button
              id="btn-bulk-class-modal-trigger"
              onClick={() => setShowBulkClassModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition-all cursor-pointer shadow-xs"
              title="Atur Kelas Massal atau Naik Kelas Satu Angkatan"
            >
              <Sliders className="h-3.5 w-3.5 text-amber-600" />
              <span>Atur Kelas Massal</span>
            </button>
          )}

          {role === 'GURU_BK' && (
            <button
              id="btn-add-siswa"
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Tambah Siswa Baru
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Students Table & Filters */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-siswa"
                type="text"
                placeholder="Cari siswa berdasarkan nama atau NISN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {role !== 'WALI_KELAS' && (
              <div className="w-full md:w-auto">
                <select
                  id="filter-siswa-kelas"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="SEMUA">Semua Kelas</option>
                  {classList.map(cls => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>
            )}

            {role === 'WALI_KELAS' && (
              <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold">
                Kelas: {kelasWali}
              </span>
            )}
          </div>

          {/* Floating Bulk Action Bar */}
          {selectedStudentIds.length > 0 && role === 'GURU_BK' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
                  {selectedStudentIds.length}
                </span>
                <p className="text-xs text-amber-950 font-bold">
                  Siswa terpilih untuk tindakan massal.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkClassModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-extrabold shadow-xs transition-colors cursor-pointer"
                >
                  Ubah Kelas ({selectedStudentIds.length} Siswa)
                </button>
                <button
                  onClick={() => setSelectedStudentIds([])}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {role === 'GURU_BK' && (
                      <th scope="col" className="px-4 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds(filteredStudents.map(s => s.id));
                            } else {
                              setSelectedStudentIds([]);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Siswa</th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">NISN</th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Kelas</th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Poin Pelanggaran</th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((siswa) => (
                      <tr
                        key={siswa.id}
                        id={`siswa-row-${siswa.id}`}
                        onClick={() => setSelectedStudent(siswa)}
                        className={`cursor-pointer transition-colors ${
                          selectedStudent?.id === siswa.id ? 'bg-indigo-50/50 hover:bg-indigo-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        {role === 'GURU_BK' && (
                          <td className="px-4 py-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(siswa.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIds(prev => [...prev, siswa.id]);
                                } else {
                                  setSelectedStudentIds(prev => prev.filter(id => id !== siswa.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              className="h-8 w-8 rounded-full object-cover border border-slate-200"
                              src={siswa.fotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                              alt={siswa.nama}
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-800">{siswa.nama}</div>
                              <div className="text-[10px] text-slate-500">Kota: {siswa.ttl.split(',')[0]}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-600 font-semibold">{siswa.nisn}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs font-bold text-slate-700">{siswa.kelas}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            siswa.totalPoin >= 100
                              ? 'bg-red-100 text-red-800'
                              : siswa.totalPoin >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {siswa.totalPoin} Poin
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            siswa.status === 'Aktif' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {siswa.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={role === 'GURU_BK' ? 6 : 5} className="text-center py-10 text-xs text-slate-400 font-medium bg-slate-50/50">
                        Tidak ada siswa yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Profile Details View */}
        <div className="space-y-4">
          {selectedStudent ? (
            <div id="profile-detail-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Header card background color based on accumulated points */}
              <div className={`p-5 text-white ${
                selectedStudent.totalPoin >= 100
                  ? 'bg-gradient-to-br from-red-600 to-rose-700'
                  : selectedStudent.totalPoin >= 50
                  ? 'bg-gradient-to-br from-amber-600 to-amber-700'
                  : 'bg-gradient-to-br from-indigo-600 to-indigo-800'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      className="h-14 w-14 rounded-xl object-cover border-2 border-white/20 shadow-xs"
                      src={selectedStudent.fotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                      alt={selectedStudent.nama}
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="font-bold text-base leading-tight">{selectedStudent.nama}</h3>
                      <p className="text-xs text-indigo-100 font-medium mt-1">{selectedStudent.kelas} &bull; NISN: {selectedStudent.nisn}</p>
                    </div>
                  </div>
                  
                  {role === 'GURU_BK' && (
                    <button
                      id="btn-edit-siswa-profile"
                      onClick={() => handleOpenEdit(selectedStudent)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                      title="Edit Profil"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Point Warning Notification Block */}
                {selectedStudent.totalPoin >= 50 && (
                  <div className="mt-4 p-2 bg-white/10 backdrop-blur-xs rounded-lg flex items-center gap-2 text-[11px]">
                    <BadgeAlert className="h-4 w-4 shrink-0 text-white" />
                    <span className="font-semibold">
                      {selectedStudent.totalPoin >= 100
                        ? `Butuh Panggilan Orang Tua Kedua (SP2: ${selectedStudent.totalPoin} Poin)`
                        : `Surat Peringatan Pertama (SP1: ${selectedStudent.totalPoin} Poin)`}
                    </span>
                  </div>
                )}
              </div>

              {/* Detail Blocks */}
              <div className="p-5 space-y-5">
                
                {/* Data Pribadi */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Data Diri Siswa
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Tempat, Tanggal Lahir</span>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedStudent.ttl}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Nomor Handphone</span>
                      <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {selectedStudent.noHp}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Alamat Domisili</span>
                      <p className="font-bold text-slate-800 mt-0.5 flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{selectedStudent.alamat}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data Orang Tua */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-400" /> Profil Keluarga
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Nama Orang Tua / Wali</span>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedStudent.namaOrtu}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Pekerjaan Orang Tua</span>
                      <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400" /> {selectedStudent.pekerjaanOrtu}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Kontak Darurat</span>
                      <p className="font-bold text-rose-700 mt-0.5 font-semibold">{selectedStudent.kontakDarurat}</p>
                    </div>
                  </div>
                </div>

                {/* Riwayat Medis */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-red-500" /> Riwayat Medis / Kondisi Khusus
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-xl text-xs font-bold text-slate-800 leading-relaxed">
                    {selectedStudent.riwayatMedis}
                  </div>
                </div>

                {/* Print Bio Button */}
                <button
                  id="btn-print-student-bio"
                  onClick={() => setShowPrintPreview(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold transition-all border border-indigo-100 cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Cetak Biografi/Profil (PDF)
                </button>

                {/* Print Student Card Button */}
                <button
                  id="btn-print-student-card"
                  onClick={() => setShowCardPreview(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all border border-emerald-100 cursor-pointer mt-2"
                >
                  <IdCard className="h-4 w-4 text-emerald-600" /> Cetak Kartu Siswa (Barcode)
                </button>

              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-[400px]">
              <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Detail Profil Siswa</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                Silakan pilih salah satu siswa di tabel kiri untuk memuat data bio-psikologis, profil orang tua, riwayat medis, dan mencetak dokumen biografi.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* --- ADD STUDENT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                <Plus className="h-5 w-5 text-indigo-600" /> Tambah Siswa Baru (Guru BK)
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Contoh: Aditya Pratama"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NISN (10 Digit)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value)}
                    placeholder="Contoh: 0081234561"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="X-A">X-A</option>
                    <option value="X-B">X-B</option>
                    <option value="XI-IPA-1">XI-IPA-1</option>
                    <option value="XI-IPS-2">XI-IPS-2</option>
                    <option value="XII-IPA-2">XII-IPA-2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Keaktifan</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Pindah">Pindah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat, Tanggal Lahir</label>
                  <input
                    type="text"
                    required
                    value={formTtl}
                    onChange={(e) => setFormTtl(e.target.value)}
                    placeholder="Contoh: Jakarta, 12 April 2009"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. Handphone Siswa</label>
                  <input
                    type="text"
                    required
                    value={formNoHp}
                    onChange={(e) => setFormNoHp(e.target.value)}
                    placeholder="Contoh: 0812-xxxx-xxxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Foto URL (Opsional)</label>
                  <input
                    type="text"
                    value={formFotoUrl}
                    onChange={(e) => setFormFotoUrl(e.target.value)}
                    placeholder="Contoh: https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                <textarea
                  required
                  rows={2}
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  placeholder="Contoh: Jl. Merdeka No. 45, Kecamatan Gambir, Jakarta Pusat"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-3">Biodata Orang Tua & Kontak Keluarga</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ayah / Ibu / Wali</label>
                    <input
                      type="text"
                      required
                      value={formNamaOrtu}
                      onChange={(e) => setFormNamaOrtu(e.target.value)}
                      placeholder="Contoh: Bambang Pratama"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pekerjaan Orang Tua</label>
                    <input
                      type="text"
                      required
                      value={formPekerjaanOrtu}
                      onChange={(e) => setFormPekerjaanOrtu(e.target.value)}
                      placeholder="Contoh: Karyawan Swasta"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hubungan & Kontak Darurat (No. HP Ortu)</label>
                  <input
                    type="text"
                    required
                    value={formKontakDarurat}
                    onChange={(e) => setFormKontakDarurat(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890 (Ayah)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">Data Medis & Catatan Khusus</span>
                <textarea
                  rows={2}
                  value={formRiwayatMedis}
                  onChange={(e) => setFormRiwayatMedis(e.target.value)}
                  placeholder="Contoh: Alergi debu ringan, tidak ada catatan penyakit kronis."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT STUDENT MODAL --- */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                <Edit2 className="h-5 w-5 text-indigo-600" /> Ubah Data Bio-Psikologis Siswa
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NISN (10 Digit)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="X-A">X-A</option>
                    <option value="X-B">X-B</option>
                    <option value="XI-IPA-1">XI-IPA-1</option>
                    <option value="XI-IPS-2">XI-IPS-2</option>
                    <option value="XII-IPA-2">XII-IPA-2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Keaktifan</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Pindah">Pindah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat, Tanggal Lahir</label>
                  <input
                    type="text"
                    required
                    value={formTtl}
                    onChange={(e) => setFormTtl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. Handphone Siswa</label>
                  <input
                    type="text"
                    required
                    value={formNoHp}
                    onChange={(e) => setFormNoHp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Foto URL (Opsional)</label>
                  <input
                    type="text"
                    value={formFotoUrl}
                    onChange={(e) => setFormFotoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                <textarea
                  required
                  rows={2}
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-3">Biodata Orang Tua & Kontak Keluarga</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ayah / Ibu / Wali</label>
                    <input
                      type="text"
                      required
                      value={formNamaOrtu}
                      onChange={(e) => setFormNamaOrtu(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pekerjaan Orang Tua</label>
                    <input
                      type="text"
                      required
                      value={formPekerjaanOrtu}
                      onChange={(e) => setFormPekerjaanOrtu(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hubungan & Kontak Darurat (No. HP Ortu)</label>
                  <input
                    type="text"
                    required
                    value={formKontakDarurat}
                    onChange={(e) => setFormKontakDarurat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">Data Medis & Catatan Khusus</span>
                <textarea
                  rows={2}
                  value={formRiwayatMedis}
                  onChange={(e) => setFormRiwayatMedis(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ⭐ PRINT BIOGRAFI MODAL PREVIEW --- */}
      {showPrintPreview && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[95vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-indigo-600" /> Pratinjau Dokumen Cetak - Biografi Bio-Psikologis
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Sekarang (PDF)
                </button>
                <button onClick={() => setShowPrintPreview(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document body optimized for typical A4 single sheet printing */}
            <div className="flex-1 overflow-y-auto p-8 print:p-0 bg-slate-100 print:bg-white flex justify-center">
              <div className="print-paper-sheet bg-white p-10 print:p-0 w-full max-w-2xl border border-slate-300 print:border-0 shadow-lg print:shadow-none min-h-[842px] relative flex flex-col justify-between text-slate-800">
                
                {/* School Kop Surat */}
                <div>
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h2 className="font-extrabold text-lg text-slate-900 uppercase tracking-wide">Pemerintah Kabupaten Kediri</h2>
                    <h1 className="font-black text-xl text-slate-900 uppercase">SMP NEGERI 3 KRAS</h1>
                    <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">
                      Jl. Raya Kras, Kediri, Jawa Timur &bull; Telp: (0354) 441000
                    </p>
                    <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-wider">
                      Layanan Bimbingan dan Konseling (BK) &bull; SahabatBK
                    </p>
                  </div>

                  {/* Document Title */}
                  <div className="text-center mb-6">
                    <h3 className="font-bold text-sm uppercase underline tracking-wider text-slate-900">Kartu Biografi Bio-Psikologis Siswa</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Nomor Registrasi BK: BK/SMPN3KRAS/{new Date().getFullYear()}/{selectedStudent.id.toUpperCase()}</p>
                  </div>

                  {/* Bio Data Section */}
                  <div className="grid grid-cols-4 gap-6 items-start mb-6">
                    {/* Student Photo */}
                    <div className="col-span-1 flex flex-col items-center">
                      <div className="border border-slate-400 p-1 w-28 h-36 flex items-center justify-center bg-slate-50">
                        <img
                          src={selectedStudent.fotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                          alt={selectedStudent.nama}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold mt-2">Pas Foto 3x4</span>
                    </div>

                    {/* Bio fields table */}
                    <div className="col-span-3 text-xs space-y-2 text-slate-800">
                      <div className="grid grid-cols-3 border-b border-slate-200 pb-1">
                        <span className="font-bold text-slate-500 col-span-1">Nama Lengkap</span>
                        <span className="col-span-2 font-extrabold text-slate-900 uppercase">{selectedStudent.nama}</span>
                      </div>
                      <div className="grid grid-cols-3 border-b border-slate-200 pb-1">
                        <span className="font-bold text-slate-500 col-span-1">NISN</span>
                        <span className="col-span-2 font-bold">{selectedStudent.nisn}</span>
                      </div>
                      <div className="grid grid-cols-3 border-b border-slate-200 pb-1">
                        <span className="font-bold text-slate-500 col-span-1">Kelas</span>
                        <span className="col-span-2 font-bold">{selectedStudent.kelas}</span>
                      </div>
                      <div className="grid grid-cols-3 border-b border-slate-200 pb-1">
                        <span className="font-bold text-slate-500 col-span-1">Tempat, Tgl Lahir</span>
                        <span className="col-span-2 font-bold">{selectedStudent.ttl}</span>
                      </div>
                      <div className="grid grid-cols-3 border-b border-slate-200 pb-1">
                        <span className="font-bold text-slate-500 col-span-1">No. HP Siswa</span>
                        <span className="col-span-2 font-semibold">{selectedStudent.noHp}</span>
                      </div>
                      <div className="grid grid-cols-3 border-b border-slate-200 pb-1">
                        <span className="font-bold text-slate-500 col-span-1">Alamat Rumah</span>
                        <span className="col-span-2 text-[11px] leading-snug">{selectedStudent.alamat}</span>
                      </div>
                    </div>
                  </div>

                  {/* Family and medical data */}
                  <div className="space-y-4 mb-8">
                    {/* Family section */}
                    <div>
                      <h4 className="text-[11px] font-extrabold text-slate-900 bg-slate-100 px-2 py-1 uppercase tracking-wider mb-2 border-l-4 border-slate-700">I. Data Orang Tua / Wali</h4>
                      <table className="min-w-full text-xs">
                        <tbody>
                          <tr className="border-b border-slate-200">
                            <td className="py-1.5 font-bold text-slate-500 w-1/3">Nama Orang Tua / Wali</td>
                            <td className="py-1.5 font-semibold text-slate-800">{selectedStudent.namaOrtu}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="py-1.5 font-bold text-slate-500">Pekerjaan Orang Tua</td>
                            <td className="py-1.5 font-semibold text-slate-800">{selectedStudent.pekerjaanOrtu}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="py-1.5 font-bold text-slate-500">Nomor Kontak Darurat</td>
                            <td className="py-1.5 font-bold text-rose-700">{selectedStudent.kontakDarurat}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Medical / Psychological section */}
                    <div>
                      <h4 className="text-[11px] font-extrabold text-slate-900 bg-slate-100 px-2 py-1 uppercase tracking-wider mb-2 border-l-4 border-slate-700">II. Kondisi Khusus / Riwayat Medis</h4>
                      <p className="text-xs leading-relaxed text-slate-700 italic border border-slate-200 rounded p-2.5 bg-slate-50/50">
                        {selectedStudent.riwayatMedis}
                      </p>
                    </div>

                    {/* Academic Point summary */}
                    <div>
                      <h4 className="text-[11px] font-extrabold text-slate-900 bg-slate-100 px-2 py-1 uppercase tracking-wider mb-2 border-l-4 border-slate-700">III. Catatan Kedisiplinan & Poin Pelanggaran</h4>
                      <table className="min-w-full text-xs text-center border border-slate-200">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="py-1.5 border-r border-slate-200 font-bold">Total Poin Terakumulasi</th>
                            <th className="py-1.5 border-r border-slate-200 font-bold">Status Peringatan</th>
                            <th className="py-1.5 font-bold">Kategori Status Siswa</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2.5 border-r border-slate-200 font-extrabold text-slate-900 text-sm">
                              {selectedStudent.totalPoin} Poin
                            </td>
                            <td className="py-2.5 border-r border-slate-200 font-semibold text-slate-800">
                              {selectedStudent.totalPoin >= 150 ? 'SP 3 (Mendesak!)' : selectedStudent.totalPoin >= 100 ? 'SP 2' : selectedStudent.totalPoin >= 50 ? 'SP 1' : 'Aman (Hijau)'}
                            </td>
                            <td className="py-2.5 font-semibold text-slate-800">
                              Siswa {selectedStudent.status}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Signatures Row */}
                <div className="grid grid-cols-2 text-xs text-center pt-6 border-t border-dashed border-slate-300">
                  <div>
                    <p className="font-semibold text-slate-500">Mengetahui,</p>
                    <p className="font-bold text-slate-800 mb-14">Wali Kelas {selectedStudent.kelas}</p>
                    <p className="font-extrabold text-slate-900 underline">..................................................</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">NIP. .........................................</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500">Kras, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="font-bold text-slate-800 mb-14">Kepala Unit Layanan BK</p>
                    <p className="font-extrabold text-slate-900 underline">Dra. Endang Sulastri, M.Pd.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">NIP. 19780412 199903 2 001</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ⭐ EXCEL / XLSX IMPORT MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                <span>Impor Data Siswa via Excel (.xlsx)</span>
              </h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100/60 rounded-xl p-4 text-xs space-y-2 leading-relaxed">
                <h4 className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-indigo-700" />
                  <span>Petunjuk Format Excel (XLSX / XLS)</span>
                </h4>
                <p className="text-slate-600">
                  Pastikan dokumen Anda disimpan dalam format Excel (<strong>.xlsx</strong> atau <strong>.xls</strong>) dengan nama kolom di baris pertama sebagai berikut:
                </p>
                <div className="bg-white/80 p-2 rounded border border-indigo-100 font-mono text-[9px] text-indigo-950 overflow-x-auto">
                  Nama Lengkap, NISN, Kelas, Status Keaktifan, Tempat Tanggal Lahir, Alamat Lengkap, No HP, Nama Orang Tua / Wali, Pekerjaan Orang Tua, Kontak Darurat Ortu, Riwayat Medis
                </div>
                <p className="text-slate-600">
                  * Catatan: Kolom <strong>Nama Lengkap</strong>, <strong>NISN</strong>, dan <strong>Kelas</strong> bersifat wajib. Siswa yang diimpor akan langsung didaftarkan di dalam database sekolah.
                </p>
              </div>

              {/* Template Download Button */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <span className="font-semibold text-slate-600">Belum memiliki template Excel?</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 border border-slate-200 rounded-lg font-bold transition-all cursor-pointer text-[11px] shadow-xs"
                >
                  <Download className="h-3 w-3" />
                  <span>Unduh Template Excel</span>
                </button>
              </div>

              {/* File Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih File Excel (.xlsx / .xls)</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-all relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Klik untuk mencari file atau seret file ke sini</p>
                      <p className="text-[10px] text-slate-400 mt-1">Mendukung format .xlsx, .xls</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                  <p>{importError}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ⭐ BULK CLASS UPDATE MODAL --- */}
      {showBulkClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg flex flex-col overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-600" />
                <span>Atur Kelas Massal & Pemindahan Siswa</span>
              </h3>
              <button 
                onClick={() => setShowBulkClassModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteBulkUpdate}>
              <div className="p-6 space-y-4">
                {bulkSuccessMessage ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2.5">
                    <Check className="h-5 w-5 text-emerald-600" />
                    <span>{bulkSuccessMessage}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setBulkMode('class')}
                        className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition-all ${
                          bulkMode === 'class' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Pindahkan Satu Kelas
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkMode('selected')}
                        className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition-all ${
                          bulkMode === 'selected' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Pindahkan Siswa Terpilih ({selectedStudentIds.length})
                      </button>
                    </div>

                    {bulkMode === 'class' ? (
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-500 font-medium">
                          Gunakan opsi ini untuk memindahkan/menaikan seluruh siswa dari satu kelas asal ke kelas baru sekaligus (misal: memindahkan seluruh siswa Kelas 7A ke Kelas 8A).
                        </p>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Asal (Saat Ini)</label>
                          <select
                            value={bulkSourceClass}
                            onChange={(e) => setBulkSourceClass(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">-- Pilih Kelas Asal --</option>
                            {Array.from(new Set(siswaList.map(s => s.kelas))).sort().map(cls => (
                              <option key={cls} value={cls}>Kelas {cls}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-500 font-medium">
                          Memindahkan siswa yang telah Anda centang di tabel sebelah kiri secara massal.
                        </p>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 max-h-32 overflow-y-auto text-xs text-slate-700 space-y-1">
                          {selectedStudentIds.length === 0 ? (
                            <span className="text-slate-400 italic font-semibold">Belum ada siswa terpilih. Silakan centang siswa pada tabel di belakang modal ini.</span>
                          ) : (
                            siswaList.filter(s => selectedStudentIds.includes(s.id)).map(s => (
                              <div key={s.id} className="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-100">
                                <span className="font-bold">{s.nama}</span>
                                <span className="text-[10px] text-slate-400 font-mono">Kelas {s.kelas}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Tujuan (Baru)</label>
                      <input
                        type="text"
                        placeholder="Contoh: VIII-A, IX-IPA-2"
                        value={bulkTargetClass}
                        onChange={(e) => setBulkTargetClass(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {!bulkSuccessMessage && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkClassModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Eksekusi Pemindahan
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* --- ⭐ STUDENT CARD PREVIEW MODAL WITH SCAN-READY BARCODE --- */}
      {showCardPreview && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl flex flex-col overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                <IdCard className="h-4 w-4 text-emerald-600" />
                <span>Cetak Kartu Tanda Siswa (SMP NEGERI 3 KRAS)</span>
              </h3>
              <button 
                onClick={() => setShowCardPreview(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Print Area */}
            <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col items-center gap-6 bg-slate-100/50" id="print-siswa-card-area">
              
              <div className="text-center text-[10px] text-slate-400 font-bold max-w-md">
                Gunakan tombol cetak di bawah untuk mencetak kartu. Kartu di bawah berukuran standar ID Card (85mm x 55mm) bolak-balik.
              </div>

              <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                
                {/* --- FRONT OF CARD --- */}
                <div className="w-[330px] h-[210px] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-4 shadow-xl relative overflow-hidden border border-indigo-500/30 flex flex-col justify-between shrink-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                    <div className="h-7 w-7 bg-white rounded-md flex items-center justify-center shrink-0">
                      <GraduationCap className="h-4 w-4 text-indigo-900" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider leading-none">SMP NEGERI 3 KRAS</h4>
                      <p className="text-[7px] text-indigo-200 font-semibold tracking-wide mt-0.5 uppercase">KARTU IDENTITAS SISWA</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex gap-3 my-2 items-center">
                    <img
                      src={selectedStudent.fotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                      alt={selectedStudent.nama}
                      className="h-[80px] w-[65px] object-cover rounded-md border border-white/10 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-1.5 text-left">
                      <div>
                        <span className="text-[7px] text-indigo-300 font-bold block uppercase leading-none">Nama Lengkap</span>
                        <span className="text-[11px] font-black tracking-tight leading-tight block truncate w-[190px]">{selectedStudent.nama}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[7px] text-indigo-300 font-bold block uppercase leading-none">NISN</span>
                          <span className="text-[9px] font-bold font-mono tracking-wider">{selectedStudent.nisn}</span>
                        </div>
                        <div>
                          <span className="text-[7px] text-indigo-300 font-bold block uppercase leading-none">Kelas</span>
                          <span className="text-[9px] font-bold">{selectedStudent.kelas}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex justify-between items-end border-t border-white/10 pt-1.5 text-[6px] text-indigo-200">
                    <div>
                      <span className="font-bold block text-[5px] uppercase">Alamat</span>
                      <span className="truncate block w-[160px] font-medium">{selectedStudent.alamat}</span>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider text-[5px]">
                      Siswa Aktif
                    </span>
                  </div>
                </div>

                {/* --- BACK OF CARD --- */}
                <div className="w-[330px] h-[210px] bg-white text-slate-800 rounded-2xl p-4 shadow-xl border border-slate-200 flex flex-col justify-between shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none">
                    <GraduationCap className="h-32 w-32 text-indigo-900" />
                  </div>

                  {/* Rules title */}
                  <div className="text-left">
                    <h5 className="text-[8px] font-black text-indigo-950 uppercase tracking-wider leading-none">KETENTUAN KARTU</h5>
                    <ul className="text-[6.5px] text-slate-500 list-decimal pl-3 mt-1.5 space-y-0.5 leading-tight font-medium">
                      <li>Kartu ini adalah kartu identitas resmi siswa SMP Negeri 3 Kras.</li>
                      <li>Wajib dibawa setiap hari dan digunakan untuk scan QR/barcode kehadiran.</li>
                      <li>Kartu tidak boleh dicoret-coret, dilipat, atau dipindahtangankan.</li>
                      <li>Jika hilang, segera laporkan ke Guru BK / Tata Usaha Sekolah.</li>
                    </ul>
                  </div>

                  {/* Scan Area with Barcode */}
                  <div className="flex flex-col items-center justify-center bg-slate-50 p-2 rounded-xl border border-slate-100 my-1">
                    <div className="flex justify-center my-0.5">
                      <StudentQrCode value={selectedStudent.nisn} size={64} />
                    </div>
                    <span className="text-[8px] font-bold font-mono tracking-widest text-slate-600 mt-1 uppercase">
                      * {selectedStudent.nisn} *
                    </span>
                  </div>

                  {/* Signature Area */}
                  <div className="flex justify-between items-end">
                    <div className="text-[5.5px] text-slate-400 font-bold uppercase tracking-wider">
                      SahabatBK System &copy; 2026
                    </div>
                    <div className="text-right leading-none shrink-0">
                      <span className="text-[6px] font-bold text-slate-500 block">Kediri, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span className="text-[6px] font-black text-indigo-950 uppercase block mt-0.5">Kepala Sekolah,</span>
                      <div className="h-6 flex items-center justify-end relative">
                        <div className="absolute right-2 -top-1 w-7 h-7 border border-emerald-500/20 rounded-full flex items-center justify-center text-[5px] text-emerald-500 font-bold rotate-12 bg-white/40 pointer-events-none scale-90 uppercase">SMPN3</div>
                        <span className="text-[7px] font-black text-indigo-900 underline z-10">Dr. H. Mulyono, M.Si.</span>
                      </div>
                      <span className="text-[5.5px] text-slate-400 font-bold block">NIP: 196805121994031005</span>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold">
                Tips: Gunakan kertas tebal / kertas PVC Card saat mencetak kartu ini.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCardPreview(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('print-siswa-card-area')?.innerHTML;
                    if (printContents) {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Cetak Kartu Siswa - ${selectedStudent.nama}</title>
                              <script src="https://cdn.tailwindcss.com"></script>
                              <style>
                                @media print {
                                  body { background: white; margin: 0; padding: 20px; }
                                  .no-print { display: none; }
                                }
                              </style>
                            </head>
                            <body onload="window.print(); window.close();">
                              <div class="flex flex-col items-center gap-8 py-8">
                                ${printContents}
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      } else {
                        window.print();
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak Sekarang (PDF / Printer)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ⭐ EXPORT/IMPORT FEEDBACK TOASTS --- */}
      {importSuccess && (
        <div className="fixed bottom-6 left-6 bg-indigo-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-extrabold animate-bounce z-50">
          <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center">
            <Check className="h-3 w-3 text-white" />
          </div>
          <span>{importSuccess}</span>
        </div>
      )}
    </div>
  );
}
