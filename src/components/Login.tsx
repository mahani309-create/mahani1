/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserRole, UserAccount, DEFAULT_ACCOUNTS } from '../types';
import { KeyRound, Shield, User, GraduationCap, Info } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole, username: string, kelasWali?: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [role, setRole] = useState<UserRole>('GURU_BK');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [kelasWali, setKelasWali] = useState('XI-IPA-1');
  const [error, setError] = useState('');

  // Retrieve registered accounts from localStorage or initialize with defaults
  const getAccounts = (): UserAccount[] => {
    const stored = localStorage.getItem('sahabatbk_accounts');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // Fallback
      }
    }
    localStorage.setItem('sahabatbk_accounts', JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  };

  const accounts = getAccounts();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username/NIP dan Password wajib diisi.');
      return;
    }

    const accountsList = getAccounts();
    const matched = accountsList.find(
      acc => acc.username.toLowerCase() === username.trim().toLowerCase() && acc.role === role
    );

    if (matched) {
      if (matched.password && matched.password !== password) {
        setError('Password yang Anda masukkan salah.');
        return;
      }
      onLogin(matched.role, matched.nama, matched.kelasWali);
    } else {
      setError('Username tidak terdaftar untuk peran ini. Silakan gunakan Akun Demo di bawah atau tambahkan akun baru di Pengaturan.');
    }
  };

  const handleQuickLogin = (selectedRole: UserRole) => {
    const accountsList = getAccounts();
    // Prioritize default or first available account of this role
    const matched = accountsList.find(acc => acc.role === selectedRole);
    if (matched) {
      onLogin(selectedRole, matched.nama, matched.kelasWali);
    } else {
      // Emergency fallback
      let name = '';
      let waliClass = undefined;
      switch (selectedRole) {
        case 'GURU_BK':
          name = 'Dra. Endang Sulastri, M.Pd.';
          break;
        case 'WALI_KELAS':
          name = 'Pak Ahmad Subarjo, S.Pd.';
          waliClass = 'XI-IPA-1';
          break;
        case 'KEPALA_SEKOLAH':
          name = 'Dr. H. Mulyono, M.Si.';
          break;
      }
      onLogin(selectedRole, name, waliClass);
    }
  };

  return (
    <div id="login-page" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo/Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-100">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-900">
          SahabatBK
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          SMAN 1 - Portal Bimbingan & Konseling Siswa
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-xs text-red-700 font-medium rounded-r-md">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Peran Pengguna (Role)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  id="role-btn-bk"
                  type="button"
                  onClick={() => setRole('GURU_BK')}
                  className={`py-2 px-3 border text-xs font-semibold rounded-lg text-center transition-all cursor-pointer ${
                    role === 'GURU_BK'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Guru BK
                </button>
                <button
                  id="role-btn-wali"
                  type="button"
                  onClick={() => setRole('WALI_KELAS')}
                  className={`py-2 px-3 border text-xs font-semibold rounded-lg text-center transition-all cursor-pointer ${
                    role === 'WALI_KELAS'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Wali Kelas
                </button>
                <button
                  id="role-btn-kepsek"
                  type="button"
                  onClick={() => setRole('KEPALA_SEKOLAH')}
                  className={`py-2 px-3 border text-xs font-semibold rounded-lg text-center transition-all cursor-pointer ${
                    role === 'KEPALA_SEKOLAH'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Kepsek
                </button>
              </div>
            </div>

            {role === 'WALI_KELAS' && (
              <div className="transition-all">
                <label htmlFor="kelas-wali" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Wali Kelas Untuk Kelas
                </label>
                <select
                  id="kelas-wali"
                  value={kelasWali}
                  onChange={(e) => setKelasWali(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="XI-IPA-1">XI-IPA-1</option>
                  <option value="XI-IPS-2">XI-IPS-2</option>
                  <option value="X-A">X-A</option>
                  <option value="X-B">X-B</option>
                  <option value="XII-IPA-2">XII-IPA-2</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
                Username / NIP
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder={role === 'GURU_BK' ? '19820412...' : 'Username'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900 cursor-pointer">
                  Ingat saya
                </label>
              </div>

              <div className="text-sm">
                <a href="#" onClick={(e) => { e.preventDefault(); alert("Silakan hubungi administrator sekolah (IT Support) untuk mereset kata sandi Anda."); }} className="font-semibold text-indigo-600 hover:text-indigo-500">
                  Lupa password?
                </a>
              </div>
            </div>

            <div>
              <button
                id="submit-login"
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-pointer"
              >
                Masuk ke Aplikasi
              </button>
            </div>
          </form>

          {/* Quick Demo Bypass */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="relative flex justify-center text-sm mb-4">
              <span className="px-2 bg-white text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Akun Demo Pengujian Cepat
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                id="demo-login-bk"
                type="button"
                onClick={() => handleQuickLogin('GURU_BK')}
                className="w-full text-left px-3 py-2.5 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-slate-800 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-indigo-800">Masuk sebagai Guru BK</div>
                  <div className="text-slate-500 text-[10px]">Akses Penuh: Bimbingan, Poin, & Admin</div>
                </div>
                <span className="text-indigo-600 font-bold">Demo &rarr;</span>
              </button>

              <button
                id="demo-login-wali"
                type="button"
                onClick={() => handleQuickLogin('WALI_KELAS')}
                className="w-full text-left px-3 py-2.5 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-slate-700">Masuk sebagai Wali Kelas (XI-IPA-1)</div>
                  <div className="text-slate-500 text-[10px]">Akses Terbatas: Hanya Siswa Binaan Kelas XI-IPA-1</div>
                </div>
                <span className="text-slate-600 font-bold">Demo &rarr;</span>
              </button>

              <button
                id="demo-login-kepsek"
                type="button"
                onClick={() => handleQuickLogin('KEPALA_SEKOLAH')}
                className="w-full text-left px-3 py-2.5 border border-amber-100 bg-amber-50/50 hover:bg-amber-50 text-slate-800 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-amber-800">Masuk sebagai Kepala Sekolah</div>
                  <div className="text-slate-500 text-[10px]">Akses Lihat: Dashboard, Statistik, & Cetak Laporan</div>
                </div>
                <span className="text-amber-600 font-bold">Demo &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
