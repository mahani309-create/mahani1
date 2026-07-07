/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Siswa, Pelanggaran, JENIS_PELANGGARAN_PRESET, UserRole } from '../types';
import {
  AlertTriangle,
  Calendar,
  User,
  Plus,
  Printer,
  Search,
  FileText,
  X,
  Sparkles,
  Info,
  CheckCircle,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { exportPelanggaranToExcel } from '../lib/dataHelper';

interface PelanggaranSistemProps {
  role: UserRole;
  kelasWali?: string;
  siswaList: Siswa[];
  pelanggaranList: Pelanggaran[];
  onAddPelanggaran: (pelanggaran: Omit<Pelanggaran, 'id'>) => void;
}

export default function PelanggaranSistem({
  role,
  kelasWali,
  siswaList,
  pelanggaranList,
  onAddPelanggaran,
}: PelanggaranSistemProps) {
  // Filters for Table
  const [tableSearch, setTableSearch] = useState('');
  const [tableClassFilter, setTableClassFilter] = useState('SEMUA');

  // Form Inputs
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [violationDate, setViolationDate] = useState('2026-07-06');
  const [selectedViolationType, setSelectedViolationType] = useState(JENIS_PELANGGARAN_PRESET[0].jenis);
  const [violationNotes, setViolationNotes] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Printing State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printFilterType, setPrintFilterType] = useState<'SISWA' | 'KELAS' | 'KESELURUHAN'>('SISWA');
  const [printSelectedSiswaId, setPrintSelectedSiswaId] = useState('');
  const [printSelectedKelas, setPrintSelectedKelas] = useState('XI-IPA-1');

  // Filter students based on role
  const allowedSiswaList = useMemo(() => {
    if (role === 'WALI_KELAS' && kelasWali) {
      return siswaList.filter(s => s.kelas === kelasWali);
    }
    return siswaList;
  }, [siswaList, role, kelasWali]);

  // Set default student select on load
  React.useEffect(() => {
    if (allowedSiswaList.length > 0 && !selectedStudentId) {
      setSelectedStudentId(allowedSiswaList[0].id);
    }
    if (allowedSiswaList.length > 0 && !printSelectedSiswaId) {
      setPrintSelectedSiswaId(allowedSiswaList[0].id);
    }
  }, [allowedSiswaList, selectedStudentId, printSelectedSiswaId]);

  // Calculate points of currently selected type in form
  const currentViolationPoin = useMemo(() => {
    const found = JENIS_PELANGGARAN_PRESET.find(p => p.jenis === selectedViolationType);
    return found ? found.poin : 0;
  }, [selectedViolationType]);

  // Handle Form Submission
  const handleSubmitViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    const student = siswaList.find(s => s.id === selectedStudentId);
    if (!student) return;

    onAddPelanggaran({
      siswaId: student.id,
      namaSiswa: student.nama,
      kelasSiswa: student.kelas,
      tanggal: violationDate,
      jenis: selectedViolationType,
      poin: currentViolationPoin,
      catatan: violationNotes,
    });

    // Reset notes
    setViolationNotes('');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  // Filter table infractions based on filters
  const activeTableClassFilter = useMemo(() => {
    if (role === 'WALI_KELAS' && kelasWali) {
      return kelasWali;
    }
    return tableClassFilter;
  }, [role, kelasWali, tableClassFilter]);

  const filteredPelanggaran = useMemo(() => {
    return pelanggaranList.filter(p => {
      const matchSearch = p.namaSiswa.toLowerCase().includes(tableSearch.toLowerCase()) || p.catatan.toLowerCase().includes(tableSearch.toLowerCase());
      const matchClass = activeTableClassFilter === 'SEMUA' || p.kelasSiswa === activeTableClassFilter;
      return matchSearch && matchClass;
    });
  }, [pelanggaranList, tableSearch, activeTableClassFilter]);

  // Distinct classes for dropdown filters
  const classList = useMemo(() => {
    const classes = new Set(siswaList.map(s => s.kelas));
    return Array.from(classes).sort();
  }, [siswaList]);

  // Data for printing
  const printData = useMemo(() => {
    if (printFilterType === 'SISWA') {
      const student = siswaList.find(s => s.id === printSelectedSiswaId);
      const infractions = pelanggaranList.filter(p => p.siswaId === printSelectedSiswaId);
      return {
        title: `Laporan Pelanggaran Siswa: ${student?.nama || ''} (${student?.kelas || ''})`,
        student,
        items: infractions,
        totalPoin: student?.totalPoin || 0
      };
    } else if (printFilterType === 'KELAS') {
      const infractions = pelanggaranList.filter(p => p.kelasSiswa === printSelectedKelas);
      return {
        title: `Rekapitulasi Pelanggaran Kelas: ${printSelectedKelas}`,
        items: infractions,
        totalPoin: infractions.reduce((acc, curr) => acc + curr.poin, 0)
      };
    } else {
      return {
        title: 'Laporan Pelanggaran Keseluruhan Sekolah SMP NEGERI 3 KRAS',
        items: pelanggaranList,
        totalPoin: pelanggaranList.reduce((acc, curr) => acc + curr.poin, 0)
      };
    }
  }, [printFilterType, printSelectedSiswaId, printSelectedKelas, pelanggaranList, siswaList]);

  return (
    <div id="pelanggaran-sistem-tab" className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Sistem Poin Rekap Pelanggaran</h2>
          <p className="text-xs text-slate-500 mt-0.5">Pencatatan pelanggaran, penyesuaian bobot poin otomatis, dan pencetakan surat pemanggilan orang tua.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-pelanggaran"
            onClick={() => exportPelanggaranToExcel(filteredPelanggaran)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer shadow-xs"
            title="Ekspor rekap pelanggaran ke format Excel"
          >
            <Download className="h-4 w-4 text-slate-500" /> Ekspor Excel
          </button>

          <button
            id="btn-open-print-pelanggaran"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold transition-all border border-indigo-100 cursor-pointer shadow-xs"
          >
            <Printer className="h-4 w-4" /> Cetak Laporan Pelanggaran
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-bounce z-50">
          <CheckCircle className="h-4 w-4" /> Pelanggaran berhasil dicatat & Poin otomatis dijumlahkan!
        </div>
      )}

      {/* Grid: Form Input (Only Guru BK) & Table logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form Input (Guru BK only) */}
        <div className="lg:col-span-1">
          {role === 'GURU_BK' ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
                <div className="h-8 w-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-700">
                  <Plus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Input Pelanggaran Baru</h3>
                  <p className="text-[10px] text-slate-500">Form otentik khusus Guru BK</p>
                </div>
              </div>

              <form onSubmit={handleSubmitViolation} className="space-y-4">
                {/* Select Siswa */}
                <div>
                  <label htmlFor="form-pelanggaran-siswa" className="block text-xs font-semibold text-slate-700 mb-1">Pilih Siswa Pelanggar</label>
                  <select
                    id="form-pelanggaran-siswa"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {allowedSiswaList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kelas}) - Poin Sekarang: {s.totalPoin}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tanggal */}
                <div>
                  <label htmlFor="form-pelanggaran-tanggal" className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Kejadian</label>
                  <input
                    id="form-pelanggaran-tanggal"
                    type="date"
                    value={violationDate}
                    onChange={(e) => setViolationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Jenis Pelanggaran with Automatic weight */}
                <div>
                  <label htmlFor="form-pelanggaran-jenis" className="block text-xs font-semibold text-slate-700 mb-1">Jenis Pelanggaran</label>
                  <select
                    id="form-pelanggaran-jenis"
                    value={selectedViolationType}
                    onChange={(e) => setSelectedViolationType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {JENIS_PELANGGARAN_PRESET.map(v => (
                      <option key={v.jenis} value={v.jenis}>
                        {v.jenis} (+{v.poin} Poin)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Automated Point Indicator */}
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                    <Info className="h-4 w-4 text-amber-600" />
                    <span>Bobot Pelanggaran Terpilih:</span>
                  </div>
                  <span className="bg-amber-600 text-white font-extrabold px-3 py-1 rounded-md text-sm">
                    {currentViolationPoin} Poin
                  </span>
                </div>

                {/* Catatan Tambahan */}
                <div>
                  <label htmlFor="form-pelanggaran-catatan" className="block text-xs font-semibold text-slate-700 mb-1">Catatan Kronologi / Tambahan</label>
                  <textarea
                    id="form-pelanggaran-catatan"
                    rows={3}
                    value={violationNotes}
                    onChange={(e) => setViolationNotes(e.target.value)}
                    placeholder="Tuliskan detail kejadian, lokasi, atau barang bukti yang diamankan..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <button
                  id="btn-submit-pelanggaran"
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Catat & Tambahkan Poin
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl space-y-3">
              <div className="h-9 w-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-xs text-indigo-900 uppercase tracking-wider">Akses Terbatas: Hanya Guru BK</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Sebagai <strong>{role === 'WALI_KELAS' ? 'Wali Kelas' : 'Kepala Sekolah'}</strong>, Anda memiliki izin melihat riwayat pelanggaran dan mendownload surat. Namun, input penambahan poin baru secara konstitusional hanya boleh dilakukan oleh Guru BK demi keadilan dan keabsahan berkas bimbingan.
              </p>
            </div>
          )}
        </div>

        {/* Right 2 Columns: Table of Infractions History */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Table Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-pelanggaran-log"
                type="text"
                placeholder="Cari pelanggaran berdasarkan nama siswa atau catatan..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {role !== 'WALI_KELAS' && (
              <div className="w-full md:w-auto">
                <select
                  id="filter-pelanggaran-kelas"
                  value={tableClassFilter}
                  onChange={(e) => setTableClassFilter(e.target.value)}
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

          {/* Table Container */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Siswa</th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tanggal</th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pelanggaran</th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Poin</th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Kronologi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPelanggaran.length > 0 ? (
                    filteredPelanggaran.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                          <div>
                            <div className="font-bold text-slate-800">{p.namaSiswa}</div>
                            <div className="text-[10px] text-indigo-700 font-bold">Kelas {p.kelasSiswa}</div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600 font-semibold">{p.tanggal}</td>
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-800 max-w-[180px] truncate" title={p.jenis}>
                          {p.jenis}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs">
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-extrabold text-[10px]">
                            +{p.poin}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 italic max-w-[220px] truncate" title={p.catatan}>
                          &ldquo;{p.catatan}&rdquo;
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-xs text-slate-400 font-medium bg-slate-50/50">
                        Tidak ada log pelanggaran kedisiplinan yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* --- ⭐ GENERAL PRINT MODAL --- */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[95vh] flex flex-col">
            {/* Header controls inside modal */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-indigo-600" /> Pengaturan Pencetakan Surat & Laporan Pelanggaran
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Sekarang (A4)
                </button>
                <button onClick={() => setShowPrintModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Print Selection Criteria Controls */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pilih Cakupan Laporan</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setPrintFilterType('SISWA')}
                    className={`py-1.5 text-[10px] font-bold rounded-md text-center transition-all cursor-pointer ${
                      printFilterType === 'SISWA' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Per Siswa
                  </button>
                  <button
                    onClick={() => setPrintFilterType('KELAS')}
                    className={`py-1.5 text-[10px] font-bold rounded-md text-center transition-all cursor-pointer ${
                      printFilterType === 'KELAS' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Per Kelas
                  </button>
                  <button
                    onClick={() => setPrintFilterType('KESELURUHAN')}
                    className={`py-1.5 text-[10px] font-bold rounded-md text-center transition-all cursor-pointer ${
                      printFilterType === 'KESELURUHAN' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Sekolah
                  </button>
                </div>
              </div>

              {printFilterType === 'SISWA' && (
                <div>
                  <label htmlFor="print-select-siswa" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pilih Siswa</label>
                  <select
                    id="print-select-siswa"
                    value={printSelectedSiswaId}
                    onChange={(e) => setPrintSelectedSiswaId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {allowedSiswaList.map(s => (
                      <option key={s.id} value={s.id}>{s.nama} ({s.kelas})</option>
                    ))}
                  </select>
                </div>
              )}

              {printFilterType === 'KELAS' && (
                <div>
                  <label htmlFor="print-select-kelas" className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pilih Kelas</label>
                  <select
                    id="print-select-kelas"
                    value={printSelectedKelas}
                    onChange={(e) => setPrintSelectedKelas(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {classList.map(cls => (
                      <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Document Preview Area */}
            <div className="flex-1 overflow-y-auto p-8 print:p-0 bg-slate-100 print:bg-white flex justify-center">
              <div className="bg-white p-10 print:p-0 w-full max-w-2xl border border-slate-300 print:border-0 shadow-lg print:shadow-none min-h-[842px] flex flex-col justify-between text-slate-800">
                
                {/* School Letterhead (Kop Surat) */}
                <div>
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h2 className="font-extrabold text-base text-slate-900 uppercase">Pemerintah Kabupaten Kediri</h2>
                    <h1 className="font-black text-lg text-slate-900 uppercase">SMP NEGERI 3 KRAS</h1>
                    <p className="text-[9px] text-slate-500 font-medium italic">
                      Jl. Raya Kras, Kediri, Jawa Timur &bull; Telp: (0354) 441000
                    </p>
                    <p className="text-[10px] text-slate-700 font-bold mt-1 uppercase tracking-wider">
                      Unit Bimbingan dan Konseling &bull; Laporan Kedisiplinan Siswa
                    </p>
                  </div>

                  {/* Title of document */}
                  <div className="text-center mb-6">
                    <h3 className="font-bold text-xs uppercase underline tracking-wider text-slate-900">{printData.title}</h3>
                    <p className="text-[9px] text-slate-500 mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>

                  {/* If filter type is Student, print personal info first */}
                  {printFilterType === 'SISWA' && printData.student && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs grid grid-cols-2 gap-x-6 gap-y-1.5 mb-5">
                      <div><span className="text-slate-500 font-bold">Nama Lengkap:</span> <span className="font-extrabold text-slate-900">{printData.student.nama}</span></div>
                      <div><span className="text-slate-500 font-bold">Kelas:</span> <span className="font-bold text-slate-800">{printData.student.kelas}</span></div>
                      <div><span className="text-slate-500 font-bold">NISN:</span> <span className="font-bold text-slate-800">{printData.student.nisn}</span></div>
                      <div><span className="text-slate-500 font-bold">Akumulasi Poin:</span> <span className="font-extrabold text-red-600">{printData.totalPoin} Poin</span></div>
                    </div>
                  )}

                  {/* Infraction list table */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-300 text-xs">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          {printFilterType !== 'SISWA' && <th className="px-3 py-2 text-left font-bold">Siswa (Kelas)</th>}
                          <th className="px-3 py-2 text-left font-bold w-[90px]">Tanggal</th>
                          <th className="px-3 py-2 text-left font-bold">Jenis Pelanggaran</th>
                          <th className="px-3 py-2 text-center font-bold w-[50px]">Poin</th>
                          <th className="px-3 py-2 text-left font-bold">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {printData.items.length > 0 ? (
                          printData.items.map((item) => (
                            <tr key={item.id}>
                              {printFilterType !== 'SISWA' && (
                                <td className="px-3 py-2 font-bold text-slate-800 text-[10px]">
                                  {item.namaSiswa} <span className="text-indigo-700">({item.kelasSiswa})</span>
                                </td>
                              )}
                              <td className="px-3 py-2 text-slate-600 font-medium text-[10px]">{item.tanggal}</td>
                              <td className="px-3 py-2 font-semibold text-slate-900 text-[10px]">{item.jenis}</td>
                              <td className="px-3 py-2 text-center font-bold text-slate-900 text-[10px]">+{item.poin}</td>
                              <td className="px-3 py-2 text-slate-500 italic text-[10px]">&ldquo;{item.catatan}&rdquo;</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={printFilterType === 'SISWA' ? 4 : 5} className="text-center py-6 text-slate-400 font-semibold italic">
                              Tidak ada riwayat catatan pelanggaran dalam cakupan ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary point label */}
                  {printFilterType !== 'SISWA' && (
                    <div className="mt-4 text-right text-xs">
                      <span className="font-bold text-slate-600">Total Akumulasi Poin Pelanggaran: </span>
                      <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-100">{printData.totalPoin} Poin</span>
                    </div>
                  )}

                  {/* Parental summon notes if student points exceed 50 */}
                  {printFilterType === 'SISWA' && printData.totalPoin >= 50 && (
                    <div className="mt-5 p-3 border-l-4 border-red-500 bg-red-50 text-[11px] text-red-900 font-medium leading-relaxed rounded-r-md">
                      <strong>REKOMENDASI UNIT BK:</strong> Mengingat akumulasi poin kedisiplinan yang bersangkutan telah menyentuh/melebihi batas aman SP1 (50 Poin), maka lembar laporan ini sah dijadikan dasar lampiran pemanggilan orang tua/wali murid SMP NEGERI 3 KRAS guna proses mediasi bimbingan konseling lanjutan.
                    </div>
                  )}
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 text-xs text-center pt-8 border-t border-dashed border-slate-300">
                  <div>
                    <p className="font-semibold text-slate-500">Mengetahui,</p>
                    <p className="font-bold text-slate-800 mb-14">
                      {printFilterType === 'SISWA' && printData.student
                        ? `Wali Kelas ${printData.student.kelas}`
                        : printFilterType === 'KELAS'
                        ? `Wali Kelas ${printSelectedKelas}`
                        : 'Wakil Kepala Kesiswaan'}
                    </p>
                    <p className="font-extrabold text-slate-900 underline">..................................................</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">NIP. .........................................</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500">Kediri, {new Date().getDate()} Juli 2026</p>
                    <p className="font-bold text-slate-800 mb-14">Konselor / Guru BK SMP NEGERI 3 KRAS</p>
                    <p className="font-extrabold text-slate-900 underline">Sri Rahayu, S.Pd</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">NIP. 19820514 200801 2 015</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
