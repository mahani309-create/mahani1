/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Siswa, Pelanggaran, Kehadiran, JadwalKonseling, UserRole } from '../types';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Calendar,
  Clock,
  ChevronRight,
  Bell,
  GraduationCap,
  Sparkles,
  FileSpreadsheet,
  FileCheck
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface DashboardProps {
  role: UserRole;
  username: string;
  kelasWali?: string;
  siswaList: Siswa[];
  pelanggaranList: Pelanggaran[];
  kehadiranList: Kehadiran[];
  jadwalList: JadwalKonseling[];
  onNavigate: (tab: string, studentId?: string) => void;
}

export default function Dashboard({
  role,
  username,
  kelasWali,
  siswaList,
  pelanggaranList,
  kehadiranList,
  jadwalList,
  onNavigate,
}: DashboardProps) {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('SEMUA');

  // Determine active class filter based on role
  const activeClassFilter = useMemo(() => {
    if (role === 'WALI_KELAS' && kelasWali) {
      return kelasWali;
    }
    return selectedClassFilter;
  }, [role, kelasWali, selectedClassFilter]);

  // Filter lists based on active class filter
  const filteredSiswa = useMemo(() => {
    if (activeClassFilter === 'SEMUA') return siswaList;
    return siswaList.filter(s => s.kelas === activeClassFilter);
  }, [siswaList, activeClassFilter]);

  const filteredPelanggaran = useMemo(() => {
    if (activeClassFilter === 'SEMUA') return pelanggaranList;
    return pelanggaranList.filter(p => p.kelasSiswa === activeClassFilter);
  }, [pelanggaranList, activeClassFilter]);

  const filteredKehadiran = useMemo(() => {
    if (activeClassFilter === 'SEMUA') return kehadiranList;
    return kehadiranList.filter(k => k.kelasSiswa === activeClassFilter);
  }, [kehadiranList, activeClassFilter]);

  const filteredJadwal = useMemo(() => {
    if (activeClassFilter === 'SEMUA') return jadwalList;
    // Find students in that class first
    const studentIdsInClass = new Set(siswaList.filter(s => s.kelas === activeClassFilter).map(s => s.id));
    return jadwalList.filter(j => studentIdsInClass.has(j.siswaId));
  }, [jadwalList, siswaList, activeClassFilter]);

  // Available classes in system
  const classList = useMemo(() => {
    const classes = new Set(siswaList.map(s => s.kelas));
    return Array.from(classes).sort();
  }, [siswaList]);

  // Quick statistics
  const stats = useMemo(() => {
    // Total terlambat hari ini: count violations of type "Terlambat Masuk Sekolah"
    // For demo purposes, we count violations matching "Terlambat"
    const terlambatCount = filteredPelanggaran.filter(p => p.jenis.toLowerCase().includes('terlambat')).length;

    // Attendance stats
    let totalAlpa = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    filteredKehadiran.forEach(k => {
      totalAlpa += k.alpa;
      totalSakit += k.sakit;
      totalIzin += k.izin;
    });

    // Counseling today or upcoming
    const upcomingCounseling = filteredJadwal.filter(j => j.status === 'Terjadwal').length;

    // High risk students (totalPoin > 50)
    const highRiskCount = filteredSiswa.filter(s => s.totalPoin >= 50).length;

    return {
      terlambatCount,
      totalAlpa,
      totalSakit,
      totalIzin,
      upcomingCounseling,
      highRiskCount
    };
  }, [filteredPelanggaran, filteredKehadiran, filteredJadwal, filteredSiswa]);

  // Notifications (Siswa yang menyentuh batas SP)
  // SP1: >= 50 poin
  // SP2: >= 100 poin
  // SP3: >= 150 poin (Panggilan Orang Tua keras)
  // Juga alpa beruntun >= 3 hari
  const notifications = useMemo(() => {
    const list: { id: string; type: 'points' | 'attendance'; studentName: string; text: string; severity: 'warning' | 'danger'; studentId: string }[] = [];

    filteredSiswa.forEach(s => {
      if (s.totalPoin >= 150) {
        list.push({
          id: `sp3-${s.id}`,
          type: 'points',
          studentName: s.nama,
          text: `Akumulasi poin mencapai ${s.totalPoin} (Kriteria SP3 - Sangat Mendesak!). Butuh skorsing/panggilan orang tua ketiga.`,
          severity: 'danger',
          studentId: s.id
        });
      } else if (s.totalPoin >= 100) {
        list.push({
          id: `sp2-${s.id}`,
          type: 'points',
          studentName: s.nama,
          text: `Akumulasi poin mencapai ${s.totalPoin} (Kriteria SP2). Butuh Panggilan Orang Tua kedua.`,
          severity: 'danger',
          studentId: s.id
        });
      } else if (s.totalPoin >= 50) {
        list.push({
          id: `sp1-${s.id}`,
          type: 'points',
          studentName: s.nama,
          text: `Akumulasi poin mencapai ${s.totalPoin} (Kriteria SP1). Berikan surat peringatan pertama.`,
          severity: 'warning',
          studentId: s.id
        });
      }
    });

    filteredKehadiran.forEach(k => {
      if (k.alpaConsecutive >= 3) {
        list.push({
          id: `alpa-${k.id}`,
          type: 'attendance',
          studentName: k.namaSiswa,
          text: `Absen Alpa beruntun selama ${k.alpaConsecutive} hari berturut-turut! Butuh Home Visit segera.`,
          severity: 'danger',
          studentId: k.siswaId
        });
      }
    });

    return list;
  }, [filteredSiswa, filteredKehadiran]);

  // Chart data: Monthly infraction distribution (Mock but beautiful based on real categories)
  const chartData = useMemo(() => {
    // Group violations by categories to show a nice bar chart
    const groups: { [key: string]: number } = {};
    filteredPelanggaran.forEach(p => {
      const cat = p.jenis.length > 25 ? p.jenis.substring(0, 22) + '...' : p.jenis;
      groups[cat] = (groups[cat] || 0) + 1;
    });

    return Object.keys(groups).map(key => ({
      name: key,
      'Jumlah Pelanggaran': groups[key]
    })).slice(0, 6);
  }, [filteredPelanggaran]);

  // Chart data 2: Attendance rate distribution per student
  const attendanceChartData = useMemo(() => {
    return filteredKehadiran.map(k => ({
      name: k.namaSiswa.split(' ')[0], // first name for chart spacing
      'Alpa': k.alpa,
      'Sakit': k.sakit,
      'Izin': k.izin,
      'Persentase %': k.persentaseKehadiran
    })).slice(0, 8);
  }, [filteredKehadiran]);

  return (
    <div id="dashboard-tab" className="space-y-6 font-sans">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-white/15 text-indigo-550 font-semibold px-2.5 py-1 rounded-full text-xs flex items-center gap-1 w-max mb-3">
            <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
            Sistem Informasi SahabatBK
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Selamat Datang, {username}</h1>
          <p className="mt-1.5 text-indigo-100 text-sm max-w-2xl">
            {role === 'GURU_BK' && 'Hak akses penuh Guru Bimbingan dan Konseling. Kelola data master bio-psikologis, poin pelanggaran, serta jadwal bimbingan siswa hari ini.'}
            {role === 'WALI_KELAS' && `Hak akses Wali Kelas ${kelasWali}. Memantau rekap absensi, grafik poin pelanggaran, dan riwayat bimbingan siswa bimbingan di kelas Anda.`}
            {role === 'KEPALA_SEKOLAH' && 'Hak akses Eksekutif Kepala Sekolah. Memantau grafik statistik kedisiplinan dan mengunduh laporan bulanan/semester.'}
          </p>
        </div>
        
        {/* Quick info metadata */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-indigo-50 self-start md:self-auto border border-white/10">
          <div className="text-xs text-indigo-200">Tanggal Hari Ini</div>
          <div className="text-lg font-bold flex items-center gap-1.5 mt-0.5">
            <Calendar className="h-4 w-4" />
            <span>Senin, 6 Juli 2026</span>
          </div>
          <div className="text-[10px] text-indigo-300 mt-1">Tahun Ajaran: 2026/2027 Ganjil</div>
        </div>
      </div>

      {/* Role / Class Filter Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Cakupan Data</span>
            <div className="text-sm font-bold text-slate-800">
              {role === 'WALI_KELAS' ? `Terfilter Otomatis: Kelas ${kelasWali}` : 'Semua Data Siswa Sekolah'}
            </div>
          </div>
        </div>

        {/* Dynamic Class Filter Dropdown for BK and Kepsek */}
        {role !== 'WALI_KELAS' && (
          <div className="flex items-center gap-2">
            <label htmlFor="dashboard-class-filter" className="text-xs font-semibold text-slate-600">Filter Kelas:</label>
            <select
              id="dashboard-class-filter"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="SEMUA">Semua Kelas ({siswaList.length} Siswa)</option>
              {classList.map(cls => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Terlambat */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Terlambat Hari Ini</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">{stats.terlambatCount}</h3>
            <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2">
              Butuh Pembinaan
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Alpa/Absen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ketidakhadiran (Alpa)</p>
            <h3 className="text-2xl font-bold text-red-600 mt-2">{stats.totalAlpa}</h3>
            <p className="text-[10px] text-slate-500 mt-2">
              Sakit: <span className="font-semibold text-slate-700">{stats.totalSakit}</span> | Izin: <span className="font-semibold text-slate-700">{stats.totalIzin}</span>
            </p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Jadwal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jadwal Konseling</p>
            <h3 className="text-2xl font-bold text-indigo-700 mt-2">{stats.upcomingCounseling}</h3>
            <button
              onClick={() => onNavigate('Bimbingan & Konseling')}
              className="text-[10px] text-indigo-600 hover:text-indigo-500 font-semibold flex items-center gap-0.5 mt-2 transition-colors cursor-pointer"
            >
              Lihat Kalender <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: High Risk Siswa (Poin >= 50) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Siswa Poin Tinggi</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">
              {stats.highRiskCount} <span className="text-xs font-medium text-slate-400">siswa</span>
            </h3>
            <span className="inline-block bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2">
              Poin &ge; 50
            </span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Grid: Charts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Visual Trend Charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chart 1: Pelanggaran Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Distribusi Jenis Pelanggaran Terbanyak</h4>
                <p className="text-xs text-slate-500">Berdasarkan total pelanggaran yang tercatat di kelas terpilih</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" />
                Poin & Pelanggaran
              </span>
            </div>
            
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="Jumlah Pelanggaran" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Tidak ada data pelanggaran di kelas ini.
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Kehadiran Siswa */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Analisis Absensi Siswa (Sampel Kelas)</h4>
                <p className="text-xs text-slate-500">Melihat frekuensi Alpa, Sakit, dan Izin per siswa</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <FileCheck className="h-3 w-3" />
                Kehadiran
              </span>
            </div>

            <div className="h-64 w-full">
              {attendanceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorAlpa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSakit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #f1f5f9' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="Alpa" stroke="#ef4444" fillOpacity={1} fill="url(#colorAlpa)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Sakit" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSakit)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Tidak ada data absensi di kelas ini.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right 1 Column: Alerts & Active Schedules */}
        <div className="space-y-6">
          
          {/* Alert Warnings SP / Absence */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <Bell className="h-4.5 w-4.5 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-800">Pemberitahuan & Peringatan</h4>
              </div>
              <span className="bg-red-50 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {notifications.length} Aktif
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => onNavigate('Data Master Siswa', notif.studentId)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.01] ${
                      notif.severity === 'danger'
                        ? 'bg-rose-50/50 border-rose-100 hover:bg-rose-50'
                        : 'bg-amber-50/50 border-amber-100 hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded ${
                        notif.severity === 'danger'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {notif.type === 'points' ? 'Krisis Poin' : 'Alpa Beruntun'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-800">{notif.studentName}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-medium">{notif.text}</p>
                    <div className="text-[9px] text-indigo-700 font-bold mt-1.5 flex items-center justify-end gap-0.5">
                      Tinjau Profil Siswa &rarr;
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Situasi Kondusif</p>
                  <p className="text-[10px] text-slate-500 mt-1">Tidak ada siswa dengan poin di atas batas aman (50) atau alpa beruntun hari ini.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Schedule list */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-800">Jadwal Terdekat Hari Ini/Besok</h4>
              <span className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer" onClick={() => onNavigate('Bimbingan & Konseling')}>
                Semua &rarr;
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredJadwal.length > 0 ? (
                filteredJadwal.map((jadwal) => (
                  <div key={jadwal.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1.5 hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        jadwal.jenis === 'Home Visit'
                          ? 'bg-purple-50 text-purple-700 border-purple-100'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                        {jadwal.jenis}
                      </span>
                      <span className="text-slate-500 font-semibold text-[10px]">{jadwal.tanggal}</span>
                    </div>

                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>{jadwal.namaSiswa}</span>
                      <span className="text-[10px] text-slate-600 font-normal flex items-center gap-0.5">
                        <Clock className="h-3 w-3 text-slate-400" /> {jadwal.waktu}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 italic leading-relaxed">
                      &ldquo;{jadwal.keterangan}&rdquo;
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        {jadwal.status}
                      </span>
                      {role === 'GURU_BK' && (
                        <button
                          onClick={() => onNavigate('Bimbingan & Konseling')}
                          className="text-indigo-700 font-bold hover:underline cursor-pointer"
                        >
                          Proses Layanan
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="h-10 w-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mb-2">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Agenda Kosong</p>
                  <p className="text-[10px] text-slate-500 mt-1">Belum ada agenda konseling terjadwal dalam waktu dekat.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
