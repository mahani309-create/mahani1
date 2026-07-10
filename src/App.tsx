/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserRole, Siswa, Pelanggaran, Kehadiran, BimbinganLog, JadwalKonseling } from './types';
import {
  INITIAL_SISWA,
  INITIAL_PELANGGARAN,
  INITIAL_KEHADIRAN,
  INITIAL_BIMBINGAN,
  INITIAL_JADWAL
} from './mockData';

// Component imports
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SiswaMaster from './components/SiswaMaster';
import PelanggaranSistem from './components/PelanggaranSistem';
import KehadiranSistem from './components/KehadiranSistem';
import BimbinganKonseling from './components/BimbinganKonseling';
import ReportGenerator from './components/ReportGenerator';
import LaporanRekapBK from './components/LaporanRekapBK';
import PengaturanSistem from './components/PengaturanSistem';

// Icon imports
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  ClipboardCheck,
  BookOpen,
  Printer,
  LogOut,
  GraduationCap,
  Sparkles,
  ShieldAlert,
  Menu,
  X,
  FileText,
  Settings
} from 'lucide-react';

export default function App() {
  // Session Authentication
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('sahabatbk_logged_in') === 'true';
  });
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('sahabatbk_role') as UserRole) || 'GURU_BK';
  });
  const [currentUsername, setCurrentUsername] = useState<string>(() => {
    return localStorage.getItem('sahabatbk_username') || 'Sri Rahayu, S.Pd';
  });
  const [kelasWali, setKelasWali] = useState<string | undefined>(() => {
    return localStorage.getItem('sahabatbk_kelas_wali') || undefined;
  });

  // Global persistent states (synced with localStorage)
  const [siswaList, setSiswaList] = useState<Siswa[]>(() => {
    const saved = localStorage.getItem('sahabatbk_siswa');
    return saved ? JSON.parse(saved) : INITIAL_SISWA;
  });

  const [pelanggaranList, setPelanggaranList] = useState<Pelanggaran[]>(() => {
    const saved = localStorage.getItem('sahabatbk_pelanggaran');
    return saved ? JSON.parse(saved) : INITIAL_PELANGGARAN;
  });

  const [kehadiranList, setKehadiranList] = useState<Kehadiran[]>(() => {
    const saved = localStorage.getItem('sahabatbk_kehadiran');
    return saved ? JSON.parse(saved) : INITIAL_KEHADIRAN;
  });

  const [bimbinganList, setBimbinganList] = useState<BimbinganLog[]>(() => {
    const saved = localStorage.getItem('sahabatbk_bimbingan');
    return saved ? JSON.parse(saved) : INITIAL_BIMBINGAN;
  });

  const [jadwalList, setJadwalList] = useState<JadwalKonseling[]>(() => {
    const saved = localStorage.getItem('sahabatbk_jadwal');
    return saved ? JSON.parse(saved) : INITIAL_JADWAL;
  });

  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [selectedStudentIdFromAlert, setSelectedStudentIdFromAlert] = useState<string | undefined>(undefined);

  // Mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Sync state modifications to localStorage
  useEffect(() => {
    localStorage.setItem('sahabatbk_siswa', JSON.stringify(siswaList));
  }, [siswaList]);

  useEffect(() => {
    localStorage.setItem('sahabatbk_pelanggaran', JSON.stringify(pelanggaranList));
  }, [pelanggaranList]);

  useEffect(() => {
    localStorage.setItem('sahabatbk_kehadiran', JSON.stringify(kehadiranList));
  }, [kehadiranList]);

  useEffect(() => {
    localStorage.setItem('sahabatbk_bimbingan', JSON.stringify(bimbinganList));
  }, [bimbinganList]);

  useEffect(() => {
    localStorage.setItem('sahabatbk_jadwal', JSON.stringify(jadwalList));
  }, [jadwalList]);

  // Auth Handling
  const handleLogin = (role: UserRole, username: string, targetKelasWali?: string) => {
    setCurrentUserRole(role);
    setCurrentUsername(username);
    setKelasWali(targetKelasWali);
    setIsLoggedIn(true);

    localStorage.setItem('sahabatbk_logged_in', 'true');
    localStorage.setItem('sahabatbk_role', role);
    localStorage.setItem('sahabatbk_username', username);
    if (targetKelasWali) {
      localStorage.setItem('sahabatbk_kelas_wali', targetKelasWali);
    } else {
      localStorage.removeItem('sahabatbk_kelas_wali');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('sahabatbk_logged_in');
  };



  // Cross-Navigation callback (e.g., clicking on alert on Dashboard redirects to Student Master)
  const handleCrossNavigation = (tab: string, studentId?: string) => {
    setActiveTab(tab);
    if (studentId) {
      setSelectedStudentIdFromAlert(studentId);
    } else {
      setSelectedStudentIdFromAlert(undefined);
    }
  };

  // Database Modifiers
  // 1. Add Siswa (Student)
  const handleAddSiswa = (newSiswaData: Omit<Siswa, 'id' | 'totalPoin'>) => {
    const newId = `s-${Date.now()}`;
    const newSiswa: Siswa = {
      ...newSiswaData,
      id: newId,
      totalPoin: 0,
    };
    setSiswaList(prev => [newSiswa, ...prev]);

    // Also bootstrap an empty attendance record for them
    const newKehadiran: Kehadiran = {
      id: `k-${Date.now()}`,
      siswaId: newId,
      namaSiswa: newSiswa.nama,
      kelasSiswa: newSiswa.kelas,
      alpa: 0,
      izin: 0,
      sakit: 0,
      diska: 0,
      persentaseKehadiran: 100,
      alpaConsecutive: 0,
    };
    setKehadiranList(prev => [...prev, newKehadiran]);
  };

  // 2. Update Siswa
  const handleUpdateSiswa = (updatedSiswa: Siswa) => {
    setSiswaList(prev => prev.map(s => s.id === updatedSiswa.id ? updatedSiswa : s));
  };

  // 2b. Bulk Update Siswa
  const handleBulkUpdateSiswa = (updatedSiswaList: Siswa[]) => {
    const updatedMap = new Map(updatedSiswaList.map(s => [s.id, s]));
    setSiswaList(prev => prev.map(s => updatedMap.has(s.id) ? updatedMap.get(s.id)! : s));

    // Keep Kehadiran records synced for updated students
    setKehadiranList(prev => prev.map(k => {
      const match = updatedSiswaList.find(s => s.id === k.siswaId);
      if (match) {
        return {
          ...k,
          kelasSiswa: match.kelas,
          namaSiswa: match.nama // just in case
        };
      }
      return k;
    }));
  };

  // 3. Add Pelanggaran (Violation Record) & Increment Points automatically
  const handleAddPelanggaran = (newPelanggaranData: Omit<Pelanggaran, 'id'>) => {
    const newId = `p-${Date.now()}`;
    const newPelanggaran: Pelanggaran = {
      ...newPelanggaranData,
      id: newId
    };
    setPelanggaranList(prev => [newPelanggaran, ...prev]);

    // Automatically increase total points of the student
    setSiswaList(prev => prev.map(s => {
      if (s.id === newPelanggaran.siswaId) {
        return {
          ...s,
          totalPoin: s.totalPoin + newPelanggaran.poin
        };
      }
      return s;
    }));
  };

  // 4. Update Kehadiran summary records
  const handleUpdateKehadiran = (updatedKehadiran: Kehadiran) => {
    setKehadiranList(prev => prev.map(k => k.id === updatedKehadiran.id ? updatedKehadiran : k));
  };

  // 5. Add Bimbingan log journal
  const handleAddBimbingan = (newBimbinganData: Omit<BimbinganLog, 'id'>) => {
    const newId = `b-${Date.now()}`;
    const newLog: BimbinganLog = {
      ...newBimbinganData,
      id: newId
    };
    setBimbinganList(prev => [newLog, ...prev]);
  };

  // 6. Add Schedule counseling/home visit
  const handleAddJadwal = (newJadwalData: Omit<JadwalKonseling, 'id' | 'status'>) => {
    const newId = `j-${Date.now()}`;
    const newJadwal: JadwalKonseling = {
      ...newJadwalData,
      id: newId,
      status: 'Terjadwal'
    };
    setJadwalList(prev => [newJadwal, ...prev]);
  };

  // 7. Update Schedule Status
  const handleUpdateJadwalStatus = (id: string, newStatus: 'Terjadwal' | 'Selesai' | 'Batal') => {
    setJadwalList(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j));
  };

  // 8. Reset entire database back to default initial state
  const handleResetDatabase = () => {
    localStorage.removeItem('sahabatbk_siswa');
    localStorage.removeItem('sahabatbk_pelanggaran');
    localStorage.removeItem('sahabatbk_kehadiran');
    localStorage.removeItem('sahabatbk_bimbingan');
    localStorage.removeItem('sahabatbk_jadwal');

    localStorage.removeItem('sahabatbk_setting_school_name');
    localStorage.removeItem('sahabatbk_setting_school_address');
    localStorage.removeItem('sahabatbk_setting_principal_name');
    localStorage.removeItem('sahabatbk_setting_principal_nip');
    localStorage.removeItem('sahabatbk_setting_counselor_nip');
    localStorage.removeItem('sahabatbk_setting_sp1_limit');
    localStorage.removeItem('sahabatbk_setting_sp2_limit');
    localStorage.removeItem('sahabatbk_setting_sp3_limit');
    localStorage.removeItem('sahabatbk_setting_alpa_consec_limit');

    setSiswaList(INITIAL_SISWA);
    setPelanggaranList(INITIAL_PELANGGARAN);
    setKehadiranList(INITIAL_KEHADIRAN);
    setBimbinganList(INITIAL_BIMBINGAN);
    setJadwalList(INITIAL_JADWAL);
  };

  // Check login
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Sidebar Menu Items
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Data Master Siswa', icon: Users },
    { name: 'Rekap Pelanggaran', icon: AlertTriangle },
    { name: 'Rekap Kehadiran', icon: ClipboardCheck },
    { name: 'Bimbingan & Konseling', icon: BookOpen },
    { name: 'Laporan & Rekap BK', icon: FileText },
    { name: 'Report Generator', icon: Printer },
    { name: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-800">
      
      {/* 1. SIDEBAR NAVIGATION - DESKTOP */}
      <aside id="sidebar-desktop" className="hidden lg:flex lg:flex-col lg:w-64 bg-white text-slate-700 border-r border-slate-200 shrink-0 select-none">
        
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-2.5">
          <div className="h-9 w-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-indigo-900 tracking-tight">SahabatBK</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-wide uppercase">SMPN 3 KRAS PORTAL BK</p>
          </div>
        </div>

        {/* User Session profile badge */}
        <div className="p-4 mx-4 my-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Akun Aktif</span>
          <div className="font-bold text-slate-800 mt-0.5 truncate">{currentUsername}</div>
          
          <div className="flex items-center justify-between mt-2.5">
            <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wide border ${
              currentUserRole === 'GURU_BK'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : currentUserRole === 'WALI_KELAS'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                : 'bg-amber-50 text-amber-700 border-amber-100'
            }`}>
              {currentUserRole === 'GURU_BK' && 'Guru BK'}
              {currentUserRole === 'WALI_KELAS' && `Wali Kelas ${kelasWali || ''}`}
              {currentUserRole === 'KEPALA_SEKOLAH' && 'Kepala Sekolah'}
            </span>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                id={`menu-item-${item.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                onClick={() => { setActiveTab(item.name); setSelectedStudentIdFromAlert(undefined); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>



        {/* Log Out Button */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50/50 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Keluar Akun</span>
          </button>
          
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
            <p>Developer: <strong className="text-slate-500">KHABIBU ROHMAN</strong></p>
          </div>
        </div>

      </aside>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Navbar Header (Visible on Desktop for quick switches, and is the header on Mobile) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          
          {/* Mobile Hamburguer trigger */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <Menu className="h-5.5 w-5.5" />
            </button>
            <div className="flex items-center gap-1.5">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-black text-sm text-slate-900 tracking-tight">SahabatBK</span>
            </div>
          </div>

          {/* Desktop header metadata */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>SMP NEGERI 3 KRAS</span>
            <span>&bull;</span>
            <span className="text-slate-400">Tahun Pelajaran 2026/2027 Ganjil</span>
          </div>

          {/* User badge and switch warning notifications */}
          <div className="flex items-center gap-4">
            
            {/* Quick internal test info on top */}
            <div className="hidden md:flex items-center gap-2.5 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg text-[11px] font-bold">
              <span className="text-indigo-700 font-extrabold uppercase text-[9px] bg-indigo-50 px-1.5 py-0.5 rounded">Akses:</span>
              <span className="text-slate-700 font-bold">
                {currentUserRole === 'GURU_BK' && 'Konselor BK (Full Access)'}
                {currentUserRole === 'WALI_KELAS' && `Wali Kelas ${kelasWali}`}
                {currentUserRole === 'KEPALA_SEKOLAH' && 'Kepala Sekolah (Membaca)'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title="Keluar Akun"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* 3. DYNAMIC CONTENT MAIN AREA */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          
          {/* Active View Router */}
          {activeTab === 'Dashboard' && (
            <Dashboard
              role={currentUserRole}
              username={currentUsername}
              kelasWali={kelasWali}
              siswaList={siswaList}
              pelanggaranList={pelanggaranList}
              kehadiranList={kehadiranList}
              jadwalList={jadwalList}
              onNavigate={handleCrossNavigation}
            />
          )}

          {activeTab === 'Data Master Siswa' && (
            <SiswaMaster
              role={currentUserRole}
              kelasWali={kelasWali}
              siswaList={siswaList}
              onAddSiswa={handleAddSiswa}
              onUpdateSiswa={handleUpdateSiswa}
              onBulkUpdateSiswa={handleBulkUpdateSiswa}
              initialSelectedStudentId={selectedStudentIdFromAlert}
            />
          )}

          {activeTab === 'Rekap Pelanggaran' && (
            <PelanggaranSistem
              role={currentUserRole}
              kelasWali={kelasWali}
              siswaList={siswaList}
              pelanggaranList={pelanggaranList}
              onAddPelanggaran={handleAddPelanggaran}
            />
          )}

          {activeTab === 'Rekap Kehadiran' && (
            <KehadiranSistem
              role={currentUserRole}
              kelasWali={kelasWali}
              kehadiranList={kehadiranList}
              siswaList={siswaList}
              onUpdateKehadiran={handleUpdateKehadiran}
            />
          )}

          {activeTab === 'Bimbingan & Konseling' && (
            <BimbinganKonseling
              role={currentUserRole}
              kelasWali={kelasWali}
              siswaList={siswaList}
              bimbinganList={bimbinganList}
              jadwalList={jadwalList}
              onAddBimbingan={handleAddBimbingan}
              onAddJadwal={handleAddJadwal}
              onUpdateJadwalStatus={handleUpdateJadwalStatus}
            />
          )}

          {activeTab === 'Laporan & Rekap BK' && (
            <LaporanRekapBK
              role={currentUserRole}
              kelasWali={kelasWali}
              siswaList={siswaList}
              bimbinganList={bimbinganList}
              jadwalList={jadwalList}
            />
          )}

          {activeTab === 'Report Generator' && (
            <ReportGenerator
              role={currentUserRole}
              siswaList={siswaList}
              pelanggaranList={pelanggaranList}
              kehadiranList={kehadiranList}
              bimbinganList={bimbinganList}
            />
          )}

          {activeTab === 'Pengaturan' && (
            <PengaturanSistem
              role={currentUserRole}
              username={currentUsername}
              kelasWali={kelasWali}
              onUpdateRole={setCurrentUserRole}
              onUpdateUsername={setCurrentUsername}
              onResetDatabase={handleResetDatabase}
            />
          )}

        </main>
      </div>

      {/* 4. MOBILE DRAWER NAVIGATION MENU Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex">
          <div className="w-64 bg-white text-slate-700 h-full flex flex-col justify-between border-r border-slate-200">
            <div>
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-4.5 w-4.5 text-white" />
                  </div>
                  <span className="font-extrabold text-sm text-indigo-900">SahabatBK</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Account Info */}
              <div className="p-4 mx-4 my-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Akun Aktif</span>
                <div className="font-bold text-slate-800 mt-0.5">{currentUsername}</div>
                <div className="mt-1 text-[10px] text-slate-500">Role: {currentUserRole}</div>
              </div>

              {/* Mobile navigation links */}
              <nav className="px-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => { setActiveTab(item.name); setSelectedStudentIdFromAlert(undefined); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50/50 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
          
          {/* Backdrop closer */}
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
        </div>
      )}

    </div>
  );
}
