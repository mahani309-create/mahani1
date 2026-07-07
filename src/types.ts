/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'GURU_BK' | 'WALI_KELAS' | 'KEPALA_SEKOLAH';

export interface UserAccount {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  password?: string;
  kelasWali?: string; // Optional, only for WALI_KELAS
  isDefault?: boolean;
}

export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'acc-1',
    username: 'sri',
    nama: 'Sri Rahayu, S.Pd',
    role: 'GURU_BK',
    password: '123456',
    isDefault: true
  },
  {
    id: 'acc-2',
    username: 'ahmad123',
    nama: 'Pak Ahmad Subarjo, S.Pd.',
    role: 'WALI_KELAS',
    password: 'password123',
    kelasWali: 'XI-IPA-1',
    isDefault: true
  },
  {
    id: 'acc-3',
    username: 'kepsek',
    nama: 'Dr. H. Mulyono, M.Si.',
    role: 'KEPALA_SEKOLAH',
    password: '123456',
    isDefault: true
  }
];

export interface Siswa {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  status: 'Aktif' | 'Alumni' | 'Pindah';
  fotoUrl?: string;
  ttl: string;
  alamat: string;
  noHp: string;
  namaOrtu: string;
  pekerjaanOrtu: string;
  kontakDarurat: string;
  riwayatMedis: string;
  totalPoin: number;
}

export interface Pelanggaran {
  id: string;
  siswaId: string;
  namaSiswa: string;
  kelasSiswa: string;
  tanggal: string;
  jenis: string;
  poin: number;
  catatan: string;
}

export interface Kehadiran {
  id: string;
  siswaId: string;
  namaSiswa: string;
  kelasSiswa: string;
  alpa: number;
  izin: number;
  sakit: number;
  diska: number; // Bolos/Dispen/dll
  persentaseKehadiran: number;
  alpaConsecutive: number; // Untuk peringatan warna merah jika alpa beruntun >= 3 hari
}

export interface BimbinganLog {
  id: string;
  siswaId: string;
  namaSiswa: string;
  kelasSiswa: string;
  tanggal: string;
  jenisLayanan: 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir';
  topik: string;
  solusi: string;
  tindakLanjut: string;
}

export interface JadwalKonseling {
  id: string;
  siswaId: string;
  namaSiswa: string;
  tanggal: string;
  waktu: string;
  jenis: 'Konseling' | 'Home Visit';
  keterangan: string;
  status: 'Terjadwal' | 'Selesai' | 'Batal';
}

export interface PelanggaranType {
  jenis: string;
  poin: number;
}

export const JENIS_PELANGGARAN_PRESET: PelanggaranType[] = [
  { jenis: 'Terlambat Masuk Sekolah', poin: 5 },
  { jenis: 'Atribut Seragam Tidak Lengkap', poin: 5 },
  { jenis: 'Membawa / Bermain HP di Kelas Saat KBM', poin: 10 },
  { jenis: 'Keluar Kelas Tanpa Izin (Bolos Jam Pelajaran)', poin: 15 },
  { jenis: 'Tidak Masuk Tanpa Keterangan (Alpa)', poin: 10 },
  { jenis: 'Rambut Gondrong / Tidak Rapi (Putra)', poin: 10 },
  { jenis: 'Riasan / Kosmetik Berlebihan / Tindik', poin: 10 },
  { jenis: 'Merokok di Lingkungan Sekolah', poin: 50 },
  { jenis: 'Merusak Fasilitas Sekolah', poin: 30 },
  { jenis: 'Bertengkar / Perkelahian', poin: 75 },
  { jenis: 'Tindakan Bullying (Perundungan)', poin: 100 },
  { jenis: 'Narkoba / Minuman Keras', poin: 250 },
];
