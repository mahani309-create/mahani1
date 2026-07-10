/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Kehadiran, UserRole, Siswa } from '../types';
import {
  AlertTriangle,
  Search,
  Printer,
  Calendar,
  X,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  Edit,
  Sliders,
  Sparkles,
  Download,
  QrCode,
  Camera,
  Check
} from 'lucide-react';
import { exportKehadiranToExcel } from '../lib/dataHelper';

interface KehadiranSistemProps {
  role: UserRole;
  kelasWali?: string;
  kehadiranList: Kehadiran[];
  siswaList: Siswa[];
  onUpdateKehadiran: (kehadiran: Kehadiran) => void;
}

export default function KehadiranSistem({
  role,
  kelasWali,
  kehadiranList,
  siswaList,
  onUpdateKehadiran,
}: KehadiranSistemProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('SEMUA');

  // Real Camera Barcode/QR Code Scan states
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanInputNisn, setScanInputNisn] = useState('');
  const [scannedStudent, setScannedStudent] = useState<Siswa | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanLogs, setScanLogs] = useState<{ time: string; name: string; nisn: string; kelas: string; status: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Camera integration states
  const [cameraList, setCameraList] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Sound generator for checkout style barcode beep
  const playBeepSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1.2 kHz high checkout beep
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime); // Soft volume

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12); // Play for 120ms
    } catch (err) {
      console.warn('Gagal memutar audio beep:', err);
    }
  };

  // Helper to process scanned NISN/ID code
  const processScannedText = (decodedText: string) => {
    const trimmedNisn = decodedText.trim();
    if (!trimmedNisn) return;

    const student = siswaList.find(s => s.nisn === trimmedNisn || s.id === trimmedNisn);

    if (!student) {
      setScanMessage(`ERROR: NISN atau ID "${trimmedNisn}" Tidak Terdaftar!`);
      return;
    }

    setScannedStudent(student);

    // Fetch student's current attendance record
    const attRecord = kehadiranList.find(k => k.siswaId === student.id);
    if (attRecord) {
      const newAlpa = Math.max(0, attRecord.alpa - 1);
      const totalAbsences = newAlpa + attRecord.sakit + attRecord.izin + attRecord.diska;
      const totalDays = 60;
      const newPercentage = Math.max(0, Math.min(100, Math.round(((totalDays - totalAbsences) / totalDays) * 100)));

      const updatedRecord: Kehadiran = {
        ...attRecord,
        alpa: newAlpa,
        alpaConsecutive: 0, // Reset consecutive alpa since they have checked in!
        persentaseKehadiran: newPercentage
      };
      onUpdateKehadiran(updatedRecord);
      setScanMessage(`PRESENSI BERHASIL: ${student.nama} (Kelas ${student.kelas}) dicatat HADIR.`);
    } else {
      setScanMessage(`SUKSES: Identitas ${student.nama} valid.`);
    }

    // Add scan log
    const newLog = {
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      name: student.nama,
      nisn: student.nisn,
      kelas: student.kelas,
      status: 'HADIR (OK)'
    };
    
    setScanLogs(prev => {
      // Avoid duplicate logs if scanned in rapid succession
      const lastLog = prev[0];
      if (lastLog && lastLog.nisn === student.nisn) {
        return prev;
      }
      return [newLog, ...prev];
    });
  };

  // Real Camera Barcode/QR Code Scanner using html5-qrcode
  useEffect(() => {
    if (!showScanModal) {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(err => console.error("Gagal menghentikan scanner:", err));
        }
        scannerRef.current = null;
      }
      setIsScannerRunning(false);
      setCameraError(null);
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      // Small timeout to allow modal animation & container to render in DOM
      await new Promise(resolve => setTimeout(resolve, 350));
      if (!isMounted) return;

      const element = document.getElementById('reader');
      if (!element) return;

      try {
        const qrCodeInstance = new Html5Qrcode('reader');
        scannerRef.current = qrCodeInstance;
        setIsScannerRunning(true);

        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameraList(devices);
          const defaultCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('environment') || 
            d.label.toLowerCase().includes('rear')
          ) || devices[0];
          
          setSelectedCameraId(defaultCam.id);
          
          await qrCodeInstance.start(
            defaultCam.id,
            {
              fps: 15,
              qrbox: (width, height) => ({ width: Math.min(width, 280), height: Math.min(height, 160) }),
              aspectRatio: 1.777778
            },
            (decodedText) => {
              playBeepSound();
              processScannedText(decodedText);
            },
            () => {}
          );
        } else {
          // Fallback to environment facingMode
          await qrCodeInstance.start(
            { facingMode: 'environment' },
            {
              fps: 15,
              qrbox: { width: 250, height: 150 }
            },
            (decodedText) => {
              playBeepSound();
              processScannedText(decodedText);
            },
            () => {}
          );
        }
      } catch (err: any) {
        console.error('Error starting scanner:', err);
        if (isMounted) {
          setCameraError(err?.message || 'Kamera tidak dapat diakses atau izin kamera ditolak.');
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(err => console.error("Gagal stop scanner di cleanup:", err));
        }
        scannerRef.current = null;
      }
      setIsScannerRunning(false);
    };
  }, [showScanModal]);

  // Handle camera switching from select dropdown
  const handleCameraChange = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.start(
          cameraId,
          {
            fps: 15,
            qrbox: (width, height) => ({ width: Math.min(width, 280), height: Math.min(height, 160) }),
            aspectRatio: 1.777778
          },
          (decodedText) => {
            playBeepSound();
            processScannedText(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        console.error('Gagal beralih kamera:', err);
        setCameraError('Gagal beralih ke kamera terpilih: ' + err.message);
      }
    }
  };

  // Handle manual input scanner submission (for laser wedge fallback)
  const handleExecuteScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInputNisn.trim()) return;

    setIsScanning(true);
    setScanMessage(null);
    setScannedStudent(null);

    setTimeout(() => {
      setIsScanning(false);
      playBeepSound();
      processScannedText(scanInputNisn.trim());
      setScanInputNisn('');
    }, 150);
  };

  // Attendance update modal
  const [editingRecord, setEditingRecord] = useState<Kehadiran | null>(null);
  const [editAlpa, setEditAlpa] = useState(0);
  const [editSakit, setEditSakit] = useState(0);
  const [editIzin, setEditIzin] = useState(0);
  const [editDiska, setEditDiska] = useState(0);
  const [editConsecutive, setEditConsecutive] = useState(0);

  // Print attendance modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPeriod, setPrintPeriod] = useState<'MINGGUAN' | 'BULANAN' | 'SEMESTER'>('BULANAN');
  const [printSelectedKelas, setPrintSelectedKelas] = useState('XI-IPA-1');

  // Filter based on roles
  const activeClassFilter = useMemo(() => {
    if (role === 'WALI_KELAS' && kelasWali) {
      return kelasWali;
    }
    return selectedClass;
  }, [role, kelasWali, selectedClass]);

  // Filter attendance logs
  const filteredKehadiran = useMemo(() => {
    return kehadiranList.filter(k => {
      const matchSearch = k.namaSiswa.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = activeClassFilter === 'SEMUA' || k.kelasSiswa === activeClassFilter;
      return matchSearch && matchClass;
    });
  }, [kehadiranList, searchTerm, activeClassFilter]);

  // Classes list for dropdown
  const classList = useMemo(() => {
    const classes = new Set(kehadiranList.map(k => k.kelasSiswa));
    return Array.from(classes).sort();
  }, [kehadiranList]);

  // Handle Edit click
  const handleOpenEdit = (k: Kehadiran) => {
    setEditingRecord(k);
    setEditAlpa(k.alpa);
    setEditSakit(k.sakit);
    setEditIzin(k.izin);
    setEditDiska(k.diska);
    setEditConsecutive(k.alpaConsecutive);
  };

  // Handle Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    // Recalculate attendance percentage
    // Total school days: say 60 days
    const totalDays = 60;
    const totalAbsences = editAlpa + editSakit + editIzin + editDiska;
    const newPercentage = Math.max(0, Math.min(100, Math.round(((totalDays - totalAbsences) / totalDays) * 100)));

    const updated: Kehadiran = {
      ...editingRecord,
      alpa: editAlpa,
      sakit: editSakit,
      izin: editIzin,
      diska: editDiska,
      alpaConsecutive: editConsecutive,
      persentaseKehadiran: newPercentage
    };

    onUpdateKehadiran(updated);
    setEditingRecord(null);
  };

  // Print preview records filtered
  const printRecords = useMemo(() => {
    if (role === 'WALI_KELAS' && kelasWali) {
      return kehadiranList.filter(k => k.kelasSiswa === kelasWali);
    }
    return kehadiranList.filter(k => k.kelasSiswa === printSelectedKelas);
  }, [kehadiranList, role, kelasWali, printSelectedKelas]);

  return (
    <div id="kehadiran-sistem-tab" className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Analisis & Rekap Kehadiran Siswa</h2>
          <p className="text-xs text-slate-500 mt-0.5">Pantau persentase kehadiran, peringatan dini alpa beruntun, serta unduh rekap absensi kelas.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-scan-barcode-absensi"
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <QrCode className="h-4 w-4" /> Scan Barcode Kartu Siswa
          </button>

          <button
            id="btn-export-kehadiran"
            onClick={() => exportKehadiranToExcel(filteredKehadiran)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer shadow-xs"
            title="Ekspor rekap absensi ke format Excel"
          >
            <Download className="h-4 w-4 text-slate-500" /> Ekspor Excel
          </button>

          <button
            id="btn-open-print-absensi"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold transition-all border border-indigo-100 cursor-pointer shadow-xs"
          >
            <Printer className="h-4 w-4" /> Cetak Rekap Absensi
          </button>
        </div>
      </div>

      {/* Warning Box explanation */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">Aturan Peringatan (Red Flag):</span>
          <p className="font-medium leading-relaxed">
            Sistem otomatis menyoroti baris siswa dengan <strong>warna merah</strong> jika jumlah <strong>&ldquo;Alpa Beruntun&rdquo; mencapai &ge; 3 hari berturut-turut</strong>. Ini merupakan indikasi darurat bagi Guru BK untuk segera menjadwalkan panggilan orang tua atau melakukan <strong>Kunjungan Rumah (Home Visit)</strong>.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="search-kehadiran-siswa"
            type="text"
            placeholder="Cari siswa berdasarkan nama..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {role !== 'WALI_KELAS' && (
          <div className="w-full md:w-auto">
            <select
              id="filter-kehadiran-kelas"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
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
            Data Terbatas: Kelas {kelasWali}
          </span>
        )}
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Nama Siswa</th>
                <th scope="col" className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Alpa (A)</th>
                <th scope="col" className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Sakit (S)</th>
                <th scope="col" className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Izin (I)</th>
                <th scope="col" className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Dispensasi (D/K)</th>
                <th scope="col" className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Kehadiran (%)</th>
                <th scope="col" className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Alpa Beruntun</th>
                <th scope="col" className="px-5 py-3 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Status & Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredKehadiran.length > 0 ? (
                filteredKehadiran.map((k) => {
                  const isRedFlag = k.alpaConsecutive >= 3;
                  return (
                    <tr
                      key={k.id}
                      id={`kehadiran-row-${k.id}`}
                      className={`transition-colors ${
                        isRedFlag ? 'bg-red-50/70 hover:bg-red-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div>
                          <div className={`text-xs font-bold ${isRedFlag ? 'text-red-900' : 'text-slate-800'}`}>{k.namaSiswa}</div>
                          <div className="text-[10px] text-slate-500 font-semibold">Kelas {k.kelasSiswa}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center text-xs font-bold text-slate-800">{k.alpa}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center text-xs font-semibold text-slate-700">{k.sakit}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center text-xs font-semibold text-slate-700">{k.izin}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center text-xs font-semibold text-slate-700">{k.diska}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center text-xs">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                          k.persentaseKehadiran >= 95
                            ? 'bg-indigo-100 text-indigo-800'
                            : k.persentaseKehadiran >= 90
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {k.persentaseKehadiran}%
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                          isRedFlag ? 'bg-red-200 text-red-950 font-black animate-pulse' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {k.alpaConsecutive} Hari
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center text-xs">
                        <div className="flex items-center justify-center gap-2">
                          {isRedFlag && (
                            <span className="text-[9px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Butuh Home Visit
                            </span>
                          )}
                          {role === 'GURU_BK' && (
                            <button
                              id={`btn-edit-kehadiran-${k.id}`}
                              onClick={() => handleOpenEdit(k)}
                              className="p-1 bg-white hover:bg-slate-100 text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                              title="Ubah Rekap Absensi"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-slate-400 font-medium bg-slate-50/50">
                    Tidak ada rekap ketidakhadiran siswa yang terdeteksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- EDIT ATTENDANCE MODAL (BK Only) --- */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                <Sliders className="h-5 w-5 text-indigo-600" /> Sesuaikan Absensi Siswa
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl mb-2 text-xs">
                <span className="text-slate-400 font-semibold">Nama Siswa</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{editingRecord.namaSiswa} ({editingRecord.kelasSiswa})</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Alpa (Hari)</label>
                  <input
                    type="number"
                    min={0}
                    value={editAlpa}
                    onChange={(e) => setEditAlpa(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Sakit (Hari)</label>
                  <input
                    type="number"
                    min={0}
                    value={editSakit}
                    onChange={(e) => setEditSakit(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Izin (Hari)</label>
                  <input
                    type="number"
                    min={0}
                    value={editIzin}
                    onChange={(e) => setEditIzin(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Dispensasi/Diska</label>
                  <input
                    type="number"
                    min={0}
                    value={editDiska}
                    onChange={(e) => setEditDiska(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 text-red-700 font-bold">
                  Alpa Beruntun Saat Ini (Hari Berturut-turut)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editConsecutive}
                  onChange={(e) => setEditConsecutive(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-red-200 bg-red-50 text-red-900 rounded-lg text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Simpan Absensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ⭐ PRINT ATTENDANCE MODAL --- */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[95vh] flex flex-col">
            {/* Header controls inside modal */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-indigo-600" /> Pratinjau Rekapitulasi Presensi Presisi
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Rekap (Excel/PDF)
                </button>
                <button onClick={() => setShowPrintModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Print Selection Criteria Controls */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Pilih Rentang Periode Analisis</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPrintPeriod('MINGGUAN')}
                    className={`py-2 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                      printPeriod === 'MINGGUAN' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Mingguan
                  </button>
                  <button
                    onClick={() => setPrintPeriod('BULANAN')}
                    className={`py-2 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                      printPeriod === 'BULANAN' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Bulanan
                  </button>
                  <button
                    onClick={() => setPrintPeriod('SEMESTER')}
                    className={`py-2 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                      printPeriod === 'SEMESTER' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Semester
                  </button>
                </div>
              </div>

              {role !== 'WALI_KELAS' ? (
                <div>
                  <label htmlFor="print-attendance-class" className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Pilih Kelas</label>
                  <select
                    id="print-attendance-class"
                    value={printSelectedKelas}
                    onChange={(e) => setPrintSelectedKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {classList.map(cls => (
                      <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-end pb-1.5">
                  <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold w-full text-center">
                    Cakupan Cetak Otomatis: Kelas {kelasWali} (Sesuai Hak Akses Wali Kelas)
                  </span>
                </div>
              )}
            </div>

            {/* Document Preview Area (Excel style sheet) */}
            <div className="flex-1 overflow-y-auto p-8 print:p-0 bg-slate-100 print:bg-white flex justify-center">
              <div className="bg-white p-10 print:p-0 w-full max-w-2xl border border-slate-300 print:border-0 shadow-lg print:shadow-none min-h-[842px] flex flex-col justify-between text-slate-800">
                
                {/* School Letterhead */}
                <div>
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h2 className="font-extrabold text-base text-slate-900 uppercase">Pemerintah Kabupaten Kediri</h2>
                    <h1 className="font-black text-lg text-slate-900 uppercase">SMP NEGERI 3 KRAS</h1>
                    <p className="text-[9px] text-slate-500 font-medium italic">
                      Jl. Raya Kras, Kediri, Jawa Timur &bull; Telp: (0354) 441000
                    </p>
                    <p className="text-[10px] text-slate-700 font-bold mt-1 uppercase tracking-wider">
                      Unit Bimbingan dan Konseling &bull; Rekapitulasi Presensi Kehadiran Siswa
                    </p>
                  </div>

                  {/* Title of document */}
                  <div className="text-center mb-6">
                    <h3 className="font-bold text-xs uppercase underline tracking-wider text-slate-900">
                      REKAPITULASI PRESENSI KELAS {role === 'WALI_KELAS' ? kelasWali : printSelectedKelas} - PERIODE {printPeriod}
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-1 font-semibold">Tahun Ajaran: 2026/2027 &bull; Dicetak pada: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>

                  {/* Excel-style Attendance Grid */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-300 text-[11px]">
                      <thead className="bg-slate-50 text-slate-700 font-bold">
                        <tr className="divide-x divide-slate-300">
                          <th className="px-3 py-2 text-center w-[30px]">No</th>
                          <th className="px-3 py-2 text-left">Nama Siswa</th>
                          <th className="px-3 py-2 text-center w-[45px]">Alpa</th>
                          <th className="px-3 py-2 text-center w-[45px]">Sakit</th>
                          <th className="px-3 py-2 text-center w-[45px]">Izin</th>
                          <th className="px-3 py-2 text-center w-[45px]">Dispen</th>
                          <th className="px-3 py-2 text-center w-[80px]">Kehadiran %</th>
                          <th className="px-3 py-2 text-center">Rekomendasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {printRecords.length > 0 ? (
                          printRecords.map((item, index) => {
                            const isAlert = item.alpaConsecutive >= 3;
                            return (
                              <tr key={item.id} className={`divide-x divide-slate-200 ${isAlert ? 'bg-red-50/50 print:bg-red-50/30' : ''}`}>
                                <td className="px-3 py-2 text-center font-semibold text-slate-500">{index + 1}</td>
                                <td className="px-3 py-2 font-bold text-slate-900">{item.namaSiswa}</td>
                                <td className="px-3 py-2 text-center font-bold text-slate-800">{item.alpa}</td>
                                <td className="px-3 py-2 text-center text-slate-700">{item.sakit}</td>
                                <td className="px-3 py-2 text-center text-slate-700">{item.izin}</td>
                                <td className="px-3 py-2 text-center text-slate-700">{item.diska}</td>
                                <td className="px-3 py-2 text-center font-extrabold text-slate-900">{item.persentaseKehadiran}%</td>
                                <td className="px-3 py-2 text-slate-600 font-medium text-[10px]">
                                  {isAlert
                                    ? `Alpa beruntun ${item.alpaConsecutive} hari (Panggilan / Home Visit)`
                                    : item.persentaseKehadiran < 90
                                    ? 'Butuh Pembinaan BK'
                                    : 'Sangat Baik (Aman)'}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-slate-400 font-semibold italic">
                              Tidak ada data presensi yang ditemukan untuk kelas ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-4 italic leading-relaxed">
                    * Catatan: Persentase kehadiran dihitung berdasarkan asumsi 60 hari belajar aktif per semester. Laporan ini sah dijadikan acuan wali kelas dalam penentuan pengisian rapor siswa SMP NEGERI 3 KRAS.
                  </p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 text-xs text-center pt-8 border-t border-dashed border-slate-300">
                  <div>
                    <p className="font-semibold text-slate-500">Mengetahui,</p>
                    <p className="font-bold text-slate-800 mb-14">
                      {role === 'WALI_KELAS' ? `Wali Kelas ${kelasWali}` : `Wali Kelas ${printSelectedKelas}`}
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

      {/* --- ⭐ INTERACTIVE BARCODE/CAMERA ABSENSI SCANNER MODAL --- */}
      {showScanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl flex flex-col overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-600 animate-pulse" />
                <span>Pindai Barcode / QR Kartu Siswa (Kamera Aktif)</span>
              </h3>
              <button 
                onClick={() => {
                  setShowScanModal(false);
                  setScanMessage(null);
                  setScannedStudent(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
              {/* Left Column: Real Camera Viewport & Controls */}
              <div className="space-y-4">
                {/* Camera Source Selector (if multiple exist) */}
                {cameraList.length > 1 && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pilih Sumber Kamera</label>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
                    >
                      {cameraList.map((cam) => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label || `Kamera ${cam.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Video Viewport Container */}
                <div className="relative bg-slate-950 aspect-video rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-center">
                  {/* Target element for html5-qrcode library rendering */}
                  <div id="reader" className="w-full h-full overflow-hidden" style={{ minHeight: '190px' }}></div>
                  
                  {/* Custom frame aesthetic overlay */}
                  <div className="absolute inset-0 pointer-events-none border border-emerald-500/10 rounded-2xl" />
                  
                  {/* Scanner sight corners */}
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-emerald-500 pointer-events-none" />
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-emerald-500 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-emerald-500 pointer-events-none" />
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-emerald-500 pointer-events-none" />

                  {/* Red/Green Neon scanning bounce line if active */}
                  {isScannerRunning && !cameraError && (
                    <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] top-1/2 -translate-y-1/2 pointer-events-none animate-[bounce_2.5s_infinite_ease-in-out]" />
                  )}

                  {/* Camera Error Display overlay */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-center p-4 z-20 space-y-2">
                      <AlertTriangle className="h-8 w-8 text-rose-500 animate-bounce" />
                      <p className="text-xs font-bold text-rose-300">Akses Kamera Terhambat</p>
                      <p className="text-[10px] text-slate-400 max-w-xs">{cameraError}</p>
                      <p className="text-[10px] text-emerald-400 font-bold">Tetap gunakan form input NISN manual di bawah.</p>
                    </div>
                  )}
                </div>

                {/* Scanned Student Profile Quick Peek */}
                {scannedStudent && (
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                    <img 
                      src={scannedStudent.fotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'} 
                      alt={scannedStudent.nama}
                      className="h-11 w-11 object-cover rounded-full border border-emerald-500"
                    />
                    <div className="flex-1">
                      <h5 className="text-xs font-black text-slate-800">{scannedStudent.nama}</h5>
                      <p className="text-[10px] text-slate-500 font-bold">Kelas {scannedStudent.kelas} &bull; NISN: {scannedStudent.nisn}</p>
                    </div>
                    <span className="text-[10px] bg-emerald-600 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                      TERBACA OK
                    </span>
                  </div>
                )}

                {/* Form Input Manual (Wedge Scanner or Keyboard fallback) */}
                <form onSubmit={handleExecuteScan} className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Input NISN Manual (Wedge / Backup)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Masukkan atau tempel NISN siswa"
                      value={scanInputNisn}
                      onChange={(e) => setScanInputNisn(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Kirim
                    </button>
                  </div>
                </form>

                {scanMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    scanMessage.startsWith('ERROR') 
                      ? 'bg-rose-50 border border-rose-200 text-rose-800' 
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}>
                    <CheckCircle className={`h-4.5 w-4.5 shrink-0 ${scanMessage.startsWith('ERROR') ? 'text-rose-600' : 'text-emerald-600'}`} />
                    <span className="leading-tight">{scanMessage}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Scanned Logs during current session */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col h-[320px]">
                <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Log Pemindaian Hari Ini</span>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-black">{scanLogs.length} Terpindai</span>
                </h4>
                
                <div className="flex-1 overflow-y-auto mt-3 space-y-2 text-xs">
                  {scanLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4 space-y-1">
                      <Calendar className="h-8 w-8 text-slate-200" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Log Kosong</span>
                      <p className="text-[9px] text-slate-400">Belum ada siswa yang melakukan pemindaian barcode dalam sesi ini.</p>
                    </div>
                  ) : (
                    scanLogs.map((log, index) => (
                      <div key={index} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200/40 transition-all">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block">{log.name}</span>
                          <span className="text-[9px] text-slate-400 block font-bold">Kelas {log.kelas} &bull; NISN: {log.nisn}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-emerald-600 block">{log.status}</span>
                          <span className="text-[9px] text-slate-400 font-mono block font-medium">{log.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowScanModal(false);
                  setScanMessage(null);
                  setScannedStudent(null);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tutup Scanner
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
