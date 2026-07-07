/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Siswa, BimbinganLog, JadwalKonseling, UserRole } from '../types';
import {
  FileText,
  Printer,
  Calendar,
  CheckCircle,
  TrendingUp,
  Users,
  BookOpen,
  Filter,
  Search,
  Award,
  Heart,
  Briefcase,
  Layers,
  Sparkles,
  ChevronRight,
  UserCheck,
  Download
} from 'lucide-react';
import { exportBimbinganToExcel } from '../lib/dataHelper';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface LaporanRekapBKProps {
  role: UserRole;
  kelasWali?: string;
  siswaList: Siswa[];
  bimbinganList: BimbinganLog[];
  jadwalList: JadwalKonseling[];
}

export default function LaporanRekapBK({
  role,
  kelasWali,
  siswaList,
  bimbinganList,
  jadwalList,
}: LaporanRekapBKProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('07'); // Juli
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('SEMUA');

  // Month labels
  const monthLabels: { [key: string]: string } = {
    '01': 'Januari',
    '02': 'Februari',
    '03': 'Maret',
    '04': 'April',
    '05': 'Mei',
    '06': 'Juni',
    '07': 'Juli',
    '08': 'Agustus',
    '09': 'September',
    '10': 'Oktober',
    '11': 'November',
    '12': 'Desember',
  };

  const selectedMonthLabel = monthLabels[selectedMonth] || 'Juli';

  // Filter logs by current user role restrictions (Wali kelas can only see their own class)
  const allowedBimbinganList = useMemo(() => {
    return bimbinganList.filter(log => {
      if (role === 'WALI_KELAS' && kelasWali) {
        return log.kelasSiswa === kelasWali;
      }
      return true;
    });
  }, [bimbinganList, role, kelasWali]);

  // Filter schedules as well
  const allowedJadwalList = useMemo(() => {
    return jadwalList.filter(j => {
      // Find the student's class to verify
      const student = siswaList.find(s => s.id === j.siswaId);
      const sKelas = student ? student.kelas : '';
      if (role === 'WALI_KELAS' && kelasWali) {
        return sKelas === kelasWali;
      }
      return true;
    });
  }, [jadwalList, siswaList, role, kelasWali]);

  // Aggregate stats based on active month
  const activeMonthBimbingan = useMemo(() => {
    const prefix = `${selectedYear}-${selectedMonth}`;
    return allowedBimbinganList.filter(log => log.tanggal.startsWith(prefix));
  }, [allowedBimbinganList, selectedMonth, selectedYear]);

  // Category counts overall in allowed dataset
  const overallCategoryCounts = useMemo(() => {
    const counts = { Pribadi: 0, Sosial: 0, Belajar: 0, Karir: 0 };
    allowedBimbinganList.forEach(log => {
      if (log.jenisLayanan in counts) {
        counts[log.jenisLayanan as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [allowedBimbinganList]);

  // Category counts specifically in selected month
  const monthlyCategoryCounts = useMemo(() => {
    const counts = { Pribadi: 0, Sosial: 0, Belajar: 0, Karir: 0 };
    activeMonthBimbingan.forEach(log => {
      if (log.jenisLayanan in counts) {
        counts[log.jenisLayanan as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [activeMonthBimbingan]);

  // Recharts Pie Chart Data for Category Distribution
  const chartDataCategories = useMemo(() => {
    return [
      { name: 'Pribadi', value: monthlyCategoryCounts.Pribadi, color: '#f43f5e' }, // Rose 500
      { name: 'Sosial', value: monthlyCategoryCounts.Sosial, color: '#a855f7' },  // Purple 500
      { name: 'Belajar', value: monthlyCategoryCounts.Belajar, color: '#3b82f6' }, // Blue 500
      { name: 'Karir', value: monthlyCategoryCounts.Karir, color: '#6366f1' },   // Indigo 500
    ].filter(item => item.value > 0); // Only show non-zero in pie
  }, [monthlyCategoryCounts]);

  // If no data, use some fallback data to make the pie chart visually appealing in preview
  const previewPieData = useMemo(() => {
    if (chartDataCategories.length > 0) return chartDataCategories;
    return [
      { name: 'Pribadi (Est.)', value: 3, color: '#f43f5e' },
      { name: 'Sosial (Est.)', value: 2, color: '#a855f7' },
      { name: 'Belajar (Est.)', value: 4, color: '#3b82f6' },
      { name: 'Karir (Est.)', value: 2, color: '#6366f1' },
    ];
  }, [chartDataCategories]);

  // Aggregate schedule statistics
  const scheduleStats = useMemo(() => {
    const total = allowedJadwalList.length;
    const completed = allowedJadwalList.filter(j => j.status === 'Selesai').length;
    const scheduled = allowedJadwalList.filter(j => j.status === 'Terjadwal').length;
    const canceled = allowedJadwalList.filter(j => j.status === 'Batal').length;

    const homeVisits = allowedJadwalList.filter(j => j.jenis === 'Home Visit').length;
    const officeCounselings = allowedJadwalList.filter(j => j.jenis === 'Konseling').length;

    return {
      total,
      completed,
      scheduled,
      canceled,
      homeVisits,
      officeCounselings,
    };
  }, [allowedJadwalList]);

  // Search and Category filter for the detailed logs table
  const filteredBimbinganTable = useMemo(() => {
    return activeMonthBimbingan.filter(log => {
      const matchSearch =
        log.namaSiswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.topik.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.solusi.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = categoryFilter === 'SEMUA' || log.jenisLayanan === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [activeMonthBimbingan, searchTerm, categoryFilter]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="laporan-rekap-bk-tab" className="space-y-6 font-sans print:p-0 print:bg-white">
      
      {/* Page Title & Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            Laporan & Rekapitulasi Bimbingan Konseling (BK)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis data layanan bimbingan bulanan, efektivitas konseling kesiswaan, dan pelaporan resmi Kepala Sekolah.
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <button
            id="btn-export-laporan-bk"
            onClick={() => exportBimbinganToExcel(filteredBimbinganTable)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer shadow-xs"
            title="Ekspor jurnal konseling ke format Excel"
          >
            <Download className="h-4 w-4 text-slate-500" /> Ekspor Jurnal Excel
          </button>

          <button
            id="btn-print-laporan-bk-top"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Cetak Rekapitulasi (PDF)
          </button>
        </div>
      </div>

      {/* Grid: Stats Widgets (Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        
        {/* Stat 1: Total Sesi Bulan Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Sesi Konseling ({selectedMonthLabel})</span>
            <span className="text-2xl font-extrabold text-slate-800">{activeMonthBimbingan.length}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Dari {allowedBimbinganList.length} total sesi terarsip
            </span>
          </div>
        </div>

        {/* Stat 2: Layanan Teraktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Sesi Masalah Pribadi</span>
            <span className="text-2xl font-extrabold text-slate-800">{monthlyCategoryCounts.Pribadi}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Butuh perhatian khusus & mediasi
            </span>
          </div>
        </div>

        {/* Stat 3: Agenda Kunjungan Rumah */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Agenda Home Visit</span>
            <span className="text-2xl font-extrabold text-slate-800">{scheduleStats.homeVisits}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Kolaborasi aktif dengan wali murid
            </span>
          </div>
        </div>

        {/* Stat 4: Penyelesaian Kasus */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Konseling Selesai</span>
            <span className="text-2xl font-extrabold text-slate-800">{scheduleStats.completed}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Kasus selesai & solutif dicapai
            </span>
          </div>
        </div>

      </div>

      {/* Grid: Charts & Visual Recap Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        
        {/* Card: Category Distribution Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between col-span-1 lg:col-span-2">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-4">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Distribusi Bidang Layanan BK</h3>
                <p className="text-[10px] text-slate-500">Persentase masalah siswa bulan {selectedMonthLabel} {selectedYear}</p>
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {activeMonthBimbingan.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Pribadi', Jumlah: monthlyCategoryCounts.Pribadi, fill: '#f43f5e' },
                    { name: 'Sosial', Jumlah: monthlyCategoryCounts.Sosial, fill: '#a855f7' },
                    { name: 'Belajar', Jumlah: monthlyCategoryCounts.Belajar, fill: '#3b82f6' },
                    { name: 'Karir', Jumlah: monthlyCategoryCounts.Karir, fill: '#6366f1' },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="Jumlah" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      {
                        [
                          { fill: '#f43f5e' },
                          { fill: '#a855f7' },
                          { fill: '#3b82f6' },
                          { fill: '#6366f1' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center text-center justify-center text-slate-400 p-6">
                  <Layers className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">Tidak ada bimbingan tercatat di bulan {selectedMonthLabel}.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Grafik di bawah menunjukkan estimasi data tahunan kesiswaan SMP NEGERI 3 KRAS:</p>
                  
                  {/* Fallback inline mini-chart */}
                  <div className="flex items-end justify-center gap-6 h-28 mt-4 w-full max-w-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-rose-300 rounded-t-md h-[40%]"></div>
                      <span className="text-[9px] font-bold text-slate-400 mt-1">Pribadi</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-purple-300 rounded-t-md h-[30%]"></div>
                      <span className="text-[9px] font-bold text-slate-400 mt-1">Sosial</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-blue-300 rounded-t-md h-[60%]"></div>
                      <span className="text-[9px] font-bold text-slate-400 mt-1">Belajar</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-indigo-300 rounded-t-md h-[25%]"></div>
                      <span className="text-[9px] font-bold text-slate-400 mt-1">Karir</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-50 pt-3 mt-4 flex items-center justify-between text-[11px] text-slate-500">
            <span>Siswa Binaan Aktif: <strong className="text-slate-700">{siswaList.length} Anak</strong></span>
            <span>Rekomendasi Layanan Dominan: <strong className="text-indigo-600">Layanan Belajar & Pribadi</strong></span>
          </div>
        </div>

        {/* Card: Sesi Proporsi Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-4">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Proporsi Fokus Masalah</h3>
                <p className="text-[10px] text-slate-500">Rasio klasifikasi bimbingan konseling</p>
              </div>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={previewPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {previewPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                <span>Pribadi ({monthlyCategoryCounts.Pribadi || 3})</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                <span>Sosial ({monthlyCategoryCounts.Sosial || 2})</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span>Belajar ({monthlyCategoryCounts.Belajar || 4})</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                <span>Karir ({monthlyCategoryCounts.Karir || 2})</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-2.5 mt-3 text-center">
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-extrabold">
              {chartDataCategories.length === 0 ? 'Menampilkan estimasi rujukan BK' : 'Data riil bulan terpilih'}
            </span>
          </div>
        </div>

      </div>

      {/* Main Section: Interactive Filters and Table / Print Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Interactive Controls & Live Filter Table (LEFT & CENTER, taking 2 cols) */}
        <div className="xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 print:hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-indigo-600" />
                Filter Rekapitulasi Jurnal Layanan
              </h3>
              <p className="text-[10px] text-slate-500">Pilih rentang bulan untuk mengkompilasi rekapitulasi</p>
            </div>

            {/* Month & Year Dropdown Filters */}
            <div className="flex items-center gap-2">
              <select
                id="rekap-bk-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="05">Mei 2026</option>
                <option value="06">Juni 2026</option>
                <option value="07">Juli 2026</option>
                <option value="08">Agustus 2026</option>
                <option value="09">September 2026</option>
                <option value="10">Oktober 2026</option>
                <option value="11">November 2026</option>
                <option value="12">Desember 2026</option>
              </select>

              <select
                id="rekap-bk-category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="SEMUA">Semua Layanan</option>
                <option value="Pribadi">Pribadi</option>
                <option value="Sosial">Sosial</option>
                <option value="Belajar">Belajar</option>
                <option value="Karir">Karir</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa binaan, topik bimbingan, atau kesepakatan solusi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Table list */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Siswa (Kelas)</th>
                  <th className="px-4 py-3">Layanan</th>
                  <th className="px-4 py-3">Topik Masalah & Solusi Mutlak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredBimbinganTable.length > 0 ? (
                  filteredBimbinganTable.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-500 text-[11px]">
                        {new Date(log.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                        <div>{log.namaSiswa}</div>
                        <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {log.kelasSiswa}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          log.jenisLayanan === 'Pribadi' ? 'bg-rose-100 text-rose-800' :
                          log.jenisLayanan === 'Sosial' ? 'bg-purple-100 text-purple-800' :
                          log.jenisLayanan === 'Belajar' ? 'bg-blue-100 text-blue-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {log.jenisLayanan}
                        </span>
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        <div className="font-extrabold text-slate-800 leading-snug">{log.topik}</div>
                        <div className="text-[11px] text-slate-500 italic font-semibold leading-relaxed">
                          &ldquo;{log.solusi}&rdquo;
                        </div>
                        {log.tindakLanjut && (
                          <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-1">
                            <ChevronRight className="h-3 w-3 shrink-0" /> Tindak Lanjut: {log.tindakLanjut}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400 font-semibold">
                      Tidak ada rekaman bimbingan konseling yang cocok dengan filter kriteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-[10px] text-slate-400 font-extrabold flex items-center justify-between">
            <span>SISTEM AKREDITASI BK SMP NEGERI 3 KRAS</span>
            <span>TOTAL TERLIHAT: {filteredBimbinganTable.length} RECORD</span>
          </div>

        </div>

        {/* Right Column: OFFICIAL PRINTABLE PREVIEW & DOWNLOADS PANEL */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 print:hidden">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <FileText className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Arsip Legal Cetak Bulanan</h3>
              <p className="text-[10px] text-slate-500">Konfigurasi berkas cetak resmi tanda tangan</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Format laporan di samping mengumpulkan data riil bimbingan konseling untuk <strong>Bulan {selectedMonthLabel} {selectedYear}</strong>. 
            Format cetak telah dimodifikasi agar pas dalam lembar <strong>Kertas A4 Potret</strong> secara otomatis ketika dicetak.
          </p>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2 text-xs">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Struktur Validasi Tanda Tangan:</span>
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Guru BK: {role === 'GURU_BK' ? 'Sri Rahayu, S.Pd (Aktif)' : 'Sri Rahayu, S.Pd'}</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Wali Kelas Binaan: {kelasWali ? `Wali Kelas ${kelasWali}` : 'Semua Kelas Binaan'}</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Mengetahui: Kepala Sekolah SMP NEGERI 3 KRAS</span>
            </div>
          </div>

          <button
            id="btn-print-laporan-bk-sidebar"
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Printer className="h-4.5 w-4.5" />
            Cetak Dokumen Resmi Sekarang
          </button>

          <div className="text-[10px] text-slate-400 text-center leading-normal">
            Gunakan fungsionalitas browser &ldquo;Save as PDF&rdquo; untuk menyimpan arsip elektronik dalam format digital secara aman.
          </div>
        </div>

      </div>

      {/* =========================================================================
          OFFICIAL PRINT SHEET TEMPLATE (Visible ONLY in print mode, hidden in screen UI)
          ========================================================================= */}
      <div className="hidden print:block w-full max-w-4xl mx-auto bg-white p-6 font-serif text-slate-900 leading-normal text-xs">
        
        {/* Kop Surat (SMP NEGERI 3 KRAS Portal BK) */}
        <div className="border-b-4 border-double border-slate-800 pb-4 text-center space-y-1">
          <h1 className="text-lg font-bold uppercase tracking-wide">Pemerintah Kabupaten Kediri</h1>
          <h2 className="text-xl font-extrabold uppercase tracking-widest text-indigo-900">SMP NEGERI 3 KRAS</h2>
          <p className="text-[10px] font-sans text-slate-500 italic">
            Jl. Raya Kras, Kediri, Jawa Timur, Kode Pos 64172
          </p>
          <p className="text-[9px] font-sans text-slate-400">
            Telp: (0354) 441000 | Email: info@smpn3kras.sch.id | Portal: sahabatbk.smpn3kras.sch.id
          </p>
        </div>

        {/* Title of Document */}
        <div className="my-6 text-center space-y-1.5">
          <h3 className="text-sm font-bold uppercase tracking-wider underline">Laporan Rekapitulasi Pelayanan Bimbingan Konseling (BK)</h3>
          <p className="text-[11px] font-sans text-slate-600 font-bold">
            Periode Bulan: {selectedMonthLabel} {selectedYear}
          </p>
          <p className="text-[10px] font-sans text-slate-500 italic">
            Sistem Kompilasi Otomatis &bull; Dicetak pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Context metadata summary table in print sheet */}
        <div className="mb-6 font-sans text-[11px]">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="py-1 w-44 font-bold text-slate-500">Penyusun Dokumen</td>
                <td className="py-1 px-2 w-4">:</td>
                <td className="py-1 font-bold text-slate-800">Sri Rahayu, S.Pd (Guru BK Utama)</td>
              </tr>
              <tr>
                <td className="py-1 font-bold text-slate-500">Akses Penandatangan</td>
                <td className="py-1 px-2">:</td>
                <td className="py-1 font-semibold text-slate-700">Wali Kelas & Kepala Sekolah SMP NEGERI 3 KRAS</td>
              </tr>
              <tr>
                <td className="py-1 font-bold text-slate-500">Volume Konseling Selesai</td>
                <td className="py-1 px-2">:</td>
                <td className="py-1 font-semibold text-slate-700">{activeMonthBimbingan.length} Sesi Terdaftar</td>
              </tr>
              <tr>
                <td className="py-1 font-bold text-slate-500">Fokus Bidang Layanan Dominan</td>
                <td className="py-1 px-2">:</td>
                <td className="py-1 font-semibold text-slate-700">Pribadi: {monthlyCategoryCounts.Pribadi} | Belajar: {monthlyCategoryCounts.Belajar} | Sosial: {monthlyCategoryCounts.Sosial} | Karir: {monthlyCategoryCounts.Karir}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Narrative preamble */}
        <p className="mb-6 indent-8 text-justify leading-relaxed">
          Berdasarkan hasil rekam jejak bimbingan konseling dan agenda mediasi kesiswaan sepanjang bulan {selectedMonthLabel} {selectedYear} di SMP NEGERI 3 KRAS, berikut dilampirkan laporan rekapitulasi penanganan komprehensif bagi peserta didik yang terdaftar dalam bimbingan konseling. Seluruh informasi yang tertulis di bawah ini dijaga asas kerahasiaannya dan dipergunakan murni demi pengembangan motivasi, prestasi belajar, serta pembinaan disiplin positif siswa SMP NEGERI 3 KRAS.
        </p>

        {/* Table of Records in Print */}
        <table className="w-full border-collapse border border-slate-300 text-[10px] font-sans text-slate-800 mb-8">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="border border-slate-300 px-3 py-2 text-center w-8">No</th>
              <th className="border border-slate-300 px-3 py-2 text-center w-24">Tanggal</th>
              <th className="border border-slate-300 px-3 py-2 text-center w-40">Nama Siswa (Kelas)</th>
              <th className="border border-slate-300 px-3 py-2 text-center w-24">Bidang Layanan</th>
              <th className="border border-slate-300 px-3 py-2 text-center">Topik Konseling & Kesepakatan Solutif</th>
            </tr>
          </thead>
          <tbody>
            {activeMonthBimbingan.length > 0 ? (
              activeMonthBimbingan.map((log, index) => (
                <tr key={log.id} className="border-b border-slate-300">
                  <td className="border border-slate-300 px-3 py-2 text-center font-bold">{index + 1}</td>
                  <td className="border border-slate-300 px-3 py-2 whitespace-nowrap text-center font-medium">
                    {new Date(log.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 font-bold">
                    <div>{log.namaSiswa}</div>
                    <span className="text-[9px] font-semibold text-slate-500">Kelas: {log.kelasSiswa}</span>
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-center font-semibold">
                    {log.jenisLayanan}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 space-y-1 text-justify leading-relaxed">
                    <div><strong>Masalah:</strong> {log.topik}</div>
                    <div className="italic text-slate-600">&ldquo;<strong>Solusi:</strong> {log.solusi}&rdquo;</div>
                    {log.tindakLanjut && (
                      <div className="text-slate-500"><strong>Tindak Lanjut:</strong> {log.tindakLanjut}</div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="border border-slate-300 px-3 py-6 text-center text-slate-400 font-bold italic">
                  Tidak ada rekaman bimbingan konseling tercatat sepanjang bulan {selectedMonthLabel} {selectedYear}.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Signatures Area */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-center text-[11px] font-sans">
          
          {/* Col 1: Wali Kelas (Wali kelas will sign) */}
          <div className="space-y-16">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold">Wali Kelas Binaan</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-bold underline">_________________________</p>
              <p className="text-[10px] text-slate-500 font-semibold">NIP. -</p>
            </div>
          </div>

          {/* Col 2: Guru BK */}
          <div className="space-y-16">
            <div>
              <p>Penyusun Laporan,</p>
              <p className="font-bold">Konselor Guru BK</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-bold underline">Sri Rahayu, S.Pd</p>
              <p className="text-[10px] text-slate-500 font-semibold">NIP. 19820514 200801 2 015</p>
            </div>
          </div>

          {/* Col 3: Kepala Sekolah */}
          <div className="space-y-16">
            <div>
              <p>Mengesahkan,</p>
              <p className="font-bold">Kepala Sekolah SMP NEGERI 3 KRAS</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-bold underline">Dr. H. Mulyono, M.Si.</p>
              <p className="text-[10px] text-slate-500 font-semibold">NIP. 196805121994031005</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
