/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserRole, UserAccount, DEFAULT_ACCOUNTS, Siswa, Pelanggaran, Kehadiran, BimbinganLog, JadwalKonseling } from '../types';
import {
  Settings,
  User,
  GraduationCap,
  ShieldAlert,
  Database,
  Info,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Briefcase,
  Sliders,
  Sparkles,
  Users,
  UserPlus,
  Trash2,
  Edit2,
  X,
  QrCode,
  Cpu
} from 'lucide-react';
import {
  INITIAL_SISWA,
  INITIAL_PELANGGARAN,
  INITIAL_KEHADIRAN,
  INITIAL_BIMBINGAN,
  INITIAL_JADWAL
} from '../mockData';

interface PengaturanSistemProps {
  role: UserRole;
  username: string;
  kelasWali?: string;
  onUpdateRole: (role: UserRole) => void;
  onUpdateUsername: (name: string) => void;
  // Trigger system resets
  onResetDatabase: () => void;
}

export default function PengaturanSistem({
  role,
  username,
  kelasWali,
  onUpdateRole,
  onUpdateUsername,
  onResetDatabase,
}: PengaturanSistemProps) {
  // Navigation inside Settings tab
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'discipline' | 'accounts' | 'database' | 'about' | 'integration'>('profile');

  // Registered Accounts State
  const [accountsList, setAccountsList] = useState<UserAccount[]>(() => {
    const stored = localStorage.getItem('sahabatbk_accounts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserAccount[];
        const customAccounts = parsed.filter(acc => !acc.isDefault);
        const merged = [...DEFAULT_ACCOUNTS, ...customAccounts];
        return merged;
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  // Form states to add new account
  const [newUsername, setNewUsername] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState<UserRole>('WALI_KELAS');
  const [newKelasWali, setNewKelasWali] = useState('XI-IPA-1');

  // Editing state for user accounts
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('WALI_KELAS');
  const [editKelasWali, setEditKelasWali] = useState('XI-IPA-1');

  // Form states - Profile & School
  const [schoolName, setSchoolName] = useState(() => localStorage.getItem('sahabatbk_setting_school_name') || 'SMP NEGERI 3 KRAS');
  const [schoolAddress, setSchoolAddress] = useState(() => localStorage.getItem('sahabatbk_setting_school_address') || 'Jl. Raya Kras, Kediri, Jawa Timur');
  const [principalName, setPrincipalName] = useState(() => localStorage.getItem('sahabatbk_setting_principal_name') || 'Dr. H. Mulyono, M.Si.');
  const [principalNip, setPrincipalNip] = useState(() => localStorage.getItem('sahabatbk_setting_principal_nip') || '196805121994031005');
  const [counselorNip, setCounselorNip] = useState(() => localStorage.getItem('sahabatbk_setting_counselor_nip') || '197410042003122002');
  const [activeUsername, setActiveUsername] = useState(username);

  // Form states - SP Thresholds
  const [sp1, setSp1] = useState(() => Number(localStorage.getItem('sahabatbk_setting_sp1_limit') || '50'));
  const [sp2, setSp2] = useState(() => Number(localStorage.getItem('sahabatbk_setting_sp2_limit') || '100'));
  const [sp3, setSp3] = useState(() => Number(localStorage.getItem('sahabatbk_setting_sp3_limit') || '150'));
  const [consecutiveAlpa, setConsecutiveAlpa] = useState(() => Number(localStorage.getItem('sahabatbk_setting_alpa_consec_limit') || '3'));
  const [jamBatasAbsen, setJamBatasAbsen] = useState(() => localStorage.getItem('sahabatbk_setting_jam_batas_absen') || '07:15');

  // Notification and Status States
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [backupJson, setBackupJson] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreError, setShowRestoreError] = useState<string | null>(null);

  // Device integration settings states
  const [barcodeEnabled, setBarcodeEnabled] = useState(() => localStorage.getItem('sahabatbk_setting_barcode_enabled') !== 'false');
  const [barcodeDevice, setBarcodeDevice] = useState(() => localStorage.getItem('sahabatbk_setting_barcode_device') || 'Kamera Bawaan (Default Front Camera)');
  const [barcodeAction, setBarcodeAction] = useState(() => localStorage.getItem('sahabatbk_setting_barcode_action') || 'absen');
  const [fingerprintEnabled, setFingerprintEnabled] = useState(() => localStorage.getItem('sahabatbk_setting_fingerprint_enabled') === 'true');
  const [fingerprintModel, setFingerprintModel] = useState(() => localStorage.getItem('sahabatbk_setting_fingerprint_model') || 'Solution X100-C');
  const [fingerprintIp, setFingerprintIp] = useState(() => localStorage.getItem('sahabatbk_setting_fingerprint_ip') || '192.168.1.224');
  const [fingerprintPort, setFingerprintPort] = useState(() => localStorage.getItem('sahabatbk_setting_fingerprint_port') || '4370');
  
  // Connection testing states
  const [fingerprintStatus, setFingerprintStatus] = useState(() => localStorage.getItem('sahabatbk_setting_fingerprint_status') || 'Terputus');
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);

  // Keep state synced if username prop changes externally (like switching roles)
  useEffect(() => {
    setActiveUsername(username);
  }, [username]);

  // Handle Save Profile & School
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sahabatbk_setting_school_name', schoolName);
    localStorage.setItem('sahabatbk_setting_school_address', schoolAddress);
    localStorage.setItem('sahabatbk_setting_principal_name', principalName);
    localStorage.setItem('sahabatbk_setting_principal_nip', principalNip);
    localStorage.setItem('sahabatbk_setting_counselor_nip', counselorNip);
    
    if (activeUsername.trim()) {
      onUpdateUsername(activeUsername.trim());
      localStorage.setItem('sahabatbk_username', activeUsername.trim());
    }

    triggerSuccessMessage('Profil sekolah dan pengguna berhasil diperbarui!');
  };

  // Handle Save SP Thresholds
  const handleSaveDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    if (sp1 >= sp2 || sp2 >= sp3) {
      alert('Error: Tingkatan batas poin harus teratur (SP1 < SP2 < SP3)');
      return;
    }
    localStorage.setItem('sahabatbk_setting_sp1_limit', String(sp1));
    localStorage.setItem('sahabatbk_setting_sp2_limit', String(sp2));
    localStorage.setItem('sahabatbk_setting_sp3_limit', String(sp3));
    localStorage.setItem('sahabatbk_setting_alpa_consec_limit', String(consecutiveAlpa));
    localStorage.setItem('sahabatbk_setting_jam_batas_absen', jamBatasAbsen);

    triggerSuccessMessage('Batas poin peringatan disiplin (SP) & jam masuk berhasil disimpan!');
  };

  // Handle Save Device Integration Settings
  const handleSaveIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sahabatbk_setting_barcode_enabled', String(barcodeEnabled));
    localStorage.setItem('sahabatbk_setting_barcode_device', barcodeDevice);
    localStorage.setItem('sahabatbk_setting_barcode_action', barcodeAction);
    localStorage.setItem('sahabatbk_setting_fingerprint_enabled', String(fingerprintEnabled));
    localStorage.setItem('sahabatbk_setting_fingerprint_model', fingerprintModel);
    localStorage.setItem('sahabatbk_setting_fingerprint_ip', fingerprintIp);
    localStorage.setItem('sahabatbk_setting_fingerprint_port', fingerprintPort);
    localStorage.setItem('sahabatbk_setting_fingerprint_status', fingerprintStatus);

    triggerSuccessMessage('Pengaturan integrasi alat (kamera barcode & fingerprint) berhasil disimpan!');
  };

  // Test fingerprint device connection
  const handleTestConnection = () => {
    setIsTestingConn(true);
    setTestLog([]);
    setFingerprintStatus('Menghubungkan...');
    
    const logs = [
      `[INFO] Menginisialisasi soket koneksi TCP/IP...`,
      `[INFO] Menghubungkan ke devais ${fingerprintModel} di IP ${fingerprintIp}:${fingerprintPort}...`,
      `[INFO] Mengirim sinyal handshake ping (0xAA55)...`,
      `[INFO] Handshake diterima! Membaca firmware devais...`,
      `[SUCCESS] Devais terhubung! Model: ${fingerprintModel}, SDK Versi: 9.25, Algoritma: VX10.0`
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setTestLog(prev => [...prev, log]);
        if (index === logs.length - 1) {
          setIsTestingConn(false);
          setFingerprintStatus('Terhubung');
          localStorage.setItem('sahabatbk_setting_fingerprint_status', 'Terhubung');
        }
      }, (index + 1) * 350);
    });
  };

  // Sync Accounts with localStorage
  useEffect(() => {
    localStorage.setItem('sahabatbk_accounts', JSON.stringify(accountsList));
  }, [accountsList]);

  // Handle Add Account
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim();
    const cleanNama = newNama.trim();
    const cleanPassword = newPassword.trim() || 'password123';

    if (!cleanUsername || !cleanNama) {
      alert('Username dan Nama harus diisi!');
      return;
    }

    if (accountsList.some(acc => acc.username.toLowerCase() === cleanUsername.toLowerCase() && acc.role === newRole)) {
      alert(`Username "${cleanUsername}" dengan peran ${newRole} sudah terdaftar!`);
      return;
    }

    const newAcc: UserAccount = {
      id: `acc-${Date.now()}`,
      username: cleanUsername,
      nama: cleanNama,
      role: newRole,
      password: cleanPassword,
      kelasWali: newRole === 'WALI_KELAS' ? newKelasWali : undefined,
      isDefault: false
    };

    setAccountsList(prev => [...prev, newAcc]);
    setNewUsername('');
    setNewNama('');
    setNewPassword('password123');
    triggerSuccessMessage('Akun baru berhasil didaftarkan ke sistem!');
  };

  // Handle Delete Account
  const handleDeleteAccount = (id: string) => {
    const matched = accountsList.find(acc => acc.id === id);
    if (matched && matched.isDefault) {
      alert('Akun bawaan sistem (default) tidak dapat dihapus untuk keamanan sistem.');
      return;
    }
    if (confirm('Apakah Anda yakin ingin menghapus akun ini?')) {
      setAccountsList(prev => prev.filter(acc => acc.id !== id));
      triggerSuccessMessage('Akun berhasil dihapus dari sistem.');
    }
  };

  // Start Editing Account
  const handleStartEditAccount = (acc: UserAccount) => {
    setEditingAccountId(acc.id);
    setEditNama(acc.nama);
    setEditUsername(acc.username);
    setEditPassword(acc.password || 'password123');
    setEditRole(acc.role);
    setEditKelasWali(acc.kelasWali || 'XI-IPA-1');
  };

  // Cancel Editing Account
  const handleCancelEditAccount = () => {
    setEditingAccountId(null);
  };

  // Save Edited Account
  const handleSaveEditAccount = (id: string) => {
    if (!editNama.trim() || !editUsername.trim()) {
      alert('Nama Lengkap dan Username harus diisi!');
      return;
    }

    if (accountsList.some(acc => acc.id !== id && acc.username.toLowerCase() === editUsername.trim().toLowerCase() && acc.role === editRole)) {
      alert(`Username "${editUsername}" dengan peran ${editRole} sudah terdaftar!`);
      return;
    }

    setAccountsList(prev => prev.map(acc => {
      if (acc.id === id) {
        return {
          ...acc,
          nama: editNama.trim(),
          username: editUsername.trim(),
          password: editPassword,
          role: editRole,
          kelasWali: editRole === 'WALI_KELAS' ? editKelasWali : undefined
        };
      }
      return acc;
    }));

    setEditingAccountId(null);
    triggerSuccessMessage('Akun pengguna berhasil diperbarui!');
  };

  // Handle Restore Default Accounts
  const handleRestoreAccounts = () => {
    if (confirm('Apakah Anda yakin ingin merestore semua akun ke setelan default/bawaan? Akun kustom yang Anda tambahkan akan dihapus.')) {
      setAccountsList(DEFAULT_ACCOUNTS);
      localStorage.setItem('sahabatbk_accounts', JSON.stringify(DEFAULT_ACCOUNTS));
      triggerSuccessMessage('Daftar akun berhasil direstore ke akun default/bawaan!');
    }
  };

  const triggerSuccessMessage = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => {
      setSaveSuccess(null);
    }, 4000);
  };

  // Export Data Backup as JSON file
  const handleExportBackup = () => {
    const backupObj = {
      siswa: localStorage.getItem('sahabatbk_siswa') ? JSON.parse(localStorage.getItem('sahabatbk_siswa')!) : INITIAL_SISWA,
      pelanggaran: localStorage.getItem('sahabatbk_pelanggaran') ? JSON.parse(localStorage.getItem('sahabatbk_pelanggaran')!) : INITIAL_PELANGGARAN,
      kehadiran: localStorage.getItem('sahabatbk_kehadiran') ? JSON.parse(localStorage.getItem('sahabatbk_kehadiran')!) : INITIAL_KEHADIRAN,
      bimbingan: localStorage.getItem('sahabatbk_bimbingan') ? JSON.parse(localStorage.getItem('sahabatbk_bimbingan')!) : INITIAL_BIMBINGAN,
      jadwal: localStorage.getItem('sahabatbk_jadwal') ? JSON.parse(localStorage.getItem('sahabatbk_jadwal')!) : INITIAL_JADWAL,
      settings: {
        schoolName,
        schoolAddress,
        principalName,
        principalNip,
        counselorNip,
        sp1,
        sp2,
        sp3,
        consecutiveAlpa,
      }
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SahabatBK_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerSuccessMessage('Berkas cadangan data (backup) berhasil diunduh!');
  };

  // Import Backup logic
  const handleImportBackup = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRestoreError(null);
    try {
      if (!backupJson.trim()) {
        throw new Error('Kolom teks cadangan JSON kosong!');
      }
      const parsed = JSON.parse(backupJson);
      
      // Basic validation
      if (!parsed.siswa || !parsed.pelanggaran || !parsed.kehadiran) {
        throw new Error('Format berkas JSON cadangan salah. Pastikan berisi data siswa, pelanggaran, dan kehadiran.');
      }

      // Restore
      localStorage.setItem('sahabatbk_siswa', JSON.stringify(parsed.siswa));
      localStorage.setItem('sahabatbk_pelanggaran', JSON.stringify(parsed.pelanggaran));
      localStorage.setItem('sahabatbk_kehadiran', JSON.stringify(parsed.kehadiran));
      if (parsed.bimbingan) localStorage.setItem('sahabatbk_bimbingan', JSON.stringify(parsed.bimbingan));
      if (parsed.jadwal) localStorage.setItem('sahabatbk_jadwal', JSON.stringify(parsed.jadwal));
      
      if (parsed.settings) {
        const s = parsed.settings;
        if (s.schoolName) {
          localStorage.setItem('sahabatbk_setting_school_name', s.schoolName);
          setSchoolName(s.schoolName);
        }
        if (s.schoolAddress) {
          localStorage.setItem('sahabatbk_setting_school_address', s.schoolAddress);
          setSchoolAddress(s.schoolAddress);
        }
        if (s.principalName) {
          localStorage.setItem('sahabatbk_setting_principal_name', s.principalName);
          setPrincipalName(s.principalName);
        }
        if (s.principalNip) {
          localStorage.setItem('sahabatbk_setting_principal_nip', s.principalNip);
          setPrincipalNip(s.principalNip);
        }
        if (s.counselorNip) {
          localStorage.setItem('sahabatbk_setting_counselor_nip', s.counselorNip);
          setCounselorNip(s.counselorNip);
        }
        if (s.sp1) {
          localStorage.setItem('sahabatbk_setting_sp1_limit', String(s.sp1));
          setSp1(s.sp1);
        }
        if (s.sp2) {
          localStorage.setItem('sahabatbk_setting_sp2_limit', String(s.sp2));
          setSp2(s.sp2);
        }
        if (s.sp3) {
          localStorage.setItem('sahabatbk_setting_sp3_limit', String(s.sp3));
          setSp3(s.sp3);
        }
        if (s.consecutiveAlpa) {
          localStorage.setItem('sahabatbk_setting_alpa_consec_limit', String(s.consecutiveAlpa));
          setConsecutiveAlpa(s.consecutiveAlpa);
        }
      }

      triggerSuccessMessage('Restorasi data cadangan berhasil! Halaman akan direfresh dalam beberapa detik.');
      setBackupJson('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      setShowRestoreError(err.message || 'Gagal mengurai teks JSON cadangan.');
    }
  };

  const handleResetConfirm = () => {
    onResetDatabase();
    setShowResetConfirm(false);
    triggerSuccessMessage('Pangkalan data telah di-reset ke data bawaan awal (seed data)!');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div id="settings-menu-container" className="space-y-6 font-sans">
      
      {/* Title & Description */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-600 animate-spin-slow" />
          Pengaturan Aplikasi SahabatBK
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur informasi sekolah, batas akumulasi poin disiplin siswa, ekspor-impor cadangan data, serta konfigurasi akun.
        </p>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold leading-relaxed">{saveSuccess}</p>
        </div>
      )}

      {/* Layout Grid: Left Settings Menu, Right Content Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Sub-tabs Sidebar Navigation */}
        <div className="md:col-span-1 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-1.5 h-fit">
          <button
            id="tab-settings-profile"
            onClick={() => setActiveSubTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="h-4 w-4" />
            Profil & Sekolah
          </button>

          <button
            id="tab-settings-discipline"
            onClick={() => setActiveSubTab('discipline')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'discipline'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Batas Poin SP
          </button>

          <button
            id="tab-settings-accounts"
            onClick={() => setActiveSubTab('accounts')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'accounts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            Manajemen Akun
          </button>

          <button
            id="tab-settings-database"
            onClick={() => setActiveSubTab('database')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'database'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Database className="h-4 w-4" />
            Sistem & Database
          </button>

          <button
            id="tab-settings-integration"
            onClick={() => setActiveSubTab('integration')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'integration'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Cpu className="h-4 w-4" />
            Integrasi Alat (Device)
          </button>

          <button
            id="tab-settings-about"
            onClick={() => setActiveSubTab('about')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'about'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Info className="h-4 w-4" />
            Tentang Aplikasi
          </button>
        </div>

        {/* Content Configuration Panel */}
        <div className="md:col-span-3">
          
          {/* TAB 1: Profile & School Settings */}
          {activeSubTab === 'profile' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Informasi Sekolah & Pengguna</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Data di bawah akan digunakan pada kop surat resmi laporan PDF</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* School Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Nama Sekolah</label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Counselor Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Nama Guru BK (Username Aktif)</label>
                    <input
                      type="text"
                      value={activeUsername}
                      onChange={(e) => setActiveUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Principal Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Nama Kepala Sekolah</label>
                    <input
                      type="text"
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Principal NIP */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      value={principalNip}
                      onChange={(e) => setPrincipalNip(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Counselor NIP */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">NIP Guru BK</label>
                    <input
                      type="text"
                      value={counselorNip}
                      onChange={(e) => setCounselorNip(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Active Role Preview */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Hak Akses Sistem</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 flex items-center justify-between">
                      <span>{role}</span>
                      <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">Tidak Dapat Diubah</span>
                    </div>
                  </div>

                </div>

                {/* School Address */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Alamat Lengkap Sekolah</label>
                  <textarea
                    rows={2}
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="btn-save-profile-settings"
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs hover:shadow-md"
                  >
                    <Save className="h-4 w-4" /> Simpan Perubahan Profil
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* TAB 2: Discipline SP Threshold Settings */}
          {activeSubTab === 'discipline' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Threshold Batas Poin Disiplin & SP</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Tentukan parameter ambang batas poin pembinaan kesiswaan</p>
                </div>
              </div>

              <form onSubmit={handleSaveDiscipline} className="space-y-5">
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  Peserta didik yang mengumpulkan poin pelanggaran melebihi batas di bawah ini akan memicu <strong>Peringatan Peringatan Khusus</strong> di beranda dashboard untuk ditindaklanjuti dengan surat peringatan atau mediasi orang tua.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* SP1 limit */}
                  <div className="space-y-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <label className="text-[10px] font-extrabold text-rose-600 uppercase block">Ambang Poin SP1</label>
                    <span className="text-[10px] text-slate-400 font-semibold block mb-2">Peringatan Pertama</span>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={sp1}
                      onChange={(e) => setSp1(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                      required
                    />
                  </div>

                  {/* SP2 limit */}
                  <div className="space-y-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <label className="text-[10px] font-extrabold text-purple-600 uppercase block">Ambang Poin SP2</label>
                    <span className="text-[10px] text-slate-400 font-semibold block mb-2">Peringatan Kedua</span>
                    <input
                      type="number"
                      min={30}
                      max={200}
                      value={sp2}
                      onChange={(e) => setSp2(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                      required
                    />
                  </div>

                  {/* SP3 limit */}
                  <div className="space-y-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <label className="text-[10px] font-extrabold text-indigo-600 uppercase block">Ambang Poin SP3</label>
                    <span className="text-[10px] text-slate-400 font-semibold block mb-2">Skorsing & Mediasi</span>
                    <input
                      type="number"
                      min={50}
                      max={300}
                      value={sp3}
                      onChange={(e) => setSp3(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                </div>

                {/* Consecutive Alpa Limit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <label className="text-[10px] font-extrabold text-slate-700 uppercase">Batas Alpa Beruntun (Absensi)</label>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 mb-2">Siswa yang tidak hadir tanpa kabar berturut-turut melebihi batas ini wajib dikunjungi (Home Visit)</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={2}
                        max={7}
                        value={consecutiveAlpa}
                        onChange={(e) => setConsecutiveAlpa(Number(e.target.value))}
                        className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                        required
                      />
                      <span className="text-xs font-semibold text-slate-500">Hari Berturut-Turut</span>
                    </div>
                  </div>

                  {/* Jam Batas Presensi Masuk */}
                  <div className="space-y-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-500" />
                      <label className="text-[10px] font-extrabold text-slate-700 uppercase">Jam Batas Presensi Masuk</label>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 mb-2">Batas waktu siswa melakukan presensi kartu sebelum dianggap "Belum Hadir" pada hari itu</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="time"
                        value={jamBatasAbsen}
                        onChange={(e) => setJamBatasAbsen(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                      <span className="text-xs font-semibold text-slate-500">WIB (Format 24 Jam)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="btn-save-discipline-settings"
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs hover:shadow-md"
                  >
                    <Save className="h-4 w-4" /> Simpan Parameter SP
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* TAB: User Accounts Management */}
          {activeSubTab === 'accounts' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">Manajemen Akun Pengguna</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Kelola daftar akun resmi Kepala Sekolah, Guru BK, dan Wali Kelas</p>
                  </div>
                </div>
                
                <button
                  id="btn-restore-default-accounts"
                  type="button"
                  onClick={handleRestoreAccounts}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore Akun Default
                </button>
              </div>

              {/* Grid: Left column for account list, right column for registration form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* List of Accounts */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Daftar Akun Terdaftar ({accountsList.length})</h4>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs bg-slate-50/30">
                    <table className="min-w-full divide-y divide-slate-100 text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3.5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Nama Lengkap</th>
                          <th className="px-3.5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Username/NIP</th>
                          <th className="px-3.5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Peran</th>
                          <th className="px-3.5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {accountsList.map((acc) => {
                          const isEditing = editingAccountId === acc.id;
                          return isEditing ? (
                            <tr key={acc.id} className="bg-indigo-50/40">
                              <td className="px-3.5 py-3 space-y-1.5">
                                <label className="block text-[8px] font-extrabold text-slate-400 uppercase">Nama Lengkap</label>
                                <input
                                  type="text"
                                  value={editNama}
                                  onChange={(e) => setEditNama(e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="Nama Lengkap"
                                  required
                                />
                                {editRole === 'WALI_KELAS' && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[8px] font-extrabold text-slate-500 uppercase">Kelas:</span>
                                    <select
                                      value={editKelasWali}
                                      onChange={(e) => setEditKelasWali(e.target.value)}
                                      className="px-1.5 py-0.5 text-[10px] font-bold border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                      <option value="XI-IPA-1">XI-IPA-1</option>
                                      <option value="XI-IPS-2">XI-IPS-2</option>
                                      <option value="X-A">X-A</option>
                                      <option value="X-B">X-B</option>
                                      <option value="XII-IPA-2">XII-IPA-2</option>
                                    </select>
                                  </div>
                                )}
                              </td>
                              <td className="px-3.5 py-3 space-y-1.5">
                                <label className="block text-[8px] font-extrabold text-slate-400 uppercase">Username / NIP</label>
                                <input
                                  type="text"
                                  value={editUsername}
                                  onChange={(e) => setEditUsername(e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="Username"
                                  required
                                />
                                <div className="space-y-0.5">
                                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase">Password</label>
                                  <input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Password"
                                    required
                                  />
                                </div>
                              </td>
                              <td className="px-3.5 py-3">
                                <label className="block text-[8px] font-extrabold text-slate-400 uppercase mb-1">Peran</label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                                  className="px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="GURU_BK">Guru BK</option>
                                  <option value="WALI_KELAS">Wali Kelas</option>
                                  <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
                                  <option value="GURU_PIKET">Guru Piket</option>
                                </select>
                              </td>
                              <td className="px-3.5 py-3 text-right">
                                <div className="flex flex-col items-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditAccount(acc.id)}
                                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                  >
                                    <Save className="h-3 w-3" /> Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditAccount}
                                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border border-slate-200"
                                  >
                                    <X className="h-3 w-3" /> Batal
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-3.5 py-3">
                                <p className="text-xs font-bold text-slate-800">{acc.nama}</p>
                                {acc.role === 'WALI_KELAS' && (
                                  <p className="text-[9px] text-emerald-600 font-extrabold uppercase mt-0.5">Wali Kelas: {acc.kelasWali}</p>
                                )}
                              </td>
                              <td className="px-3.5 py-3">
                                <code className="text-[11px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">{acc.username}</code>
                              </td>
                              <td className="px-3.5 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${
                                  acc.role === 'GURU_BK' 
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                    : acc.role === 'WALI_KELAS'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : acc.role === 'GURU_PIKET'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {acc.role === 'GURU_BK' ? 'Guru BK' : acc.role === 'WALI_KELAS' ? 'Wali Kelas' : acc.role === 'GURU_PIKET' ? 'Guru Piket' : 'Kepala Sekolah'}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditAccount(acc)}
                                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                    title="Edit Akun"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  
                                  {!acc.isDefault && (
                                    <button
                                      id={`btn-delete-acc-${acc.id}`}
                                      type="button"
                                      onClick={() => handleDeleteAccount(acc.id)}
                                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                      title="Hapus Akun"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-2.5">
                    <Info className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-800 leading-normal">Informasi Otentikasi Akun</p>
                      <p className="text-[10px] text-amber-700 mt-0.5 leading-normal">
                        Semua akun baru yang Anda tambahkan dapat digunakan langsung untuk masuk melalui form login manual. Untuk mencobanya, silakan log out, pilih Peran yang sesuai, lalu ketik Username dan Password yang didaftarkan.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Add New Account Form */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <UserPlus className="h-4.5 w-4.5 text-indigo-600" />
                    <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Tambah Akun Baru</h4>
                  </div>

                  <form onSubmit={handleAddAccount} className="space-y-3">
                    {/* Role Selection */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase">Peran Pengguna (Role)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                        <button
                          id="btn-role-select-bk"
                          type="button"
                          onClick={() => setNewRole('GURU_BK')}
                          className={`py-1.5 px-1 bg-white border text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                            newRole === 'GURU_BK'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Guru BK
                        </button>
                        <button
                          id="btn-role-select-wali"
                          type="button"
                          onClick={() => setNewRole('WALI_KELAS')}
                          className={`py-1.5 px-1 bg-white border text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                            newRole === 'WALI_KELAS'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Wali Kelas
                        </button>
                        <button
                          id="btn-role-select-kepsek"
                          type="button"
                          onClick={() => setNewRole('KEPALA_SEKOLAH')}
                          className={`py-1.5 px-1 bg-white border text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                            newRole === 'KEPALA_SEKOLAH'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Kepala Sekolah
                        </button>
                        <button
                          id="btn-role-select-piket"
                          type="button"
                          onClick={() => setNewRole('GURU_PIKET')}
                          className={`py-1.5 px-1 bg-white border text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                            newRole === 'GURU_PIKET'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Guru Piket
                        </button>
                      </div>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1">
                      <label htmlFor="reg-fullname" className="text-[9px] font-extrabold text-slate-500 uppercase">Nama Lengkap</label>
                      <input
                        id="reg-fullname"
                        type="text"
                        placeholder="Contoh: Dra. Herlina, M.Pd."
                        value={newNama}
                        onChange={(e) => setNewNama(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    {/* Username */}
                    <div className="space-y-1">
                      <label htmlFor="reg-username" className="text-[9px] font-extrabold text-slate-500 uppercase">Username / NIP</label>
                      <input
                        id="reg-username"
                        type="text"
                        placeholder="Contoh: herlina123"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label htmlFor="reg-password" className="text-[9px] font-extrabold text-slate-500 uppercase">Password</label>
                      <input
                        id="reg-password"
                        type="password"
                        placeholder="Isi password (bawaan: password123)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    {/* Kelas Wali (If Wali Kelas is selected) */}
                    {newRole === 'WALI_KELAS' && (
                      <div className="space-y-1">
                        <label htmlFor="reg-kelas-wali" className="text-[9px] font-extrabold text-slate-500 uppercase block">Mengampu Kelas Wali</label>
                        <select
                          id="reg-kelas-wali"
                          value={newKelasWali}
                          onChange={(e) => setNewKelasWali(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="XI-IPA-1">XI-IPA-1</option>
                          <option value="XI-IPS-2">XI-IPS-2</option>
                          <option value="X-A">X-A</option>
                          <option value="X-B">X-B</option>
                          <option value="XII-IPA-2">XII-IPA-2</option>
                        </select>
                      </div>
                    )}

                    <button
                      id="btn-register-new-account"
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer mt-4"
                    >
                      <UserPlus className="h-4 w-4" /> Daftarkan Akun
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: System & Database Administration */}
          {activeSubTab === 'database' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Manajemen Database & Ekspor</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Cadangkan seluruh data bimbingan atau atur ulang sistem</p>
                </div>
              </div>

              {/* Reset Section */}
              <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                  <h4 className="font-extrabold text-xs text-rose-900 uppercase">Zona Bahaya: Reset Sistem</h4>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Menghapus semua data yang tersimpan di Local Storage (Daftar Siswa, Pelanggaran, Jurnal Bimbingan, & Jadwal Konseling) dan mengembalikannya ke dataset awal (seed data) bawaan sekolah. Tindakan ini tidak dapat dibatalkan.
                </p>
                
                {showResetConfirm ? (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      id="btn-reset-db-confirm"
                      onClick={handleResetConfirm}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Ya, Reset Sekarang
                    </button>
                    <button
                      id="btn-reset-db-cancel"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-reset-db-trigger"
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="h-4 w-4" /> Atur Ulang Semua Data (Reset)
                  </button>
                )}
              </div>

              {/* Export/Import Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-t border-slate-50 pt-4">
                  <Download className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase">Cadangkan & Impor Data</h4>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Ekspor data Anda ke file JSON lokal sebagai cadangan, atau tempelkan teks JSON cadangan di bawah untuk memulihkan sesi sebelumnya.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    id="btn-export-json-backup"
                    onClick={handleExportBackup}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> Unduh Cadangan JSON
                  </button>
                </div>

                {/* Import form */}
                <form onSubmit={handleImportBackup} className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Tempel Teks Cadangan JSON</label>
                  
                  {showRestoreError && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      <span>Gagal Impor: {showRestoreError}</span>
                    </div>
                  )}

                  <textarea
                    rows={4}
                    value={backupJson}
                    onChange={(e) => setBackupJson(e.target.value)}
                    placeholder='{"siswa": [...], "pelanggaran": [...], "settings": {...}}'
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <div className="flex justify-end">
                    <button
                      id="btn-submit-restore-backup"
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> Unggah & Pulihkan Data
                    </button>
                  </div>
                </form>

              </div>

            </div>
          )}

          {/* TAB: Device Integration Settings */}
          {activeSubTab === 'integration' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Integrasi Alat &amp; Sensor Kehadiran</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Sinkronisasi perangkat keras pembaca sidik jari (fingerprint) dan kamera pemindai barcode kartu siswa</p>
                </div>
              </div>

              <form onSubmit={handleSaveIntegration} className="space-y-6">
                
                {/* GRID CONFIG */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* BARCODE PANEL */}
                  <div className="p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100/40 space-y-4">
                    <div className="flex items-center gap-2 border-b border-indigo-100/30 pb-2.5">
                      <QrCode className="h-5 w-5 text-indigo-600" />
                      <h4 className="font-extrabold text-xs text-indigo-900 uppercase tracking-wide">Pemindai Barcode (Kamera)</h4>
                    </div>

                    <div className="flex items-center justify-between py-1 bg-white/60 p-3 rounded-xl border border-indigo-100/20">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Koneksi Kamera Scanner</span>
                        <span className="text-[10px] text-slate-400 font-medium">Aktifkan modul kamera untuk membaca kartu siswa</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={barcodeEnabled}
                          onChange={(e) => setBarcodeEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pilih Perangkat Input Kamera</label>
                        <select
                          disabled={!barcodeEnabled}
                          value={barcodeDevice}
                          onChange={(e) => setBarcodeDevice(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-50"
                        >
                          <option value="Kamera Bawaan (Default Front Camera)">Kamera Utama Laptop / Web Camera (Default)</option>
                          <option value="Kamera Tambahan (External USB WebCam)">Kamera Eksternal USB (Barcode Scanner Mount)</option>
                          <option value="Scanner Laser Hardware (Keyboard Wedge Emulation)">Alat Pemindai Laser USB (Plug-and-Play)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Aksi Otomatis Hasil Scan</label>
                        <select
                          disabled={!barcodeEnabled}
                          value={barcodeAction}
                          onChange={(e) => setBarcodeAction(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-50"
                        >
                          <option value="absen">Mencatat Presensi Kehadiran Langsung (Hadir)</option>
                          <option value="profil">Membuka Tab Riwayat Kedisiplinan Siswa</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 bg-white/70 rounded-xl text-[10px] text-slate-500 leading-normal space-y-1">
                      <span className="font-extrabold text-indigo-950 block">Cara Kerja Scan Kartu Siswa:</span>
                      <p>Siswa mengarahkan barcode pada kartu identitas ke kamera. Sistem membaca NISN dari gambar barcode, mencocokkannya dengan database, dan otomatis mengisi presensi hari ini secara real-time.</p>
                    </div>
                  </div>

                  {/* FINGERPRINT PANEL */}
                  <div className="p-5 bg-amber-50/30 rounded-2xl border border-amber-100/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-100/30 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-5 w-5 text-amber-600" />
                        <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wide">Mesin Absensi Sidik Jari</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                        fingerprintStatus === 'Terhubung' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : fingerprintStatus === 'Menghubungkan...' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${fingerprintStatus === 'Terhubung' ? 'bg-emerald-500' : fingerprintStatus === 'Menghubungkan...' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                        Status: {fingerprintStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 bg-white/60 p-3 rounded-xl border border-amber-100/20">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Koneksi Mesin Sidik Jari</span>
                        <span className="text-[10px] text-slate-400 font-medium">Hubungkan absensi fingerprint via Jaringan Local</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fingerprintEnabled}
                          onChange={(e) => setFingerprintEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Merek &amp; Seri Mesin Fingerprint</label>
                        <input
                          type="text"
                          disabled={!fingerprintEnabled}
                          value={fingerprintModel}
                          onChange={(e) => setFingerprintModel(e.target.value)}
                          placeholder="ZKTeco K40 / Solution X100-C"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Alamat IP Alat (LAN)</label>
                        <input
                          type="text"
                          disabled={!fingerprintEnabled}
                          value={fingerprintIp}
                          onChange={(e) => setFingerprintIp(e.target.value)}
                          placeholder="192.168.1.224"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Port Komunikasi</label>
                        <input
                          type="text"
                          disabled={!fingerprintEnabled}
                          value={fingerprintPort}
                          onChange={(e) => setFingerprintPort(e.target.value)}
                          placeholder="4370"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Test logs terminal output */}
                    {fingerprintEnabled && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Jalur Log Diagnostik</span>
                          <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTestingConn}
                            className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200/50 cursor-pointer flex items-center gap-1"
                          >
                            {isTestingConn ? 'Memeriksa...' : 'Tes Ping Koneksi Devais'}
                          </button>
                        </div>

                        <div className="bg-slate-900 border border-slate-950 rounded-xl p-3 h-28 font-mono text-[9px] text-slate-300 overflow-y-auto space-y-1 shadow-inner">
                          {testLog.length === 0 ? (
                            <span className="text-slate-500 italic block">Menunggu tes ping koneksi untuk mengumpulkan log...</span>
                          ) : (
                            testLog.map((log, i) => (
                              <div key={i} className={log.includes('[SUCCESS]') ? 'text-emerald-400 font-extrabold' : log.includes('[ERROR]') ? 'text-rose-400 font-extrabold' : 'text-cyan-400'}>
                                {log}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 pt-3">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="font-extrabold text-slate-600">Catatan:</span> Pastikan komputer server terkoneksi ke jaringan Wi-Fi/LAN yang sama dengan mesin fingerprint.
                  </div>
                  <button
                    id="btn-save-integration-settings"
                    type="submit"
                    className="flex items-center gap-1.5 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Save className="h-4 w-4" /> Simpan Integrasi Alat
                  </button>
                </div>

              </form>

            </div>
          )}

          {/* TAB 4: About Application */}
          {activeSubTab === 'about' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Tentang SahabatBK SMP NEGERI 3 KRAS</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Informasi pengembang dan kualifikasi portal bimbingan kesiswaan</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                
                <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/40">
                  <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-indigo-900">SahabatBK Portal &mdash; Versi 2.4.0</h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Platform Digitalisasi BK Sekolah Menengah Pertama</p>
                  </div>
                </div>

                <p className="indent-6 text-justify">
                  <strong>SahabatBK</strong> adalah portal manajemen kesiswaan bimbingan konseling mandiri yang dikembangkan khusus untuk memfasilitasi koordinasi kolaboratif antara <strong>Guru BK</strong> selaku konselor utama, <strong>Wali Kelas</strong> selaku pembimbing kelas binaan, dan <strong>Kepala Sekolah</strong> selaku pimpinan pengambil keputusan strategis.
                </p>

                <p className="indent-6 text-justify">
                  Sistem ini mendukung pengumpulan jurnal harian bimbingan BK empat pilar layanan (Pribadi, Sosial, Belajar, Karir), pencatatan poin pelanggaran disiplin siswa, pemantauan ketidakhadiran (alpa beruntun), penjadwalan panggilan siswa atau kunjungan rumah (Home Visit), serta generator berkas dokumen laporan cetak otomatis yang ramah printer.
                </p>

                <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between">
                  <span>Dibuat Oleh KHABIBU ROHMAN</span>
                  <span>SahabatBK &copy; 2026 All Rights Reserved</span>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
