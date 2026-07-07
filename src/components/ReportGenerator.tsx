/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Siswa, Pelanggaran, Kehadiran, BimbinganLog, UserRole } from '../types';
import {
  FileText,
  Printer,
  Calendar,
  CheckCircle,
  Download,
  Award,
  BookOpen,
  ArrowRight,
  TrendingDown,
  Users,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ReportGeneratorProps {
  role: UserRole;
  siswaList: Siswa[];
  pelanggaranList: Pelanggaran[];
  kehadiranList: Kehadiran[];
  bimbinganList: BimbinganLog[];
}

export default function ReportGenerator({
  role,
  siswaList,
  pelanggaranList,
  kehadiranList,
  bimbinganList,
}: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<'KEDISIPLINAN' | 'PRESENSI' | 'BIMBINGAN'>('KEDISIPLINAN');
  const [selectedMonth, setSelectedMonth] = useState('07'); // Juli
  const [selectedYear, setSelectedYear] = useState('2026');
  
  // Generating state simulation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);

  // Month labels
  const monthLabel = useMemo(() => {
    const labels: { [key: string]: string } = {
      '05': 'Mei',
      '06': 'Juni',
      '07': 'Juli',
      '08': 'Agustus',
    };
    return labels[selectedMonth] || 'Juli';
  }, [selectedMonth]);

  // Aggregate metrics for summary blocks
  const metrics = useMemo(() => {
    const totalSiswa = siswaList.length;
    const activeViolationsCount = pelanggaranList.length;
    const totalPointsOverall = siswaList.reduce((acc, curr) => acc + curr.totalPoin, 0);
    
    // Average attendance
    const avgAttendance = Math.round(
      kehadiranList.reduce((acc, curr) => acc + curr.persentaseKehadiran, 0) / (kehadiranList.length || 1)
    );

    // Number of high risk students
    const highRiskCount = siswaList.filter(s => s.totalPoin >= 50).length;

    return {
      totalSiswa,
      activeViolationsCount,
      totalPointsOverall,
      avgAttendance,
      highRiskCount
    };
  }, [siswaList, pelanggaranList, kehadiranList]);

  // Handle click to Generate
  const handleGenerate = () => {
    setIsGenerating(true);
    setGeneratedReport(null);

    setTimeout(() => {
      setIsGenerating(false);
      
      // Seed data based on selection
      let items: any[] = [];
      let summaryText = '';

      if (reportType === 'KEDISIPLINAN') {
        // filter violations by selected month e.g. "2026-07-..."
        const prefix = `${selectedYear}-${selectedMonth}`;
        items = pelanggaranList.filter(p => p.tanggal.startsWith(prefix));
        summaryText = `Menampilkan total ${items.length} kasus indispliner terkumpul sepanjang bulan ${monthLabel} ${selectedYear}.`;
      } else if (reportType === 'PRESENSI') {
        // For attendance, we list the students whose presence is low or general list
        items = kehadiranList.map(k => ({
          nama: k.namaSiswa,
          kelas: k.kelasSiswa,
          alpa: k.alpa,
          sakit: k.sakit,
          izin: k.izin,
          percentage: k.persentaseKehadiran,
          status: k.alpaConsecutive >= 3 ? 'Butuh Mediasi' : k.persentaseKehadiran < 90 ? 'Kurang Baik' : 'Aman'
        }));
        summaryText = `Menampilkan rekap presensi kelas terpadu untuk bulan ${monthLabel} ${selectedYear}.`;
      } else {
        const prefix = `${selectedYear}-${selectedMonth}`;
        items = bimbinganList.filter(b => b.tanggal.startsWith(prefix));
        summaryText = `Menampilkan total ${items.length} sesi layanan konseling terdaftar (pribadi, belajar, karir, sosial) sepanjang bulan ${monthLabel} ${selectedYear}.`;
      }

      setGeneratedReport({
        type: reportType,
        month: monthLabel,
        year: selectedYear,
        items,
        summaryText,
        generatedAt: new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })
      });
    }, 800);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="report-generator-tab" className="space-y-6 font-sans">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Penyusunan Laporan Otomatis (Report Generator)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Konfigurasi sekali klik untuk menerbitkan dokumen legal kesiswaan bulanan untuk diserahkan kepada Kepala Sekolah SMAN 1.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Settings Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm text-slate-800">Pilih Parameter Laporan</h3>
            </div>

            {/* Report Type selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Pilih Jenis Dokumen</label>
              
              <button
                onClick={() => setReportType('KEDISIPLINAN')}
                className={`w-full text-left p-3 border rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  reportType === 'KEDISIPLINAN'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                    : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${reportType === 'KEDISIPLINAN' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Laporan Poin Kedisiplinan</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Statistik & rincian pelanggaran bulanan siswa</p>
                </div>
              </button>

              <button
                onClick={() => setReportType('PRESENSI')}
                className={`w-full text-left p-3 border rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  reportType === 'PRESENSI'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                    : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${reportType === 'PRESENSI' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Rekap Presensi Kehadiran</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Analisis alpa, sakit, izin, & peringatan beruntun</p>
                </div>
              </button>

              <button
                onClick={() => setReportType('BIMBINGAN')}
                className={`w-full text-left p-3 border rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  reportType === 'BIMBINGAN'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                    : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${reportType === 'BIMBINGAN' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Jurnal Pembinaan Konseling</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Rekap solusi penanganan bimbingan siswa</p>
                </div>
              </button>
            </div>

            {/* Month & Year parameters */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label htmlFor="report-month-select" className="block text-xs font-semibold text-slate-700 mb-1">Bulan</label>
                <select
                  id="report-month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="05">Mei</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">Agustus</option>
                </select>
              </div>
              <div>
                <label htmlFor="report-year-select" className="block text-xs font-semibold text-slate-700 mb-1">Tahun</label>
                <select
                  id="report-year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>

            {/* Action button */}
            <button
              id="btn-generate-report-doc"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span>Menghimpun Berkas Data...</span>
              ) : (
                <>
                  <span>Susun Laporan Resmi</span> <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Quick Info metrics banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Statistik Sekolah Saat Ini</h4>
            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600">
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Total Siswa</span>
                <span className="text-lg font-extrabold text-slate-800">{metrics.totalSiswa} Siswa</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Rata Presensi</span>
                <span className="text-lg font-extrabold text-indigo-700">{metrics.avgAttendance}%</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Kasus Pelanggaran</span>
                <span className="text-lg font-extrabold text-amber-700">{metrics.activeViolationsCount} Kasus</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block">Siswa Berisiko</span>
                <span className="text-lg font-extrabold text-rose-700">{metrics.highRiskCount} Siswa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Printable Report Document Preview */}
        <div className="lg:col-span-2">
          {generatedReport ? (
            <div className="space-y-4">
              
              {/* Report Controls */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between text-xs font-semibold print:hidden">
                <span className="text-indigo-700 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" /> Laporan Berhasil Disusun!
                </span>
                
                <button
                  id="btn-print-doc-now"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Cetak Sekarang (PDF)
                </button>
              </div>

              {/* Real Formal School Document Template */}
              <div className="bg-white p-10 border border-slate-300 shadow-lg rounded-xl min-h-[800px] flex flex-col justify-between text-slate-800">
                
                {/* Official SMAN 1 Kop Surat */}
                <div>
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h2 className="font-extrabold text-base text-slate-900 uppercase">Pemerintah Provinsi Daerah Khusus Ibukota Jakarta</h2>
                    <h1 className="font-black text-lg text-slate-900 uppercase">SMAN 1 JAKARTA PUSAT</h1>
                    <p className="text-[9px] text-slate-500 font-medium italic">
                      Jl. Budi Utomo No.7, Pasar Baru, Sawah Besar, Kota Jakarta Pusat, DKI Jakarta 10710 &bull; Telp: (021) 386500
                    </p>
                    <p className="text-[10px] text-slate-700 font-bold mt-1.5 uppercase tracking-wider">
                      Unit Pelaksana Teknis Bimbingan dan Konseling (BK)
                    </p>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-6">
                    <h3 className="font-bold text-xs uppercase underline tracking-wider text-slate-900">
                      {generatedReport.type === 'KEDISIPLINAN' && `LAPORAN POIN KEDISIPLINAN & PELANGGARAN SISWA`}
                      {generatedReport.type === 'PRESENSI' && `LAPORAN REKAPITULASI PRESENSI KEHADIRAN SISWA`}
                      {generatedReport.type === 'BIMBINGAN' && `LAPORAN JURNAL LAYANAN BIMBINGAN KONSELING (BK)`}
                    </h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">PERIODE BULAN: {generatedReport.month} {generatedReport.year}</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">KODE REKAP: SMAN1/BK-REP/{generatedReport.type}/{generatedReport.year}-{selectedMonth}</p>
                  </div>

                  {/* Summary commentary paragraph */}
                  <div className="text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 p-3.5 rounded-lg mb-6">
                    <p className="font-medium text-slate-800">
                      Yth. Kepala Sekolah SMAN 1 Jakarta Pusat,
                    </p>
                    <p className="mt-1">
                      Bersama ini kami sampaikan data rekapitulasi kesiswaan terintegrasi dari database SahabatBK. {generatedReport.summaryText} Data ini dihimpun secara berkala dan dianalisis secara berkesinambungan sebagai bahan pertimbangan keputusan pembinaan siswa SMAN 1.
                    </p>
                  </div>

                  {/* Table of items inside report */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-300 text-xs">
                      
                      {/* 1. DISCIPLINE / KEDISIPLINAN HEADERS */}
                      {generatedReport.type === 'KEDISIPLINAN' && (
                        <>
                          <thead className="bg-slate-50 font-bold text-slate-700">
                            <tr>
                              <th className="px-3 py-2 text-left">Nama Siswa</th>
                              <th className="px-3 py-2 text-center w-[45px]">Kelas</th>
                              <th className="px-3 py-2 text-left">Pelanggaran</th>
                              <th className="px-3 py-2 text-center w-[50px]">Poin</th>
                              <th className="px-3 py-2 text-left">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {generatedReport.items.length > 0 ? (
                              generatedReport.items.map((item: any) => (
                                <tr key={item.id}>
                                  <td className="px-3 py-2 font-bold text-slate-800">{item.namaSiswa}</td>
                                  <td className="px-3 py-2 text-center font-semibold text-slate-600">{item.kelasSiswa}</td>
                                  <td className="px-3 py-2 text-slate-800 font-medium">{item.jenis}</td>
                                  <td className="px-3 py-2 text-center font-bold text-rose-700">+{item.poin}</td>
                                  <td className="px-3 py-2 text-slate-500 italic text-[11px]">&ldquo;{item.catatan}&rdquo;</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-slate-400 font-semibold italic">
                                  Tidak ada catatan kasus pelanggaran yang terekam pada bulan {generatedReport.month}.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </>
                      )}

                      {/* 2. PRESENCE / PRESENSI HEADERS */}
                      {generatedReport.type === 'PRESENSI' && (
                        <>
                          <thead className="bg-slate-50 font-bold text-slate-700">
                            <tr>
                              <th className="px-3 py-2 text-left">Nama Siswa</th>
                              <th className="px-3 py-2 text-center w-[55px]">Kelas</th>
                              <th className="px-3 py-2 text-center w-[40px]">Alpa</th>
                              <th className="px-3 py-2 text-center w-[40px]">Sakit</th>
                              <th className="px-3 py-2 text-center w-[40px]">Izin</th>
                              <th className="px-3 py-2 text-center w-[75px]">Kehadiran %</th>
                              <th className="px-3 py-2 text-left">Rekomendasi / Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {generatedReport.items.map((item: any, i: number) => (
                              <tr key={i} className={item.status === 'Butuh Mediasi' ? 'bg-red-50/50' : ''}>
                                <td className="px-3 py-2 font-bold text-slate-800">{item.nama}</td>
                                <td className="px-3 py-2 text-center font-semibold text-slate-600">{item.kelas}</td>
                                <td className="px-3 py-2 text-center font-bold text-slate-800">{item.alpa}</td>
                                <td className="px-3 py-2 text-center text-slate-700">{item.sakit}</td>
                                <td className="px-3 py-2 text-center text-slate-700">{item.izin}</td>
                                <td className="px-3 py-2 text-center font-extrabold text-slate-900">{item.percentage}%</td>
                                <td className="px-3 py-2 text-[10px] font-bold text-slate-700">
                                  {item.status === 'Butuh Mediasi' && (
                                    <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded uppercase tracking-wider text-[8px]">
                                      Darurat: Kunjungan Rumah
                                    </span>
                                  )}
                                  {item.status === 'Kurang Baik' && (
                                    <span className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[8px]">
                                      Konseling BK
                                    </span>
                                  )}
                                  {item.status === 'Aman' && 'Aman'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      )}

                      {/* 3. COUNSELING / BIMBINGAN HEADERS */}
                      {generatedReport.type === 'BIMBINGAN' && (
                        <>
                          <thead className="bg-slate-50 font-bold text-slate-700">
                            <tr>
                              <th className="px-3 py-2 text-left w-[85px]">Tanggal</th>
                              <th className="px-3 py-2 text-left">Nama Siswa (Kelas)</th>
                              <th className="px-3 py-2 text-left w-[85px]">Kategori</th>
                              <th className="px-3 py-2 text-left">Pembahasan Masalah & Solusi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {generatedReport.items.length > 0 ? (
                              generatedReport.items.map((item: any) => (
                                <tr key={item.id}>
                                  <td className="px-3 py-2 text-slate-600 font-semibold">{item.tanggal}</td>
                                  <td className="px-3 py-2 font-bold text-slate-800">
                                    {item.namaSiswa} <span className="text-indigo-700 font-semibold text-[10px]">({item.kelasSiswa})</span>
                                  </td>
                                  <td className="px-3 py-2 font-bold text-[10px] uppercase text-indigo-800">{item.jenisLayanan}</td>
                                  <td className="px-3 py-2 space-y-1 text-[11px] leading-relaxed">
                                    <div><span className="text-slate-400 font-bold">Topik:</span> <span className="font-semibold text-slate-800">{item.topik}</span></div>
                                    <div><span className="text-slate-400 font-bold">Solusi:</span> <span className="text-slate-600 italic">&ldquo;{item.solusi}&rdquo;</span></div>
                                    <div className="text-rose-700 font-bold">TL: {item.tindakLanjut}</div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="text-center py-6 text-slate-400 font-semibold italic">
                                  Tidak ada sesi jurnal layanan konseling terekam pada bulan {generatedReport.month}.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </>
                      )}

                    </table>
                  </div>

                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 text-xs text-center pt-8 border-t border-dashed border-slate-300 mt-8">
                  <div>
                    <p className="font-semibold text-slate-500">Menyetujui,</p>
                    <p className="font-bold text-slate-800 mb-14">Kepala Sekolah SMAN 1</p>
                    <p className="font-extrabold text-slate-900 underline">Dr. H. Mulyono, M.Si.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">NIP. 19681123 199403 1 002</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500">Jakarta, {new Date().getDate()} {generatedReport.month} {generatedReport.year}</p>
                    <p className="font-bold text-slate-800 mb-14">Kepala Layanan BK</p>
                    <p className="font-extrabold text-slate-900 underline">Dra. Endang Sulastri, M.Pd.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">NIP. 19780412 199903 2 001</p>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-[500px]">
              <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Pratinjau Dokumen Laporan Resmi</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Pilih parameter laporan yang dibutuhkan pada panel samping, kemudian klik tombol <strong>&ldquo;Susun Laporan Resmi&rdquo;</strong> untuk merender lembar pratinjau siap cetak.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
