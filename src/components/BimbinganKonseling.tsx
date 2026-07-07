/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { BimbinganLog, JadwalKonseling, Siswa, UserRole } from '../types';
import {
  Calendar,
  Plus,
  BookOpen,
  User,
  ShieldAlert,
  Clock,
  Video,
  Home,
  Check,
  Search,
  X,
  Lock,
  Sparkles,
  Info
} from 'lucide-react';

interface BimbinganKonselingProps {
  role: UserRole;
  kelasWali?: string;
  siswaList: Siswa[];
  bimbinganList: BimbinganLog[];
  jadwalList: JadwalKonseling[];
  onAddBimbingan: (log: Omit<BimbinganLog, 'id'>) => void;
  onAddJadwal: (jadwal: Omit<JadwalKonseling, 'id' | 'status'>) => void;
  onUpdateJadwalStatus: (id: string, status: 'Terjadwal' | 'Selesai' | 'Batal') => void;
}

export default function BimbinganKonseling({
  role,
  kelasWali,
  siswaList,
  bimbinganList,
  jadwalList,
  onAddBimbingan,
  onAddJadwal,
  onUpdateJadwalStatus,
}: BimbinganKonselingProps) {
  // Tabs: Layanan (Pribadi, Sosial, Belajar, Karir)
  const [activeLayananTab, setActiveLayananTab] = useState<'Pribadi' | 'Sosial' | 'Belajar' | 'Karir'>('Pribadi');

  // Sub-views: 'JOURNAL' | 'SCHEDULER'
  const [activeSubView, setActiveSubView] = useState<'JOURNAL' | 'SCHEDULER'>('JOURNAL');

  // Filters
  const [journalSearch, setJournalSearch] = useState('');

  // Modals & forms
  const [showAddJournalModal, setShowAddJournalModal] = useState(false);
  const [showAddJadwalModal, setShowAddJadwalModal] = useState(false);

  // Journal form state
  const [journalStudentId, setJournalStudentId] = useState('');
  const [journalTanggal, setJournalTanggal] = useState('2026-07-06');
  const [journalTopik, setJournalTopik] = useState('');
  const [journalSolusi, setJournalSolusi] = useState('');
  const [journalTindakLanjut, setJournalTindakLanjut] = useState('');

  // Jadwal form state
  const [jadwalStudentId, setJadwalStudentId] = useState('');
  const [jadwalTanggal, setJadwalTanggal] = useState('2026-07-07');
  const [jadwalWaktu, setJadwalWaktu] = useState('09:00 - 10:00');
  const [jadwalJenis, setJadwalJenis] = useState<'Konseling' | 'Home Visit'>('Konseling');
  const [jadwalKeterangan, setJadwalKeterangan] = useState('');

  // Allowed students list based on role
  const allowedSiswaList = useMemo(() => {
    if (role === 'WALI_KELAS' && kelasWali) {
      return siswaList.filter(s => s.kelas === kelasWali);
    }
    return siswaList;
  }, [siswaList, role, kelasWali]);

  // Set default student selections on mount
  React.useEffect(() => {
    if (allowedSiswaList.length > 0) {
      if (!journalStudentId) setJournalStudentId(allowedSiswaList[0].id);
      if (!jadwalStudentId) setJadwalStudentId(allowedSiswaList[0].id);
    }
  }, [allowedSiswaList, journalStudentId, jadwalStudentId]);

  // Filter journals based on Category Tab and Roles
  const filteredJournals = useMemo(() => {
    return bimbinganList.filter(log => {
      // 1. Filter by category
      const matchTab = log.jenisLayanan === activeLayananTab;
      
      // 2. Filter by Search text
      const matchSearch = log.namaSiswa.toLowerCase().includes(journalSearch.toLowerCase()) ||
                          log.topik.toLowerCase().includes(journalSearch.toLowerCase()) ||
                          log.solusi.toLowerCase().includes(journalSearch.toLowerCase());
      
      // 3. Filter by role (Wali Kelas only sees their class)
      let matchRole = true;
      if (role === 'WALI_KELAS' && kelasWali) {
        matchRole = log.kelasSiswa === kelasWali;
      }

      return matchTab && matchSearch && matchRole;
    });
  }, [bimbinganList, activeLayananTab, journalSearch, role, kelasWali]);

  // Filter schedules based on Roles
  const filteredSchedules = useMemo(() => {
    return jadwalList.filter(j => {
      if (role === 'WALI_KELAS' && kelasWali) {
        // Find if student is in this Wali Kelas' class
        const student = siswaList.find(s => s.id === j.siswaId);
        return student?.kelas === kelasWali;
      }
      return true;
    });
  }, [jadwalList, role, kelasWali, siswaList]);

  // Handle Journal Submit
  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalStudentId) return;

    const student = siswaList.find(s => s.id === journalStudentId);
    if (!student) return;

    onAddBimbingan({
      siswaId: student.id,
      namaSiswa: student.nama,
      kelasSiswa: student.kelas,
      tanggal: journalTanggal,
      jenisLayanan: activeLayananTab,
      topik: journalTopik,
      solusi: journalSolusi,
      tindakLanjut: journalTindakLanjut
    });

    // Reset
    setJournalTopik('');
    setJournalSolusi('');
    setJournalTindakLanjut('');
    setShowAddJournalModal(false);
  };

  // Handle Schedule Submit
  const handleSaveJadwal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jadwalStudentId) return;

    const student = siswaList.find(s => s.id === jadwalStudentId);
    if (!student) return;

    onAddJadwal({
      siswaId: student.id,
      namaSiswa: student.nama,
      tanggal: jadwalTanggal,
      waktu: jadwalWaktu,
      jenis: jadwalJenis,
      keterangan: jadwalKeterangan
    });

    // Reset
    setJadwalKeterangan('');
    setShowAddJadwalModal(false);
  };

  return (
    <div id="bimbingan-konseling-tab" className="space-y-6 font-sans">
      
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Ruang Kerja Bimbingan & Konseling (BK)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Ruang konsultasi rahasia. Dokumentasi kasus, rekap solusi, follow-up, serta penjadwalan bimbingan.</p>
        </div>

        {/* View Switcher: Journal vs Scheduler */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-max self-start sm:self-auto">
          <button
            onClick={() => setActiveSubView('JOURNAL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubView === 'JOURNAL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Jurnal Harian BK
          </button>
          <button
            onClick={() => setActiveSubView('SCHEDULER')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubView === 'SCHEDULER' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" /> Penjadwalan & Home Visit
          </button>
        </div>
      </div>

      {/* Warning regarding confidentiality */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl flex items-center gap-3 shadow-md">
        <Lock className="h-5 w-5 text-indigo-400 shrink-0" />
        <p className="text-xs leading-relaxed font-medium">
          <strong>Sistem Privasi Terenkripsi:</strong> Jurnal harian ini bersifat rahasia (private). Hanya <strong>Guru BK</strong> yang memiliki akses penuh menulis jurnal dan membuat janji, sedangkan <strong>Wali Kelas</strong> hanya diperbolehkan meninjau catatan siswa binaannya demi koordinasi, dan <strong>Kepala Sekolah</strong> memantau rekap solutif.
        </p>
      </div>

      {/* VIEW 1: JOURNAL VIEW */}
      {activeSubView === 'JOURNAL' && (
        <div className="space-y-6">
          {/* Layanan Categories Tab Selection */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              {(['Pribadi', 'Sosial', 'Belajar', 'Karir'] as const).map((tab) => {
                const colors = {
                  Pribadi: 'border-rose-500 text-rose-600',
                  Sosial: 'border-purple-500 text-purple-600',
                  Belajar: 'border-blue-500 text-blue-600',
                  Karir: 'border-indigo-500 text-indigo-600',
                };
                const isActive = activeLayananTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveLayananTab(tab)}
                    className={`pb-4 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? colors[tab]
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Layanan {tab}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search & Write controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-journal-log"
                type="text"
                placeholder={`Cari jurnal bimbingan ${activeLayananTab}...`}
                value={journalSearch}
                onChange={(e) => setJournalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {role === 'GURU_BK' && (
              <button
                id="btn-add-journal"
                onClick={() => setShowAddJournalModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer w-full sm:w-auto justify-center"
              >
                <Plus className="h-4 w-4" /> Tulis Jurnal {activeLayananTab}
              </button>
            )}
          </div>

          {/* Journals Timeline / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJournals.length > 0 ? (
              filteredJournals.map((journal) => (
                <div key={journal.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                          {journal.namaSiswa.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-800">{journal.namaSiswa}</h4>
                          <span className="text-[9px] text-slate-500 font-semibold">Kelas {journal.kelasSiswa}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {journal.tanggal}
                      </span>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold">Topik Permasalahan</span>
                        <p className="font-bold text-slate-800 mt-0.5">{journal.topik}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold">Solusi / Konseling yang Diberikan</span>
                        <p className="text-slate-600 leading-relaxed font-medium mt-0.5 italic">
                          &ldquo;{journal.solusi}&rdquo;
                        </p>
                      </div>

                      <div>
                        <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">Tindak Lanjut (Follow-Up)</span>
                        <p className="font-bold text-slate-800 mt-1 pl-1 border-l-2 border-rose-400">{journal.tindakLanjut}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Layanan {journal.jenisLayanan}</span>
                    <span className="text-indigo-600">Arsip BK SMP NEGERI 3 KRAS</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8">
                <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h3 className="font-bold text-xs text-slate-800">Jurnal {activeLayananTab} Kosong</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Belum ada laporan jurnal bimbingan di kategori ini. {role === 'GURU_BK' && 'Silakan klik tombol "Tulis Jurnal" di atas untuk menambah berkas.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: SCHEDULER VIEW */}
      {activeSubView === 'SCHEDULER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Input Form (Only Guru BK) */}
          <div className="lg:col-span-1">
            {role === 'GURU_BK' ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">Buat Agenda Jadwal</h3>
                    <p className="text-[10px] text-slate-500">Janji temu siswa atau Kunjungan Rumah</p>
                  </div>
                </div>

                <form onSubmit={handleSaveJadwal} className="space-y-4">
                  <div>
                    <label htmlFor="form-jadwal-siswa" className="block text-xs font-semibold text-slate-700 mb-1">Pilih Siswa</label>
                    <select
                      id="form-jadwal-siswa"
                      value={jadwalStudentId}
                      onChange={(e) => setJadwalStudentId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                      required
                    >
                      {allowedSiswaList.map(s => (
                        <option key={s.id} value={s.id}>{s.nama} ({s.kelas})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="form-jadwal-tanggal" className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                      <input
                        id="form-jadwal-tanggal"
                        type="date"
                        value={jadwalTanggal}
                        onChange={(e) => setJadwalTanggal(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="form-jadwal-waktu" className="block text-xs font-semibold text-slate-700 mb-1">Rentang Waktu</label>
                      <input
                        id="form-jadwal-waktu"
                        type="text"
                        value={jadwalWaktu}
                        onChange={(e) => setJadwalWaktu(e.target.value)}
                        placeholder="09:00 - 10:00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="form-jadwal-jenis" className="block text-xs font-semibold text-slate-700 mb-1">Jenis Layanan</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setJadwalJenis('Konseling')}
                        className={`py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                          jadwalJenis === 'Konseling'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <Video className="h-3.5 w-3.5" /> Konseling
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setJadwalJenis('Home Visit')}
                        className={`py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                          jadwalJenis === 'Home Visit'
                            ? 'bg-purple-50 border-purple-500 text-purple-800'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <Home className="h-3.5 w-3.5" /> Home Visit
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="form-jadwal-keterangan" className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi / Agenda Pembahasan</label>
                    <textarea
                      id="form-jadwal-keterangan"
                      rows={3}
                      value={jadwalKeterangan}
                      onChange={(e) => setJadwalKeterangan(e.target.value)}
                      placeholder="Contoh: Konseling lanjutan penanganan ketidakhadiran beruntun..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <button
                    id="btn-submit-jadwal"
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    Agendakan Panggilan
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl space-y-3">
                <div className="h-9 w-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-xs text-indigo-900 uppercase tracking-wider">Akses Terbatas: Hanya Guru BK</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Sebagai <strong>{role === 'WALI_KELAS' ? 'Wali Kelas' : 'Kepala Sekolah'}</strong>, Anda memiliki izin memantau kalender internal ini untuk mensinkronisasi koordinasi kesiswaan. Namun, kewenangan mengagendakan Janji Temu Konseling resmi atau Home Visit berada penuh di bawah naungan departemen Guru BK.
                </p>
              </div>
            )}
          </div>

          {/* Right: Schedule timeline list */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Daftar Agenda Terjadwal</h3>
            
            <div className="space-y-3">
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map((schedule) => (
                  <div key={schedule.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          schedule.jenis === 'Home Visit' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {schedule.jenis}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {schedule.tanggal} &bull; {schedule.waktu}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-xs text-slate-800">{schedule.namaSiswa}</h4>
                      <p className="text-[11px] text-slate-500 italic leading-relaxed">
                        &ldquo;{schedule.keterangan}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        schedule.status === 'Selesai'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : schedule.status === 'Batal'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {schedule.status}
                      </span>

                      {role === 'GURU_BK' && schedule.status === 'Terjadwal' && (
                        <div className="flex items-center gap-1">
                          <button
                            id={`btn-complete-schedule-${schedule.id}`}
                            onClick={() => onUpdateJadwalStatus(schedule.id, 'Selesai')}
                            className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-100 transition-colors cursor-pointer"
                            title="Selesai"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`btn-cancel-schedule-${schedule.id}`}
                            onClick={() => onUpdateJadwalStatus(schedule.id, 'Batal')}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md border border-rose-100 transition-colors cursor-pointer"
                            title="Batalkan"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8">
                  <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Tidak ada Agenda Kegiatan</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Seluruh panggilan bimbingan konseling atau kunjungan rumah (home visit) telah diproses atau dibatalkan.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* --- ADD JOURNAL MODAL (BK Only) --- */}
      {showAddJournalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                <BookOpen className="h-5 w-5 text-indigo-600" /> Tulis Jurnal {activeLayananTab} Baru
              </h3>
              <button onClick={() => setShowAddJournalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJournal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Siswa</label>
                <select
                  value={journalStudentId}
                  onChange={(e) => setJournalStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                  required
                >
                  {allowedSiswaList.map(s => (
                    <option key={s.id} value={s.id}>{s.nama} ({s.kelas})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Konseling</label>
                <input
                  type="date"
                  value={journalTanggal}
                  onChange={(e) => setJournalTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topik Pembahasan / Keluhan</label>
                <input
                  type="text"
                  value={journalTopik}
                  onChange={(e) => setJournalTopik(e.target.value)}
                  placeholder="Contoh: Kesulitan belajar matematika minat..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Konseling / Solusi yang Disepakati</label>
                <textarea
                  rows={2}
                  value={journalSolusi}
                  onChange={(e) => setJournalSolusi(e.target.value)}
                  placeholder="Tuliskan arahan konselor atau kesepakatan bersama siswa..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-red-700 mb-1 font-bold">Rencana Tindak Lanjut (Follow-Up)</label>
                <input
                  type="text"
                  value={journalTindakLanjut}
                  onChange={(e) => setJournalTindakLanjut(e.target.value)}
                  placeholder="Contoh: Pemantauan kehadiran oleh wali kelas..."
                  className="w-full px-3 py-2 bg-red-50/50 border border-red-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddJournalModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Simpan Jurnal BK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
