/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Siswa, Kehadiran, AbsenSiswaLog, UserRole } from '../types';
import { getStudentPhoto } from '../lib/dataHelper';
import {
  QrCode,
  Camera,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Printer,
  Search,
  Check,
  ChevronRight,
  User,
  Clock,
  Trash2,
  RefreshCw,
  Sparkles,
  Award
} from 'lucide-react';

interface AbsenScannerMenuProps {
  role: UserRole;
  kelasWali?: string;
  siswaList: Siswa[];
  kehadiranList: Kehadiran[];
  onUpdateKehadiran: (updated: Kehadiran) => void;
}

const isScanLate = (jamScanStr: string, jamBatasStr: string) => {
  try {
    const normScan = jamScanStr.replace(/\./g, ':');
    const normBatas = jamBatasStr.replace(/\./g, ':');
    const [scanHour, scanMinute] = normScan.split(':').map(Number);
    const [limitHour, limitMinute] = normBatas.split(':').map(Number);
    if (scanHour > limitHour) return true;
    if (scanHour === limitHour && scanMinute > limitMinute) return true;
    return false;
  } catch (e) {
    return false;
  }
};

export default function AbsenScannerMenu({
  role,
  kelasWali,
  siswaList,
  kehadiranList,
  onUpdateKehadiran
}: AbsenScannerMenuProps) {
  // Get today's local date in YYYY-MM-DD format
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'sudah' | 'belum'>('sudah');
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  
  // Real time clock
  const [liveTime, setLiveTime] = useState<string>(new Date().toLocaleTimeString('id-ID'));
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Persistent AbsenSiswaLog stored in localstorage
  const [absenLogs, setAbsenLogs] = useState<AbsenSiswaLog[]>(() => {
    const saved = localStorage.getItem('sahabatbk_absen_siswa_logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sahabatbk_absen_siswa_logs', JSON.stringify(absenLogs));
  }, [absenLogs]);

  // Scan & camera states
  const [scanInputNisn, setScanInputNisn] = useState('');
  const [scannedStudent, setScannedStudent] = useState<Siswa | null>(null);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const [cameraList, setCameraList] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);

  // Sound generator for checkout style barcode beep
  const playBeepSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // High pitched scan beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); // Beep duration 100ms
    } catch (err) {
      console.warn('Gagal memutar audio beep:', err);
    }
  };

  // Process any scanned string (NISN / Student ID)
  const handleProcessScan = (scannedText: string) => {
    const trimmed = scannedText.trim();
    if (!trimmed) return;

    // Throttle scan events of the same student within 5 seconds to prevent spam
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.code === trimmed && now - lastScannedRef.current.time < 5000) {
      return;
    }
    lastScannedRef.current = { code: trimmed, time: now };

    const student = siswaList.find(s => s.nisn === trimmed || s.id === trimmed);
    if (!student) {
      playBeepSound();
      setScanMessage({ type: 'error', text: `ERROR: Kode "${trimmed}" tidak terdaftar sebagai NISN/ID Siswa!` });
      setScannedStudent(null);
      return;
    }

    setScannedStudent(student);
    playBeepSound();

    const todayStr = getTodayDateString();
    const jamStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Check if student has already scanned today
    const alreadyScannedToday = absenLogs.some(
      log => log.siswaId === student.id && log.tanggal === todayStr
    );

    if (alreadyScannedToday) {
      setScanMessage({
        type: 'info',
        text: `INFORMASI: ${student.nama} sudah melakukan presensi hari ini pada jam ${
          absenLogs.find(log => log.siswaId === student.id && log.tanggal === todayStr)?.jam
        }.`
      });
      return;
    }

    // 1. Add log entry
    const newLog: AbsenSiswaLog = {
      id: `asl-${Date.now()}`,
      siswaId: student.id,
      namaSiswa: student.nama,
      kelasSiswa: student.kelas,
      nisnSiswa: student.nisn,
      tanggal: todayStr,
      jam: jamStr,
      status: 'HADIR'
    };

    setAbsenLogs(prev => [newLog, ...prev]);

    // 2. Automatically synchronize with Rekap Kehadiran
    const attRecord = kehadiranList.find(k => k.siswaId === student.id);
    if (attRecord) {
      // Decrement "Alpa" penalty since student arrived and scanned
      const newAlpa = Math.max(0, attRecord.alpa - 1);
      const totalAbsences = newAlpa + attRecord.sakit + attRecord.izin + attRecord.diska;
      const totalDays = 60; // Assuming 60 active school days base
      const newPercentage = Math.max(0, Math.min(100, Math.round(((totalDays - totalAbsences) / totalDays) * 100)));

      const updatedRecord: Kehadiran = {
        ...attRecord,
        alpa: newAlpa,
        alpaConsecutive: 0, // Reset consecutive alpa warnings
        persentaseKehadiran: newPercentage
      };
      
      onUpdateKehadiran(updatedRecord);
      setScanMessage({
        type: 'success',
        text: `PRESENSI BERHASIL! ${student.nama} (Kelas ${student.kelas}) dicatat HADIR. Sanksi Alpa berkurang 1.`
      });
    } else {
      setScanMessage({
        type: 'success',
        text: `PRESENSI BERHASIL! ${student.nama} (Kelas ${student.kelas}) dicatat HADIR.`
      });
    }
  };

  // Camera initialization and setup
  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      // Small delay to ensure the container is fully mounted in React virtual DOM
      await new Promise(resolve => setTimeout(resolve, 400));
      if (!isMounted) return;

      const element = document.getElementById('absen-reader');
      if (!element) return;

      try {
        const qrCodeInstance = new Html5Qrcode('absen-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8
          ],
          verbose: false
        });
        scannerRef.current = qrCodeInstance;
        setIsScannerRunning(true);

        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        const scanConfig = {
          fps: 22,
          qrbox: (width: number, height: number) => {
            const minDim = Math.min(width, height);
            let boxSize = Math.floor(minDim * 0.72);
            if (boxSize < 150) {
              boxSize = Math.min(minDim, 150);
            }
            if (boxSize < 50) {
              boxSize = 50;
            }
            return { width: boxSize, height: boxSize };
          },
          aspectRatio: 1.0
        };

        if (devices && devices.length > 0) {
          setCameraList(devices);
          // Look for environment back camera
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('environment') || 
            d.label.toLowerCase().includes('rear')
          ) || devices[0];

          setSelectedCameraId(backCam.id);
          await qrCodeInstance.start(backCam.id, scanConfig, (text) => handleProcessScan(text), () => {});
        } else {
          // Camera array empty, try default facingMode environment
          await qrCodeInstance.start({ facingMode: 'environment' }, scanConfig, (text) => handleProcessScan(text), () => {});
        }
      } catch (err: any) {
        console.error('Camera Scanner Error:', err);
        if (isMounted) {
          setCameraError(err?.message || 'Akses kamera ditolak atau perangkat kamera tidak ditemukan.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(err => console.error("Error stopping scanner on unmount:", err));
        }
        scannerRef.current = null;
      }
      setIsScannerRunning(false);
    };
  }, []);

  // Handle camera dropdown change
  const handleCameraChange = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        const scanConfig = {
          fps: 22,
          qrbox: (width: number, height: number) => {
            const minDim = Math.min(width, height);
            let boxSize = Math.floor(minDim * 0.72);
            if (boxSize < 150) {
              boxSize = Math.min(minDim, 150);
            }
            if (boxSize < 50) {
              boxSize = 50;
            }
            return { width: boxSize, height: boxSize };
          },
          aspectRatio: 1.0
        };
        await scannerRef.current.start(cameraId, scanConfig, (text) => handleProcessScan(text), () => {});
      } catch (err: any) {
        console.error('Failed switching camera:', err);
        setCameraError('Gagal beralih ke kamera terpilih: ' + err.message);
      }
    }
  };

  // Handle manual/wedge scanner form submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInputNisn.trim()) return;

    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      handleProcessScan(scanInputNisn.trim());
      setScanInputNisn('');
    }, 180);
  };

  // Delete a specific scan log and synchronize with Rekap Kehadiran
  const handleDeleteLog = (logId: string) => {
    const logToDelete = absenLogs.find(log => log.id === logId);
    if (!logToDelete) return;

    if (confirm(`Apakah Anda yakin ingin membatalkan/menghapus catatan presensi (${logToDelete.status}) untuk ${logToDelete.namaSiswa}?`)) {
      setAbsenLogs(prev => prev.filter(log => log.id !== logId));

      const attRecord = kehadiranList.find(k => k.siswaId === logToDelete.siswaId);
      if (attRecord) {
        let updatedRecord = { ...attRecord };
        if (logToDelete.status === 'HADIR') {
          // If HADIR log is removed, they are no longer present. Increment Alpa count back!
          updatedRecord.alpa += 1;
        } else if (logToDelete.status === 'ALPA') {
          updatedRecord.alpa = Math.max(0, updatedRecord.alpa - 1);
        } else if (logToDelete.status === 'SAKIT') {
          updatedRecord.sakit = Math.max(0, updatedRecord.sakit - 1);
        } else if (logToDelete.status === 'IZIN') {
          updatedRecord.izin = Math.max(0, updatedRecord.izin - 1);
        }

        // Recalculate percentage
        const totalAbsences = updatedRecord.alpa + updatedRecord.sakit + updatedRecord.izin + updatedRecord.diska;
        const totalDays = 60;
        updatedRecord.persentaseKehadiran = Math.max(0, Math.min(100, Math.round(((totalDays - totalAbsences) / totalDays) * 100)));

        onUpdateKehadiran(updatedRecord);
      }

      setScanMessage({
        type: 'info',
        text: `Presensi ${logToDelete.namaSiswa} berhasil dibatalkan dan disinkronkan ke Rekap Kehadiran.`
      });
    }
  };

  // Clear all logs for selected day and revert Rekap Kehadiran effects
  const handleClearDayLogs = () => {
    const logsToClear = absenLogs.filter(log => log.tanggal === selectedDate);
    if (logsToClear.length === 0) return;

    if (confirm(`Apakah Anda yakin ingin menghapus SELURUH ${logsToClear.length} log presensi pada tanggal ${selectedDate}? Tindakan ini akan mensinkronkan ulang Rekap Kehadiran.`)) {
      // Revert each log's effect on Rekap Kehadiran
      const updatedKehadiranMap = new Map<string, Kehadiran>();

      logsToClear.forEach(log => {
        const attRecord = updatedKehadiranMap.get(log.siswaId) || kehadiranList.find(k => k.siswaId === log.siswaId);
        if (attRecord) {
          let updatedRecord = { ...attRecord };
          if (log.status === 'HADIR') {
            updatedRecord.alpa += 1;
          } else if (log.status === 'ALPA') {
            updatedRecord.alpa = Math.max(0, updatedRecord.alpa - 1);
          } else if (log.status === 'SAKIT') {
            updatedRecord.sakit = Math.max(0, updatedRecord.sakit - 1);
          } else if (log.status === 'IZIN') {
            updatedRecord.izin = Math.max(0, updatedRecord.izin - 1);
          }

          // Recalculate
          const totalAbsences = updatedRecord.alpa + updatedRecord.sakit + updatedRecord.izin + updatedRecord.diska;
          const totalDays = 60;
          updatedRecord.persentaseKehadiran = Math.max(0, Math.min(100, Math.round(((totalDays - totalAbsences) / totalDays) * 100)));

          updatedKehadiranMap.set(log.siswaId, updatedRecord);
        }
      });

      // Update all at once
      updatedKehadiranMap.forEach(record => {
        onUpdateKehadiran(record);
      });

      setAbsenLogs(prev => prev.filter(log => log.tanggal !== selectedDate));
      setScanMessage({
        type: 'info',
        text: `Seluruh log presensi pada tanggal ${selectedDate} berhasil dibersihkan.`
      });
    }
  };

  // Manual status designation (Alpa, Sakit, Izin)
  const handleMarkStatus = (student: Siswa, status: 'ALPA' | 'SAKIT' | 'IZIN') => {
    const todayStr = selectedDate;
    const jamStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Check if student has already got a log for this date
    const alreadyLogged = absenLogs.some(
      log => log.siswaId === student.id && log.tanggal === todayStr
    );

    if (alreadyLogged) {
      alert(`Siswa ${student.nama} sudah memiliki catatan presensi untuk tanggal ${todayStr}`);
      return;
    }

    // 1. Add log entry
    const newLog: AbsenSiswaLog = {
      id: `asl-${Date.now()}`,
      siswaId: student.id,
      namaSiswa: student.nama,
      kelasSiswa: student.kelas,
      nisnSiswa: student.nisn,
      tanggal: todayStr,
      jam: jamStr,
      status: status
    };

    setAbsenLogs(prev => [newLog, ...prev]);

    // 2. Synchronize with Rekap Kehadiran
    const attRecord = kehadiranList.find(k => k.siswaId === student.id);
    if (attRecord) {
      let updatedRecord = { ...attRecord };
      if (status === 'ALPA') {
        updatedRecord.alpa += 1;
      } else if (status === 'SAKIT') {
        updatedRecord.sakit += 1;
      } else if (status === 'IZIN') {
        updatedRecord.izin += 1;
      }

      // Recalculate attendance percentage
      const totalAbsences = updatedRecord.alpa + updatedRecord.sakit + updatedRecord.izin + updatedRecord.diska;
      const totalDays = 60; // Base active school days
      const newPercentage = Math.max(0, Math.min(100, Math.round(((totalDays - totalAbsences) / totalDays) * 100)));
      updatedRecord.persentaseKehadiran = newPercentage;

      onUpdateKehadiran(updatedRecord);
    }

    setScanMessage({
      type: 'success',
      text: `Berhasil mencatat ${student.nama} sebagai ${status} pada tanggal ${todayStr}.`
    });
  };

  // Manual HADIR check-in (without camera scanner)
  const handleMarkHadirManually = (student: Siswa) => {
    const todayStr = selectedDate;
    const jamStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Check if student has already got a log for this date
    const alreadyLogged = absenLogs.some(
      log => log.siswaId === student.id && log.tanggal === todayStr
    );

    if (alreadyLogged) {
      alert(`Siswa ${student.nama} sudah memiliki catatan presensi untuk tanggal ${todayStr}`);
      return;
    }

    // 1. Add log entry
    const newLog: AbsenSiswaLog = {
      id: `asl-${Date.now()}`,
      siswaId: student.id,
      namaSiswa: student.nama,
      kelasSiswa: student.kelas,
      nisnSiswa: student.nisn,
      tanggal: todayStr,
      jam: jamStr,
      status: 'HADIR'
    };

    setAbsenLogs(prev => [newLog, ...prev]);

    // 2. Synchronize with Rekap Kehadiran (reduct Alpa if present)
    const attRecord = kehadiranList.find(k => k.siswaId === student.id);
    if (attRecord) {
      let updatedRecord = { ...attRecord };
      updatedRecord.alpa = Math.max(0, updatedRecord.alpa - 1);

      const totalAbsences = updatedRecord.alpa + updatedRecord.sakit + updatedRecord.izin + updatedRecord.diska;
      const totalDays = 60;
      const newPercentage = Math.max(0, Math.min(100, Math.round(((totalDays - totalAbsences) / totalDays) * 100)));
      updatedRecord.persentaseKehadiran = newPercentage;

      onUpdateKehadiran(updatedRecord);
    }

    setScanMessage({
      type: 'success',
      text: `Berhasil mencatat ${student.nama} HADIR secara manual pada tanggal ${todayStr}.`
    });
  };

  // Filter and compute statistics
  const filteredLogs = useMemo(() => {
    return absenLogs.filter(log => {
      const matchDate = log.tanggal === selectedDate;
      const matchSearch = searchTerm.trim() === '' || 
        log.namaSiswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.kelasSiswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.nisnSiswa.includes(searchTerm);
      
      const matchKelasWali = role !== 'WALI_KELAS' || !kelasWali || log.kelasSiswa === kelasWali;

      return matchDate && matchSearch && matchKelasWali;
    });
  }, [absenLogs, selectedDate, searchTerm, role, kelasWali]);

  // Total school enrollment
  const schoolTotalStudentsCount = useMemo(() => {
    return siswaList.filter(s => s.status === 'Aktif' && (role !== 'WALI_KELAS' || !kelasWali || s.kelas === kelasWali)).length;
  }, [siswaList, role, kelasWali]);

  // Compute stats for selected date
  const selectedDateStats = useMemo(() => {
    const presentCount = filteredLogs.filter(log => log.status === 'HADIR').length;
    const totalActive = schoolTotalStudentsCount || 1;
    const percentage = Math.round((presentCount / totalActive) * 100);
    return {
      presentCount,
      percentage: Math.min(100, percentage)
    };
  }, [filteredLogs, schoolTotalStudentsCount]);

  // Retrieve setting and check time limits
  const jamBatasAbsen = useMemo(() => {
    return localStorage.getItem('sahabatbk_setting_jam_batas_absen') || '07:15';
  }, []);

  const isPastLimit = useMemo(() => {
    const todayStr = getTodayDateString();
    if (selectedDate !== todayStr) {
      return true;
    }
    const [limitHour, limitMinute] = jamBatasAbsen.split(':').map(Number);
    const now = new Date();
    const limitDate = new Date();
    limitDate.setHours(limitHour || 7, limitMinute || 15, 0, 0);
    return now > limitDate;
  }, [selectedDate, jamBatasAbsen]);

  // Students who have not checked in yet
  const siswaBelumAbsen = useMemo(() => {
    const activeStudents = siswaList.filter(s => {
      const matchStatus = s.status === 'Aktif';
      const matchKelasWali = role !== 'WALI_KELAS' || !kelasWali || s.kelas === kelasWali;
      return matchStatus && matchKelasWali;
    });

    return activeStudents.filter(s => {
      const hasLog = absenLogs.some(log => log.siswaId === s.id && log.tanggal === selectedDate);
      return !hasLog;
    });
  }, [siswaList, absenLogs, selectedDate, role, kelasWali]);

  const filteredBelumAbsen = useMemo(() => {
    return siswaBelumAbsen.filter(s => {
      const matchSearch = searchTerm.trim() === '' || 
        s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nisn.includes(searchTerm);
      return matchSearch;
    });
  }, [siswaBelumAbsen, searchTerm]);

  // Students who checked in as HADIR but scanned past the limit hour
  const siswaTerlambat = useMemo(() => {
    return filteredLogs.filter(log => {
      if (log.status !== 'HADIR') return false;
      return isScanLate(log.jam, jamBatasAbsen);
    });
  }, [filteredLogs, jamBatasAbsen]);

  // Printable Window Trigger
  const handlePrintLogs = () => {
    const schoolName = localStorage.getItem('sahabatbk_setting_school_name') || 'SMP Negeri 3 Kras';
    const schoolAddress = localStorage.getItem('sahabatbk_setting_school_address') || 'Jl. Raya Kras No. 12, Kediri, Jawa Timur';
    const principalName = localStorage.getItem('sahabatbk_setting_principal_name') || 'Drs. Bambang Setiawan, M.Pd.';
    const principalNip = localStorage.getItem('sahabatbk_setting_principal_nip') || 'NIP. 19740512 199903 1 002';
    const counselorName = localStorage.getItem('sahabatbk_setting_counselor_name') || 'Sri Rahayu, S.Pd';
    const counselorNip = localStorage.getItem('sahabatbk_setting_counselor_nip') || 'NIP. 19820315 200801 2 007';
    const teacherName = localStorage.getItem('sahabatbk_username') || 'Guru Kelas / Piket';
    const logoDaerahUrl = localStorage.getItem('sahabatbk_setting_logo_daerah') || '';
    const logoSekolahUrl = localStorage.getItem('sahabatbk_setting_logo_sekolah') || '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Convert date YYYY-MM-DD to Indonesian format
    const formatIndoDate = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    const formattedDate = formatIndoDate(selectedDate);

    const rowsHtml = filteredLogs.map((log, index) => {
      let statusColor = '#059669'; // Green for HADIR
      if (log.status === 'ALPA') statusColor = '#dc2626'; // Red
      if (log.status === 'SAKIT') statusColor = '#d97706'; // Amber
      if (log.status === 'IZIN') statusColor = '#0284c7'; // Sky Blue

      return `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 10px; text-align: center;">${index + 1}</td>
          <td style="padding: 10px; font-weight: bold;">${log.namaSiswa}</td>
          <td style="padding: 10px; text-align: center;">${log.nisnSiswa}</td>
          <td style="padding: 10px; text-align: center;">${log.kelasSiswa}</td>
          <td style="padding: 10px; text-align: center; font-weight: bold; font-family: monospace;">${log.jam}</td>
          <td style="padding: 10px; text-align: center;"><span style="color: ${statusColor}; font-weight: bold;">${log.status}</span></td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Presensi Kehadiran Siswa - ${selectedDate}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; }
            .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
            .kop-logo-left { width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
            .kop-logo-right { width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; margin-left: 15px; }
            .kop-logo-img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .kop-logo-placeholder { width: 70px; height: 70px; background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #64748b; text-align: center; }
            .header-text { flex-grow: 1; text-align: center; }
            .header-text h1 { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0 0 3px 0; letter-spacing: 0.5px; }
            .header-text p { font-size: 10px; margin: 0 0 2px 0; color: #475569; }
            .report-title { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 25px; text-transform: uppercase; text-decoration: underline; }
            .meta-table { width: 100%; font-size: 12px; margin-bottom: 25px; }
            .meta-table td { padding: 4px 0; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 40px; }
            .data-table th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px 10px; font-weight: bold; text-align: left; }
            .data-table td { border: 1px solid #cbd5e1; }
            .signature-container { display: flex; justify-content: space-between; font-size: 12px; margin-top: 50px; page-break-inside: avoid; }
            .sig-block { width: 220px; text-align: center; }
            .sig-space { height: 80px; }
            .footer-note { text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="kop-logo-left">
              ${logoDaerahUrl 
                ? `<img src="${logoDaerahUrl}" class="kop-logo-img" />` 
                : `<div class="kop-logo-placeholder">LOGO DAERAH</div>`}
            </div>
            <div class="header-text">
              <h1>PEMERINTAH KABUPATEN KEDIRI</h1>
              <h1>DINAS PENDIDIKAN DAN KEBUDAYAAN</h1>
              <h1 style="color: #312e81;">${schoolName}</h1>
              <p>${schoolAddress}</p>
              <p style="font-weight: bold; color: #1e293b;">Kecamatan Kras, Kabupaten Kediri - POS 64172</p>
            </div>
            <div class="kop-logo-right">
              ${logoSekolahUrl 
                ? `<img src="${logoSekolahUrl}" class="kop-logo-img" />` 
                : `<div class="kop-logo-placeholder">TUT WURI</div>`}
            </div>
          </div>

          <div class="report-title">LAPORAN REKAP PRESENSI HARIAN KARTU SISWA</div>

          <table class="meta-table">
            <tr>
              <td style="width: 15%; font-weight: bold;">Hari / Tanggal</td>
              <td style="width: 35%;">: ${formattedDate}</td>
              <td style="width: 20%; font-weight: bold;">Total Kehadiran</td>
              <td style="width: 30%;">: ${selectedDateStats.presentCount} Siswa</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Tahun Ajaran</td>
              <td>: 2026/2027 (Ganjil)</td>
              <td style="font-weight: bold;">Persentase Presensi</td>
              <td>: ${selectedDateStats.percentage}% dari total ${schoolTotalStudentsCount} siswa aktif</td>
            </tr>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">No.</th>
                <th style="width: 35%;">Nama Lengkap Siswa</th>
                <th style="width: 18%; text-align: center;">NISN</th>
                <th style="width: 12%; text-align: center;">Kelas</th>
                <th style="width: 15%; text-align: center;">Jam Scan</th>
                <th style="width: 12%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs.length === 0 
                ? `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">Tidak ada catatan kehadiran yang terekam pada filter tanggal ini.</td></tr>` 
                : rowsHtml
              }
            </tbody>
          </table>

          <div class="signature-container">
            <div class="sig-block">
              <p>Mengetahui,</p>
              <p style="font-weight: bold;">Guru Bimbingan Konseling (BK)</p>
              <div class="sig-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">${counselorName}</p>
              <p style="color: #475569;">${counselorNip}</p>
            </div>
            
            <div class="sig-block">
              <p>Kras, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="font-weight: bold;">${role === 'GURU_BK' ? 'Guru BK' : role === 'WALI_KELAS' ? `Wali Kelas ${kelasWali || ''}` : role === 'GURU_PIKET' ? 'Guru Piket' : 'Kepala Sekolah'}</p>
              <div class="sig-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">${teacherName}</p>
              <p style="color: #475569;">${role === 'GURU_BK' ? counselorNip : role === 'KEPALA_SEKOLAH' ? principalNip : 'NIP. .........................................'}</p>
            </div>
          </div>

          <div class="footer-note">
            Dokumen cetak otomatis SahabatBK &copy; 2026 - SMP Negeri 3 Kras. Semua data tersinkronisasi langsung ke sistem rekapitulasi.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintTerlambat = () => {
    const schoolName = localStorage.getItem('sahabatbk_setting_school_name') || 'SMP Negeri 3 Kras';
    const schoolAddress = localStorage.getItem('sahabatbk_setting_school_address') || 'Jl. Raya Kras No. 12, Kediri, Jawa Timur';
    const principalName = localStorage.getItem('sahabatbk_setting_principal_name') || 'Drs. Bambang Setiawan, M.Pd.';
    const principalNip = localStorage.getItem('sahabatbk_setting_principal_nip') || 'NIP. 19740512 199903 1 002';
    const counselorName = localStorage.getItem('sahabatbk_setting_counselor_name') || 'Sri Rahayu, S.Pd';
    const counselorNip = localStorage.getItem('sahabatbk_setting_counselor_nip') || 'NIP. 19820315 200801 2 007';
    const teacherName = localStorage.getItem('sahabatbk_username') || 'Guru Kelas / Piket';
    const logoDaerahUrl = localStorage.getItem('sahabatbk_setting_logo_daerah') || '';
    const logoSekolahUrl = localStorage.getItem('sahabatbk_setting_logo_sekolah') || '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatIndoDate = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    const formattedDate = formatIndoDate(selectedDate);

    const rowsHtml = siswaTerlambat.map((log, index) => `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 10px; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; font-weight: bold;">${log.namaSiswa}</td>
        <td style="padding: 10px; text-align: center;">${log.nisnSiswa}</td>
        <td style="padding: 10px; text-align: center;">${log.kelasSiswa}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold; font-family: monospace; color: #dc2626;">${log.jam}</td>
        <td style="padding: 10px; text-align: center;"><span style="color: #dc2626; font-weight: bold; background-color: #fef2f2; padding: 4px 8px; border-radius: 4px; border: 1px solid #fee2e2;">TERLAMBAT</span></td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Siswa Terlambat - ${selectedDate}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; }
            .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
            .kop-logo-left { width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
            .kop-logo-right { width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; margin-left: 15px; }
            .kop-logo-img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .kop-logo-placeholder { width: 70px; height: 70px; background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #64748b; text-align: center; }
            .header-text { flex-grow: 1; text-align: center; }
            .header-text h1 { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0 0 3px 0; letter-spacing: 0.5px; }
            .header-text p { font-size: 10px; margin: 0 0 2px 0; color: #475569; }
            .report-title { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 25px; text-transform: uppercase; text-decoration: underline; }
            .meta-table { width: 100%; font-size: 12px; margin-bottom: 25px; }
            .meta-table td { padding: 4px 0; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 40px; }
            .data-table th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px 10px; font-weight: bold; text-align: left; }
            .data-table td { border: 1px solid #cbd5e1; }
            .signature-container { display: flex; justify-content: space-between; font-size: 12px; margin-top: 50px; page-break-inside: avoid; }
            .sig-block { width: 220px; text-align: center; }
            .sig-space { height: 80px; }
            .footer-note { text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="kop-logo-left">
              ${logoDaerahUrl 
                ? `<img src="${logoDaerahUrl}" class="kop-logo-img" />` 
                : `<div class="kop-logo-placeholder">LOGO DAERAH</div>`}
            </div>
            <div class="header-text">
              <h1>PEMERINTAH KABUPATEN KEDIRI</h1>
              <h1>DINAS PENDIDIKAN DAN KEBUDAYAAN</h1>
              <h1 style="color: #312e81;">${schoolName}</h1>
              <p>${schoolAddress}</p>
              <p style="font-weight: bold; color: #1e293b;">Kecamatan Kras, Kabupaten Kediri - POS 64172</p>
            </div>
            <div class="kop-logo-right">
              ${logoSekolahUrl 
                ? `<img src="${logoSekolahUrl}" class="kop-logo-img" />` 
                : `<div class="kop-logo-placeholder">TUT WURI</div>`}
            </div>
          </div>

          <div class="report-title">LAPORAN SISWA TERLAMBAT HADIR (LEWAT ${jamBatasAbsen} WIB)</div>

          <table class="meta-table">
            <tr>
              <td style="width: 20%; font-weight: bold;">Hari / Tanggal</td>
              <td style="width: 30%;">: ${formattedDate}</td>
              <td style="width: 25%; font-weight: bold;">Batas Jam Masuk</td>
              <td style="width: 25%;">: ${jamBatasAbsen} WIB</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Tahun Ajaran</td>
              <td>: 2026/2027 (Ganjil)</td>
              <td style="font-weight: bold;">Jumlah Siswa Terlambat</td>
              <td>: <span style="font-weight: bold; color: #dc2626;">${siswaTerlambat.length} Siswa</span></td>
            </tr>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">No.</th>
                <th style="width: 37%;">Nama Lengkap Siswa</th>
                <th style="width: 18%; text-align: center;">NISN</th>
                <th style="width: 12%; text-align: center;">Kelas</th>
                <th style="width: 13%; text-align: center;">Jam Masuk</th>
                <th style="width: 12%; text-align: center;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${siswaTerlambat.length === 0 
                ? `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">Tidak ada siswa yang tercatat terlambat hari ini.</td></tr>` 
                : rowsHtml
              }
            </tbody>
          </table>

          <div class="signature-container">
            <div class="sig-block">
              <p>Mengetahui,</p>
              <p style="font-weight: bold;">Guru Bimbingan Konseling (BK)</p>
              <div class="sig-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">${counselorName}</p>
              <p style="color: #475569;">${counselorNip}</p>
            </div>
            
            <div class="sig-block">
              <p>Kras, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="font-weight: bold;">${role === 'GURU_BK' ? 'Guru BK' : role === 'WALI_KELAS' ? `Wali Kelas ${kelasWali || ''}` : role === 'GURU_PIKET' ? 'Guru Piket' : 'Kepala Sekolah'}</p>
              <div class="sig-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">${teacherName}</p>
              <p style="color: #475569;">${role === 'GURU_BK' ? counselorNip : role === 'KEPALA_SEKOLAH' ? principalNip : 'NIP. .........................................'}</p>
            </div>
          </div>

          <div class="footer-note">
            Dokumen cetak otomatis SahabatBK &copy; 2026 - ${schoolName}. Semua data tersinkronisasi langsung ke sistem rekapitulasi.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintBelumAbsen = () => {
    const schoolName = localStorage.getItem('sahabatbk_setting_school_name') || 'SMP Negeri 3 Kras';
    const schoolAddress = localStorage.getItem('sahabatbk_setting_school_address') || 'Jl. Raya Kras No. 12, Kediri, Jawa Timur';
    const principalName = localStorage.getItem('sahabatbk_setting_principal_name') || 'Drs. Bambang Setiawan, M.Pd.';
    const principalNip = localStorage.getItem('sahabatbk_setting_principal_nip') || 'NIP. 19740512 199903 1 002';
    const counselorName = localStorage.getItem('sahabatbk_setting_counselor_name') || 'Sri Rahayu, S.Pd';
    const counselorNip = localStorage.getItem('sahabatbk_setting_counselor_nip') || 'NIP. 19820315 200801 2 007';
    const teacherName = localStorage.getItem('sahabatbk_username') || 'Guru Kelas / Piket';
    const logoDaerahUrl = localStorage.getItem('sahabatbk_setting_logo_daerah') || '';
    const logoSekolahUrl = localStorage.getItem('sahabatbk_setting_logo_sekolah') || '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatIndoDate = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    const formattedDate = formatIndoDate(selectedDate);

    const rowsHtml = filteredBelumAbsen.map((student, index) => `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 10px; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; font-weight: bold;">${student.nama}</td>
        <td style="padding: 10px; text-align: center;">${student.nisn}</td>
        <td style="padding: 10px; text-align: center;">${student.kelas}</td>
        <td style="padding: 10px; text-align: center; color: #94a3b8; font-style: italic;">Belum Pindai Kartu</td>
        <td style="padding: 10px; text-align: center;"><span style="color: #ea580c; font-weight: bold; background-color: #fff7ed; padding: 4px 8px; border-radius: 4px; border: 1px solid #ffedd5;">BELUM ABSEN</span></td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Siswa Belum Absen - ${selectedDate}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; }
            .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
            .kop-logo-left { width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
            .kop-logo-right { width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; margin-left: 15px; }
            .kop-logo-img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .kop-logo-placeholder { width: 70px; height: 70px; background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #64748b; text-align: center; }
            .header-text { flex-grow: 1; text-align: center; }
            .header-text h1 { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0 0 3px 0; letter-spacing: 0.5px; }
            .header-text p { font-size: 10px; margin: 0 0 2px 0; color: #475569; }
            .report-title { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 25px; text-transform: uppercase; text-decoration: underline; }
            .meta-table { width: 100%; font-size: 12px; margin-bottom: 25px; }
            .meta-table td { padding: 4px 0; }
            .data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 40px; }
            .data-table th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px 10px; font-weight: bold; text-align: left; }
            .data-table td { border: 1px solid #cbd5e1; }
            .signature-container { display: flex; justify-content: space-between; font-size: 12px; margin-top: 50px; page-break-inside: avoid; }
            .sig-block { width: 220px; text-align: center; }
            .sig-space { height: 80px; }
            .footer-note { text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="kop-logo-left">
              ${logoDaerahUrl 
                ? `<img src="${logoDaerahUrl}" class="kop-logo-img" />` 
                : `<div class="kop-logo-placeholder">LOGO DAERAH</div>`}
            </div>
            <div class="header-text">
              <h1>PEMERINTAH KABUPATEN KEDIRI</h1>
              <h1>DINAS PENDIDIKAN DAN KEBUDAYAAN</h1>
              <h1 style="color: #312e81;">${schoolName}</h1>
              <p>${schoolAddress}</p>
              <p style="font-weight: bold; color: #1e293b;">Kecamatan Kras, Kabupaten Kediri - POS 64172</p>
            </div>
            <div class="kop-logo-right">
              ${logoSekolahUrl 
                ? `<img src="${logoSekolahUrl}" class="kop-logo-img" />` 
                : `<div class="kop-logo-placeholder">TUT WURI</div>`}
            </div>
          </div>

          <div class="report-title">LAPORAN REKAP SISWA BELUM PRESENSI HARIAN</div>

          <table class="meta-table">
            <tr>
              <td style="width: 20%; font-weight: bold;">Hari / Tanggal</td>
              <td style="width: 30%;">: ${formattedDate}</td>
              <td style="width: 25%; font-weight: bold;">Batas Jam Masuk</td>
              <td style="width: 25%;">: ${jamBatasAbsen} WIB</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Tahun Ajaran</td>
              <td>: 2026/2027 (Ganjil)</td>
              <td style="font-weight: bold;">Jumlah Belum Presensi</td>
              <td>: <span style="font-weight: bold; color: #ea580c;">${filteredBelumAbsen.length} Siswa</span></td>
            </tr>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">No.</th>
                <th style="width: 37%;">Nama Lengkap Siswa</th>
                <th style="width: 18%; text-align: center;">NISN</th>
                <th style="width: 12%; text-align: center;">Kelas</th>
                <th style="width: 13%; text-align: center;">Keterangan</th>
                <th style="width: 12%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBelumAbsen.length === 0 
                ? `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">Seluruh siswa aktif sudah terekam presensinya hari ini.</td></tr>` 
                : rowsHtml
              }
            </tbody>
          </table>

          <div class="signature-container">
            <div class="sig-block">
              <p>Mengetahui,</p>
              <p style="font-weight: bold;">Guru Bimbingan Konseling (BK)</p>
              <div class="sig-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">${counselorName}</p>
              <p style="color: #475569;">${counselorNip}</p>
            </div>
            
            <div class="sig-block">
              <p>Kras, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="font-weight: bold;">${role === 'GURU_BK' ? 'Guru BK' : role === 'WALI_KELAS' ? `Wali Kelas ${kelasWali || ''}` : role === 'GURU_PIKET' ? 'Guru Piket' : 'Kepala Sekolah'}</p>
              <div class="sig-space"></div>
              <p style="text-decoration: underline; font-weight: bold;">${teacherName}</p>
              <p style="color: #475569;">${role === 'GURU_BK' ? counselorNip : role === 'KEPALA_SEKOLAH' ? principalNip : 'NIP. .........................................'}</p>
            </div>
          </div>

          <div class="footer-note">
            Dokumen cetak otomatis SahabatBK &copy; 2026 - ${schoolName}. Semua data tersinkronisasi langsung ke sistem rekapitulasi.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* Abstract decorative graphic elements */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-20 -mb-20 blur-xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" /> Portal Scanner Real-time
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none">
              Presensi Siswa QR &amp; Barcode
            </h2>
            <p className="text-xs text-slate-100 font-medium max-w-xl">
              Pindai kode QR atau barcode pada kartu siswa SMP Negeri 3 Kras. Kehadiran akan terekam secara permanen dan otomatis memangkas angka Alpa siswa di rekapitulasi.
            </p>
          </div>

          {/* Current Date & Live clock widget */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center self-start md:self-auto min-w-[170px] shadow-sm">
            <span className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest flex items-center gap-1">
              <Clock className="h-3 w-3" /> Jam Server Aktif
            </span>
            <span className="text-2xl font-black font-mono tracking-wider mt-0.5">{liveTime}</span>
            <span className="text-[10px] text-white/80 font-bold mt-1 uppercase tracking-wide">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive grid: Scanner & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CAMERA / SCANNER WIDGET (4 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-5">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Camera className="h-5 w-5 text-emerald-600 animate-pulse" />
              <span>Kamera Pemindai Kartu</span>
            </h3>

            {/* Camera Source Selector (if multiple cameras exist) */}
            {cameraList.length > 1 && (
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Pilih Sumber Kamera</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {cameraList.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Kamera ${cam.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Video Viewport Wrapper */}
            <div className="relative bg-slate-950 aspect-square w-full max-w-[280px] mx-auto rounded-2xl border border-slate-800 overflow-hidden shadow-md flex flex-col justify-center">
              {/* Target div for html5-qrcode library */}
              <div id="absen-reader" className="w-full h-full overflow-hidden" style={{ minHeight: '260px' }}></div>
              
              {/* Overlay elements */}
              <div className="absolute inset-0 pointer-events-none border border-emerald-500/10 rounded-2xl" />
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-emerald-500 pointer-events-none" />
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-emerald-500 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-emerald-500 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-emerald-500 pointer-events-none" />

              {isScannerRunning && !cameraError && (
                <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] top-1/2 -translate-y-1/2 pointer-events-none animate-[bounce_2.5s_infinite_ease-in-out]" />
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-center p-5 z-20 space-y-2">
                  <AlertTriangle className="h-8 w-8 text-rose-500 animate-bounce" />
                  <p className="text-xs font-bold text-rose-300">Kamera Tidak Dapat Diakses</p>
                  <p className="text-[9px] text-slate-400 max-w-xs">{cameraError}</p>
                  <p className="text-[10px] text-emerald-400 font-bold">Harap gunakan Input NISN Manual di bawah ini.</p>
                </div>
              )}
            </div>

            {/* Scanned Student Profil Card Quick View */}
            {scannedStudent && (
              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-3.5 flex items-center gap-3 animate-fade-in shadow-xs">
                <img 
                  src={getStudentPhoto(scannedStudent.fotoUrl)} 
                  alt={scannedStudent.nama}
                  className="h-12 w-12 object-cover rounded-full border border-emerald-500 shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-slate-800 truncate">{scannedStudent.nama}</h4>
                  <p className="text-[10px] text-slate-500 font-bold">Kelas {scannedStudent.kelas} &bull; NISN: {scannedStudent.nisn}</p>
                </div>
                <span className="text-[8px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  OK
                </span>
              </div>
            )}

            {/* Manual Backup Scanner submission (for keyboard / wedge scanning gun fallback) */}
            <form onSubmit={handleManualSubmit} className="space-y-1.5 pt-1">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                Input NISN Manual (Wedge / Backup)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik atau scan laser NISN siswa..."
                  value={scanInputNisn}
                  onChange={(e) => setScanInputNisn(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all placeholder:font-sans"
                />
                <button
                  type="submit"
                  disabled={isScanning}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                >
                  {isScanning ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Kirim</span>
                  )}
                </button>
              </div>
            </form>

            {/* Live message box info */}
            {scanMessage && (
              <div className={`p-4 rounded-xl text-xs font-bold flex items-start gap-2.5 animate-scale-up ${
                scanMessage.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : scanMessage.type === 'info'
                  ? 'bg-amber-50 border border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                {scanMessage.type === 'error' && <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-600 mt-0.5" />}
                {scanMessage.type === 'info' && <CheckCircle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />}
                {scanMessage.type === 'success' && <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5" />}
                <span className="leading-relaxed">{scanMessage.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PRESENCE HISTORY & REPORTS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 flex flex-col h-[580px]">
            
            {/* Action Bar: Title, Date selection & Print trigger */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <span>Daftar Log Kehadiran</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                  {activeSubTab === 'sudah' 
                    ? `Menampilkan ${filteredLogs.length} data terpindai/tercatat`
                    : `Menampilkan ${filteredBelumAbsen.length} siswa belum absen`
                  }
                </p>
              </div>

              {/* Date & Control Tools */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Tanggal:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setScanMessage(null);
                    }}
                    className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowPrintDropdown(!showPrintDropdown)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Cetak Laporan</span>
                    <span className="text-[9px] opacity-70">▼</span>
                  </button>

                  {showPrintDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setShowPrintDropdown(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 py-2 animate-scale-up">
                        <div className="px-3.5 py-1.5 border-b border-slate-150 mb-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Opsi Pencetakan</span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            handlePrintLogs();
                            setShowPrintDropdown(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2.5 group cursor-pointer"
                        >
                          <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 shrink-0">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold text-slate-700 block">Cetak Semua Log</span>
                            <span className="text-[9px] text-slate-400 font-semibold block">Terekam {filteredLogs.length} data</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handlePrintTerlambat();
                            setShowPrintDropdown(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2.5 group cursor-pointer"
                        >
                          <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 shrink-0">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold text-slate-700 block">Cetak Siswa Terlambat</span>
                            <span className="text-[9px] text-slate-400 font-semibold block">{siswaTerlambat.length} siswa terlambat</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handlePrintBelumAbsen();
                            setShowPrintDropdown(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2.5 group cursor-pointer"
                        >
                          <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 shrink-0">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold text-slate-700 block">Cetak Belum Absen</span>
                            <span className="text-[9px] text-slate-400 font-semibold block">{filteredBelumAbsen.length} siswa belum absen</span>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sub Tabs: Sudah Absen vs Belum Absen */}
            <div className="flex border-b border-slate-100 my-3 shrink-0">
              <button
                onClick={() => {
                  setActiveSubTab('sudah');
                  setSearchTerm('');
                }}
                className={`flex-1 py-2 text-xs font-extrabold transition-all border-b-2 uppercase tracking-wider ${
                  activeSubTab === 'sudah'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Sudah Absen ({filteredLogs.length})
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('belum');
                  setSearchTerm('');
                }}
                className={`flex-1 py-2 text-xs font-extrabold transition-all border-b-2 uppercase tracking-wider relative ${
                  activeSubTab === 'belum'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Belum Absen ({siswaBelumAbsen.length})
                {siswaBelumAbsen.length > 0 && (
                  <span className="absolute top-1 right-1/4 h-2 w-2 bg-rose-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Quick dashboard cards for the selected date */}
            <div className="grid grid-cols-2 gap-4 mb-4 shrink-0">
              <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-3 flex items-center gap-3">
                <div className="h-9 w-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Hadir Hari Ini</span>
                  <span className="text-xs font-black text-slate-800 leading-none">{selectedDateStats.presentCount} Siswa</span>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-3 flex items-center gap-3">
                <div className="h-9 w-9 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Rasio Kehadiran</span>
                  <span className="text-xs font-black text-slate-800 leading-none">{selectedDateStats.percentage}%</span>
                </div>
              </div>
            </div>

            {/* Info Batas Jam Masuk */}
            <div className={`p-2.5 rounded-xl text-[10px] font-bold mb-3 flex items-center justify-between shrink-0 ${
              isPastLimit 
                ? 'bg-rose-50 border border-rose-100/60 text-rose-700' 
                : 'bg-emerald-50 border border-emerald-100/60 text-emerald-700'
            }`}>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Batas Jam Presensi Masuk: <strong className="font-extrabold">{jamBatasAbsen} WIB</strong>
                </span>
              </div>
              <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md ${
                isPastLimit ? 'bg-rose-200/50 text-rose-800' : 'bg-emerald-200/50 text-emerald-800'
              }`}>
                {isPastLimit ? 'Sudah Lewat Batas' : 'Belum Lewat'}
              </span>
            </div>

            {/* Search Input Filter */}
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={activeSubTab === 'sudah' 
                  ? "Cari siswa sudah absen (nama, kelas, NISN)..." 
                  : "Cari siswa belum absen (nama, kelas, NISN)..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Interactive lists body scroll area */}
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl bg-slate-50/30">
              {activeSubTab === 'sudah' ? (
                filteredLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <Calendar className="h-10 w-10 text-slate-200" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Tidak Ada Catatan Presensi</span>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                      Belum ada siswa {role === 'WALI_KELAS' && `kelas ${kelasWali}`} yang melakukan pemindaian atau tercatat kehadirannya pada tanggal {selectedDate}.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-3 hover:bg-slate-50/80 transition-all animate-fade-in group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar initials badge */}
                          <div className="h-8 w-8 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-inner shrink-0">
                            {log.namaSiswa.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-slate-800 block hover:text-indigo-600 cursor-pointer truncate">
                              {log.namaSiswa}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                              Kelas {log.kelasSiswa} &bull; NISN: {log.nisnSiswa}
                            </span>
                          </div>
                        </div>

                        {/* Log Timestamp and Actions */}
                        <div className="flex items-center gap-3 text-right shrink-0">
                          <div className="space-y-0.5">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider block ${
                              log.status === 'HADIR'
                                ? 'text-emerald-600 bg-emerald-50 border border-emerald-100/50'
                                : log.status === 'ALPA'
                                ? 'text-rose-600 bg-rose-50 border border-rose-100/50'
                                : log.status === 'SAKIT'
                                ? 'text-amber-600 bg-amber-50 border border-amber-100/50'
                                : 'text-sky-600 bg-sky-50 border border-sky-100/50'
                            }`}>
                              {log.status}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-slate-500 block">
                              {log.jam} WIB
                            </span>
                          </div>

                          {/* BK & Piket can discard log */}
                          {(role === 'GURU_BK' || role === 'GURU_PIKET') && (
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                              title="Batalkan Presensi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                filteredBelumAbsen.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <CheckCircle className="h-10 w-10 text-emerald-400" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Semua Siswa Sudah Hadir</span>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                      Seluruh siswa aktif {role === 'WALI_KELAS' && `kelas ${kelasWali}`} pada tanggal ini telah terdata kehadirannya. Kerja bagus!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredBelumAbsen.map((student) => (
                      <div 
                        key={student.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 hover:bg-slate-50/80 transition-all animate-fade-in"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Student initials */}
                          <div className="h-8 w-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-inner shrink-0">
                            {student.nama.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-slate-800 block truncate">
                              {student.nama}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                              Kelas {student.kelas} &bull; NISN: {student.nisn}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons (Alpa, Sakit, Izin) */}
                        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0">
                          <button
                            onClick={() => handleMarkHadirManually(student)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 text-emerald-700 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                            title="Hadir Manual (Tanpa Scan)"
                          >
                            Hadir
                          </button>
                          <button
                            onClick={() => handleMarkStatus(student, 'IZIN')}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-600 border border-sky-200 text-sky-700 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                            title="Tandai Izin"
                          >
                            Izin
                          </button>
                          <button
                            onClick={() => handleMarkStatus(student, 'SAKIT')}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-600 border border-amber-200 text-amber-700 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                            title="Tandai Sakit"
                          >
                            Sakit
                          </button>
                          <button
                            onClick={() => handleMarkStatus(student, 'ALPA')}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-600 border border-rose-200 text-rose-700 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                            title="Tandai Alpa"
                          >
                            Alpa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Clear database table records warning */}
            {(role === 'GURU_BK' || role === 'GURU_PIKET') && activeSubTab === 'sudah' && filteredLogs.length > 0 && (
              <div className="pt-3 flex justify-end shrink-0">
                <button
                  onClick={handleClearDayLogs}
                  className="text-[10px] font-extrabold text-rose-500 hover:text-rose-700 hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Bersihkan Seluruh Log Tanggal Ini
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
