/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Siswa, Pelanggaran, Kehadiran, BimbinganLog } from '../types';

/* ==========================================================================
   SISWA (STUDENTS) PORTABILITY VIA XLSX
   ========================================================================== */

/**
 * Exports data of students into a real Excel (.xlsx) workbook.
 */
export function exportSiswaToExcel(siswaList: Siswa[]) {
  const data = siswaList.map(s => ({
    'Nama Lengkap': s.nama,
    'NISN': s.nisn,
    'Kelas': s.kelas,
    'Status Keaktifan': s.status,
    'Tempat Tanggal Lahir': s.ttl,
    'Alamat Lengkap': s.alamat,
    'No HP': s.noHp,
    'Nama Orang Tua / Wali': s.namaOrtu,
    'Pekerjaan Orang Tua': s.pekerjaanOrtu,
    'Kontak Darurat Ortu': s.kontakDarurat,
    'Riwayat Medis': s.riwayatMedis,
    'Total Poin Pelanggaran': s.totalPoin
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
  XLSX.writeFile(workbook, `SahabatBK_Data_Siswa_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/**
 * Downloads a pre-formatted Excel template for importing students.
 */
export function downloadSiswaExcelTemplate() {
  const templateData = [
    {
      'Nama Lengkap': 'Ahmad Fauzi',
      'NISN': '0082345678',
      'Kelas': 'XI-IPA-1',
      'Status Keaktifan': 'Aktif',
      'Tempat Tanggal Lahir': 'Jakarta, 12 Juni 2010',
      'Alamat Lengkap': 'Jl. Mangga Besar No. 12, Jakarta Pusat',
      'No HP': '081234567890',
      'Nama Orang Tua / Wali': 'Haji Sulaiman',
      'Pekerjaan Orang Tua': 'Wiraswasta',
      'Kontak Darurat Ortu': '081298765432',
      'Riwayat Medis': 'Alergi kacang tanah, asma ringan.'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');
  XLSX.writeFile(workbook, 'template_siswa_sahabatbk.xlsx');
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) file or CSV to list of students.
 */
export function importSiswaFromExcel(file: File): Promise<Omit<Siswa, 'id' | 'totalPoin'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Gagal membaca file atau file kosong.'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          reject(new Error('File Excel kosong atau tidak memiliki data pada lembar kerja pertama.'));
          return;
        }

        // Validate key headers
        const firstRowKeys = Object.keys(jsonData[0]).map(k => k.trim().toLowerCase());
        const hasKeyFields = firstRowKeys.some(k => k === 'nama lengkap' || k === 'nama' || k === 'nisn');
        if (!hasKeyFields) {
          reject(new Error('Format file Excel tidak sesuai. Harap pastikan nama kolom di baris pertama sesuai dengan template. Kolom wajib: "Nama Lengkap" atau "Nama", "NISN", dan "Kelas".'));
          return;
        }

        const students: Omit<Siswa, 'id' | 'totalPoin'>[] = [];

        jsonData.forEach(row => {
          const keys = Object.keys(row);
          const getVal = (possibleNames: string[]) => {
            const key = keys.find(k => possibleNames.includes(k.trim().toLowerCase()));
            return key ? String(row[key]).trim() : '';
          };

          const nama = getVal(['nama lengkap', 'nama']);
          if (!nama) return; // Skip empty names

          const nisn = getVal(['nisn']) || Math.floor(1000000000 + Math.random() * 9000000000).toString();
          const kelas = getVal(['kelas']) || 'XI-IPA-1';
          
          const rawStatus = getVal(['status keaktifan', 'status']) || 'Aktif';
          let status: 'Aktif' | 'Alumni' | 'Pindah' = 'Aktif';
          if (rawStatus.toLowerCase() === 'alumni') status = 'Alumni';
          if (rawStatus.toLowerCase() === 'pindah') status = 'Pindah';

          const ttl = getVal(['tempat tanggal lahir', 'ttl']) || 'Jakarta, 1 Januari 2010';
          const alamat = getVal(['alamat lengkap', 'alamat']) || 'Jl. Budi Utomo No.7, Jakarta Pusat';
          const noHp = getVal(['no hp', 'nohp']) || '081234567890';
          const namaOrtu = getVal(['nama orang tua / wali', 'namaortu']) || 'Nama Orang Tua';
          const pekerjaanOrtu = getVal(['pekerjaan orang tua', 'pekerjaanortu']) || 'Wiraswasta';
          const kontakDarurat = getVal(['kontak darurat ortu', 'kontakdarurat']) || '081234567890';
          const riwayatMedis = getVal(['riwayat medis', 'riwayatmedis']) || 'Tidak ada catatan medis khusus.';

          students.push({
            nama,
            nisn,
            kelas,
            status,
            ttl,
            alamat,
            noHp,
            namaOrtu,
            pekerjaanOrtu,
            kontakDarurat,
            riwayatMedis
          });
        });

        resolve(students);
      } catch (err: any) {
        reject(new Error(err?.message || 'Gagal mengurai file Excel. Pastikan file tidak terenkripsi atau rusak.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
    reader.readAsBinaryString(file);
  });
}

/* ==========================================================================
   PELANGGARAN (VIOLATIONS) PORTABILITY VIA XLSX
   ========================================================================== */

export function exportPelanggaranToExcel(pelanggaranList: Pelanggaran[]) {
  const data = pelanggaranList.map(p => ({
    'Nama Siswa': p.namaSiswa,
    'Kelas': p.kelasSiswa,
    'Tanggal Pelanggaran': p.tanggal,
    'Jenis Pelanggaran': p.jenis,
    'Poin Pelanggaran': p.poin,
    'Catatan Kronologi': p.catatan
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Pelanggaran');
  XLSX.writeFile(workbook, `SahabatBK_Rekap_Pelanggaran_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* ==========================================================================
   KEHADIRAN (ATTENDANCE) PORTABILITY VIA XLSX
   ========================================================================== */

export function exportKehadiranToExcel(kehadiranList: Kehadiran[]) {
  const data = kehadiranList.map(k => ({
    'Nama Siswa': k.namaSiswa,
    'Kelas': k.kelasSiswa,
    'Jumlah Alpa (Hari)': k.alpa,
    'Jumlah Sakit (Hari)': k.sakit,
    'Jumlah Izin (Hari)': k.izin,
    'Jumlah Dispen': k.diska,
    'Persentase Kehadiran %': k.persentaseKehadiran,
    'Alpa Beruntun': k.alpaConsecutive
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Kehadiran');
  XLSX.writeFile(workbook, `SahabatBK_Rekap_Kehadiran_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* ==========================================================================
   BIMBINGAN LOG (COUNSELING JOURNAL) PORTABILITY VIA XLSX
   ========================================================================== */

export function exportBimbinganToExcel(bimbinganList: BimbinganLog[]) {
  const data = bimbinganList.map(b => ({
    'Nama Siswa': b.namaSiswa,
    'Kelas': b.kelasSiswa,
    'Tanggal Konseling': b.tanggal,
    'Jenis Layanan': b.jenisLayanan,
    'Topik Permasalahan': b.topik,
    'Solusi Mediasi': b.solusi,
    'Tindak Lanjut': b.tindakLanjut
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jurnal Bimbingan');
  XLSX.writeFile(workbook, `SahabatBK_Jurnal_Bimbingan_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/**
 * Resolves a student's photo URL with appropriate fallbacks.
 * First priority: Student's custom photo URL (if not matching default Unsplash male avatar).
 * Second priority: System default profile photo uploaded in settings.
 * Third priority: Hardcoded default Unsplash avatar.
 */
export function getStudentPhoto(fotoUrl?: string): string {
  const defaultSettingPhoto = localStorage.getItem('sahabatbk_setting_default_foto_siswa');
  const fallbackUnsplash = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';
  
  if (fotoUrl && fotoUrl.trim() !== '' && !fotoUrl.includes('unsplash.com/photo-1535713875002-d1d0cf377fde')) {
    return fotoUrl;
  }
  
  if (defaultSettingPhoto && defaultSettingPhoto.trim() !== '') {
    return defaultSettingPhoto;
  }
  
  return fallbackUnsplash;
}

