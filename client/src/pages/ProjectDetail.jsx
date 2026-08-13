import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios, { apiAssetUrl } from '../config/api'
import * as XLSX from 'xlsx';

function ProjectDetail() {
  const { id } = useParams()
  const fileInputRef = useRef(null);
  const [projectInfo, setProjectInfo] = useState(null)
  const [transaksi, setTransaksi] = useState([])
  const [file, setFile] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isDarkMode] = useState(localStorage.getItem('nightMode') === 'true');
  const [loading, setLoading] = useState(true);

  const [showStackModal, setShowStackModal] = useState(false);
  const [activeTransId, setActiveTransId] = useState(null);
  const [stackFiles, setStackFiles] = useState([]);
  const [newStackFile, setNewStackFile] = useState(null);

  const [progressFotos, setProgressFotos] = useState([])
  const [fotoProgress, setFotoProgress] = useState(null)
  const [ketProgress, setKetProgress] = useState('')

  const [formData, setFormData] = useState({ 
    jenis: 'Keluar', kategori: '', jumlah: '', total_tagihan: '0', 
    vendor: '', pic: '' 
  })

  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)

  const userVa = JSON.parse(localStorage.getItem('user_va'));

  const fetchData = useCallback(async () => {
    if (!id || id === 'undefined') { setLoading(false); return; }
    try {
      setLoading(true);
      const timestamp = Date.now();
      const [resProject, resTrans, resProgress] = await Promise.all([
        axios.get(`get_projects.php?t=${timestamp}`),
        axios.get(`get_transactions.php?project_id=${id}&t=${timestamp}`),
        axios.get(`get_progress.php?project_id=${id}&t=${timestamp}`)
      ]);
      
      const currentProject = Array.isArray(resProject.data) 
        ? resProject.data.find(p => String(p.id) === String(id)) 
        : null;

      if (currentProject) {
        setProjectInfo(currentProject);
        setTransaksi(resTrans.data || []);
        setProgressFotos(resProgress.data || []);
      }
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // LOGIKA IMPORT EXCEL (STRATEGI REVISI BOS)
  const handleImportExcel = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const headerIndex = matrix.findIndex((row) => {
          const keys = row.map((cell) => String(cell).toLowerCase().replace(/[^a-z0-9]+/g, ''));
          const hasIdentity = keys.some((key) => ['no', 'nama', 'namamaterial', 'namabarang', 'uraian', 'material', 'item'].includes(key));
          const hasAmount = keys.some((key) => ['total', 'grandtotal', 'jumlah', 'jumlahharga', 'jmlhharga', 'hargasatuan', 'hrgsatuan', 'harga', 'nominal'].some((name) => key.startsWith(name)));
          return hasIdentity && hasAmount;
        });
        if (headerIndex < 0) throw new Error('Baris judul kolom Excel tidak ditemukan.');
        const data = XLSX.utils.sheet_to_json(ws, { range: headerIndex, defval: '' });

        if (!data.length) throw new Error('Sheet Excel tidak memiliki data.');
        const response = await axios.post('import_transactions.php', {
          project_id: id,
          rows: data,
          changed_by: userVa?.nama_lengkap || userVa?.username || 'Excel Import',
        });
        const skipped = response.data?.skipped?.length || 0;
        console.info(`${response.data?.imported || 0} baris berhasil diimpor${skipped ? `, ${skipped} baris dilewati` : ''}.`);
        alert("Import Data Berhasil! 🚀");
        fetchData();
      } catch (err) {
        alert(err.response?.data?.message || err.message || "Gagal membaca file Excel. Pastikan format kolom sesuai.");
        console.error(err);
      }
    };
    reader.readAsBinaryString(uploadedFile);
    e.target.value = null; // Reset input
  };

  const openStackModal = async (tId) => {
    setActiveTransId(tId);
    setStackFiles([]); 
    setShowStackModal(true);
    try {
      const res = await axios.get(`get_transaction_proofs.php?transaction_id=${tId}&t=${Date.now()}`);
      setStackFiles(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("Gagal ambil stack:", err); }
  }

  const handleAddStackProof = async () => {
    if (!newStackFile) return alert("Pilih file dulu!");
    const data = new FormData();
    data.append('transaction_id', activeTransId);
    data.append('bukti', newStackFile);
    try {
      await axios.post('add_transaction_proof.php', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewStackFile(null);
      const res = await axios.get(`get_transaction_proofs.php?transaction_id=${activeTransId}&t=${Date.now()}`);
      setStackFiles(Array.isArray(res.data) ? res.data : []);
    } catch { alert("Gagal upload"); }
  }

  const handleDeleteStackProof = async (proofId) => {
    if (proofId && window.confirm("Hapus bukti transfer ini?")) {
      await axios.post('delete_transaction_proof.php', { id: proofId });
      const res = await axios.get(`get_transaction_proofs.php?transaction_id=${activeTransId}&t=${Date.now()}`);
      setStackFiles(Array.isArray(res.data) ? res.data : []);
    }
  }

  const handleUploadProgress = (e) => {
    e.preventDefault();
    if (!fotoProgress) return alert("Pilih foto!");
    const data = new FormData();
    data.append('project_id', id);
    data.append('user_id', userVa?.id || 1); 
    data.append('foto', fotoProgress);
    data.append('keterangan', ketProgress);
    axios.post('upload_progress.php', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => {
        setFotoProgress(null); setKetProgress(''); fetchData(); 
        alert("Progress Uploaded! 🚀");
    }).catch(err => { alert("Gagal upload progress"); console.error(err); });
  };

  const handleDeleteProgress = (fotoId) => {
    if (window.confirm("Hapus foto progress ini?")) {
      axios.post('delete_progress.php', { id: fotoId }).then(() => fetchData());
    }
  };

  const handleTransactionStatus = async (transactionId, status) => {
    try {
      await axios.post('update_transaction_status.php', { id: transactionId, status, updated_by: userVa?.nama_lengkap || userVa?.username || 'Pengguna tidak diketahui' });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui status transaksi.');
    }
  };

  const formatNumber = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "0";

  const handleAmountChange = (e, field) => {
    let value = e.target.value.replace(/\./g, '').replace(/^0+/, ''); 
    if (value === '') value = '0';
    setFormData({ ...formData, [field]: value });
  };

  const targetKontrak = parseFloat(projectInfo?.budget_total) || 0;
  const totalMasuk = transaksi.filter(t => t.jenis?.toLowerCase().includes('masuk')).reduce((acc, curr) => acc + (parseFloat(curr.jumlah) || 0), 0);
  const totalKeluar = transaksi.filter(t => t.jenis?.toLowerCase().includes('keluar')).reduce((acc, curr) => acc + (parseFloat(curr.jumlah) || 0), 0);
  const sisaPiutangOwner = Math.max(0, targetKontrak - totalMasuk);
  const sisaSaldoProject = totalMasuk - totalKeluar;
  const totalHutangVendor = transaksi.reduce((acc, curr) => {
    const sisa = (parseFloat(curr.total_tagihan) || 0) - (parseFloat(curr.jumlah) || 0);
    return acc + (curr.jenis?.toLowerCase().includes('keluar') && sisa > 0 ? sisa : 0);
  }, 0);

  const expensePercent = targetKontrak > 0 ? (totalKeluar / targetKontrak) * 100 : 0;
  const dashOffset = 251.2 - (251.2 * Math.min(expensePercent, 100)) / 100;
  const weightedItems = transaksi.filter((item) => ['keluar', 'expense'].includes(item.jenis?.toLowerCase()) && Number(item.total_tagihan) > 0);
  const weightedRabTotal = weightedItems.reduce((total, item) => total + Number(item.total_tagihan || 0), 0);
  const weightedRealization = weightedItems.reduce((total, item) => {
    const itemTotal = Number(item.total_tagihan) || 0;
    const itemProgress = itemTotal > 0 ? Math.min(Number(item.jumlah || 0) / itemTotal, 1) : 0;
    const itemWeight = weightedRabTotal > 0 ? itemTotal / weightedRabTotal : 0;
    return total + (itemWeight * itemProgress);
  }, 0);
  const weightedProgressPercent = Math.min(weightedRealization * 100, 100);
  const weightedNominal = weightedRabTotal * weightedRealization;

  const handleUpdateStatus = (newStatus) => {
    axios.post('update_status.php', { id, status: newStatus }).then(() => fetchData());
  }

  const downloadImportTemplate = () => {
    const rows = [
      ['TEMPLATE IMPORT RENCANA ANGGARAN BIAYA'],
      [`PEKERJAAN: ${projectInfo?.nama_proyek || 'Nama Proyek'}`],
      [`KLIEN / LOKASI: ${projectInfo?.klien || 'Nama Klien / Lokasi'}`],
      [],
      ['NO', 'URAIAN PEKERJAAN', 'SPESIFIKASI', 'VOL', 'SAT', 'HRG SATUAN (Rp)', 'JMLH HARGA (Rp)', 'BOBOT (%)', 'PROGRESS (%)', 'NOMINAL (Rp)'],
      ['I', 'PEKERJAAN MATERIAL'],
      [1, 'Semen Portland', 'Semen 50 kg', 10, 'sak', 75000, 750000, 0.1119402985, 0.5, 375000],
      [2, 'Bata merah', 'Ukuran standar', 1000, 'bh', 1200, 1200000, 0.1791044776, 0, 0],
      ['II', 'PEKERJAAN UPAH'],
      [1, 'Upah tukang', 'Tim tukang minggu ke-1', 7, 'hari', 250000, 1750000, 0.2611940299, 1, 1750000],
      ['III', 'PEKERJAAN SUBCON'],
      [1, 'Pemasangan plafon', 'Vendor contoh', 20, 'm2', 150000, 3000000, 0.4477611940, 0.25, 750000],
      ['', 'TOTAL PROGRESS PROYEK', '', '', '', '', 6700000, 1, 0.4291044776, 2875000],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const exampleRows = [7, 8, 10, 12];
    const exampleValues = [
      { weight: 0.1119402985, nominal: 375000 },
      { weight: 0.1791044776, nominal: 0 },
      { weight: 0.2611940299, nominal: 1750000 },
      { weight: 0.4477611940, nominal: 750000 },
    ];
    exampleRows.forEach((excelRow, index) => {
      sheet[`H${excelRow}`] = { t: 'n', f: `G${excelRow}/SUM($G$7:$G$12)`, v: exampleValues[index].weight, z: '0.00%' };
      sheet[`J${excelRow}`] = { t: 'n', f: `G${excelRow}*I${excelRow}`, v: exampleValues[index].nominal, z: '#,##0.00' };
    });
    sheet.H13 = { t: 'n', f: 'SUM(H7:H12)', v: 1, z: '0.00%' };
    sheet.I13 = { t: 'n', f: 'SUMPRODUCT(H7:H12,I7:I12)', v: 0.4291044776, z: '0.00%' };
    sheet.J13 = { t: 'n', f: 'SUM(J7:J12)', v: 2875000, z: '#,##0.00' };
    sheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
      { s: { r: 5, c: 1 }, e: { r: 5, c: 9 } },
      { s: { r: 8, c: 1 }, e: { r: 8, c: 9 } },
      { s: { r: 10, c: 1 }, e: { r: 10, c: 9 } },
    ];
    sheet['!cols'] = [
      { wch: 7 }, { wch: 38 }, { wch: 28 }, { wch: 10 }, { wch: 9 },
      { wch: 19 }, { wch: 20 }, { wch: 13 }, { wch: 16 }, { wch: 20 },
    ];
    [6, 7, 9, 11, 12].forEach((rowIndex) => {
      ['F', 'G', 'J'].forEach((column) => { sheet[`${column}${rowIndex + 1}`].z = '#,##0.00'; });
      ['H', 'I'].forEach((column) => { sheet[`${column}${rowIndex + 1}`].z = '0.00%'; });
    });
    sheet['!autofilter'] = { ref: 'A5:J5' };

    const instructions = XLSX.utils.aoa_to_sheet([
      ['PETUNJUK IMPORT RAB'],
      ['1', 'Jangan mengubah nama kolom pada baris header.'],
      ['2', 'Gunakan kelompok PEKERJAAN MATERIAL, PEKERJAAN UPAH, atau PEKERJAAN SUBCON.'],
      ['3', 'Bobot adalah proporsi Jumlah Harga item terhadap total RAB dan jumlah seluruh bobot harus 100%.'],
      ['4', 'Progress item dapat diisi sebagai 50% atau angka desimal 0,5. Progress proyek dihitung dari Bobot x Progress item.'],
      ['5', 'Baris contoh boleh dihapus atau diganti dengan data proyek.'],
      ['6', 'Baris tanpa uraian atau tanpa jumlah harga akan dilewati.'],
    ]);
    instructions['!cols'] = [{ wch: 8 }, { wch: 95 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'TEMPLATE RAB');
    XLSX.utils.book_append_sheet(workbook, instructions, 'PETUNJUK');
    XLSX.writeFile(workbook, `Template_Import_RAB_${projectInfo?.nama_proyek || 'Proyek'}.xlsx`);
  };

  const exportToExcel = () => {
    const expenses = (transaksi || []).filter((item) => ['keluar', 'expense'].includes(item.jenis?.toLowerCase()));
    if (expenses.length === 0) {
      alert("Tidak ada data pengeluaran untuk diekspor sebagai RAB");
      return;
    }

    const getGroup = (item) => {
      const category = String(item.kategori || '').toLowerCase();
      if (/upah|gaji|payroll|tukang|pekerja/.test(category)) return 'PEKERJAAN UPAH';
      if (/subcon|subkon|vendor|borongan|pemasangan/.test(category)) return 'PEKERJAAN SUBCON';
      if (/material|logistik|bata|semen|pasir|beton|besi|kayu|kusen|keramik|lantai|atap|plafon|pipa|listrik|dinding/.test(category)) return 'PEKERJAAN MATERIAL';
      return 'PEKERJAAN LAIN-LAIN';
    };
    const roman = ['I', 'II', 'III', 'IV'];
    const groups = expenses.reduce((result, item) => {
      const group = getGroup(item);
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    }, {});
    const rows = [
      ['RENCANA ANGGARAN BIAYA (AKTUAL PROYEK)'],
      [`PEKERJAAN: ${projectInfo?.nama_proyek || '-'}`],
      [`KLIEN / LOKASI: ${projectInfo?.klien || '-'}`],
      [],
      ['NO', 'URAIAN PEKERJAAN', 'SPESIFIKASI', 'VOL', 'SAT', 'HRG SATUAN (Rp)', 'JMLH HARGA (Rp)', 'BOBOT (%)', 'PROGRESS (%)', 'NOMINAL (Rp)'],
    ];
    const dataRowIndexes = [];
    const subtotalRowIndexes = [];
    let grandTotal = 0;
    let grandNominal = 0;

    Object.entries(groups).forEach(([groupName, items], groupIndex) => {
      rows.push([roman[groupIndex] || String(groupIndex + 1), groupName]);
      let subtotal = 0;
      let subtotalNominal = 0;
      items.forEach((item, itemIndex) => {
        const paid = Number(item.jumlah) || 0;
        const contractValue = Number(item.total_tagihan) > 0 ? Number(item.total_tagihan) : paid;
        const progress = contractValue > 0 ? Math.min(paid / contractValue, 1) : 0;
        subtotal += contractValue;
        subtotalNominal += paid;
        rows.push([
          itemIndex + 1,
          item.keterangan || item.kategori || 'Pengeluaran proyek',
          item.vendor || item.pic || '-',
          1,
          'ls',
          contractValue,
          contractValue,
          0,
          progress,
          paid,
        ]);
        dataRowIndexes.push({ rowIndex: rows.length - 1, contractValue });
      });
      grandTotal += subtotal;
      grandNominal += subtotalNominal;
      rows.push(['', 'Sub Jumlah', '', '', '', '', subtotal, '', '', subtotalNominal]);
      subtotalRowIndexes.push(rows.length - 1);
    });

    const totalProgress = grandTotal > 0 ? grandNominal / grandTotal : 0;
    dataRowIndexes.forEach(({ rowIndex, contractValue }) => { rows[rowIndex][7] = grandTotal > 0 ? contractValue / grandTotal : 0; });
    rows.push(['', 'TOTAL KESELURUHAN', '', '', '', '', grandTotal, 1, totalProgress, grandNominal]);
    const grandTotalRowIndex = rows.length - 1;
    const roundedTotal = Math.round(grandTotal / 1000000) * 1000000;
    rows.push(['', 'PEMBULATAN', '', '', '', '', roundedTotal, 1, totalProgress, grandNominal]);
    const roundedRowIndex = rows.length - 1;

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
      ...Object.keys(groups).map((_, index) => {
        const groupRow = 5 + Object.values(groups).slice(0, index).reduce((sum, items) => sum + items.length + 2, 0);
        return { s: { r: groupRow, c: 1 }, e: { r: groupRow, c: 9 } };
      }),
    ];
    ws['!cols'] = [
      { wch: 7 }, { wch: 42 }, { wch: 28 }, { wch: 10 }, { wch: 9 },
      { wch: 19 }, { wch: 20 }, { wch: 13 }, { wch: 16 }, { wch: 20 },
    ];
    ws['!rows'] = [{ hpt: 24 }, { hpt: 19 }, { hpt: 19 }, { hpt: 8 }, { hpt: 32 }];
    [...dataRowIndexes.map((item) => item.rowIndex), ...subtotalRowIndexes, grandTotalRowIndex, roundedRowIndex].forEach((rowIndex) => {
      ['F', 'G', 'J'].forEach((column) => {
        const cell = ws[`${column}${rowIndex + 1}`];
        if (cell) cell.z = '#,##0.00;[Red](#,##0.00)';
      });
      ['H', 'I'].forEach((column) => {
        const percentageCell = ws[`${column}${rowIndex + 1}`];
        if (percentageCell) percentageCell.z = '0.00%';
      });
    });
    ws['!autofilter'] = { ref: 'A5:J5' };
    const wb = XLSX.utils.book_new();
    wb.Props = { Title: `RAB ${projectInfo?.nama_proyek || 'Proyek'}`, Subject: 'Rencana Anggaran Biaya', Company: 'Virtual Actualize' };
    XLSX.utils.book_append_sheet(wb, ws, "RAB & Bobot");
    XLSX.writeFile(wb, `RAB_Bobot_${projectInfo?.nama_proyek || 'Proyek'}.xlsx`);
  }

  const startEdit = (t) => {
    setIsEditing(true); setEditId(t.id);
    setFormData({ 
      jenis: t.jenis, kategori: t.kategori, jumlah: Math.floor(Number(t.jumlah)).toString(),
      total_tagihan: t.total_tagihan ? Math.floor(Number(t.total_tagihan)).toString() : '0', 
      vendor: t.vendor || '', pic: t.pic || '' 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const cancelEdit = () => {
    setIsEditing(false); setEditId(null);
    setFormData({ jenis: 'Keluar', kategori: '', jumlah: '', total_tagihan: '0', vendor: '', pic: '' });
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData();
    const cleanNumber = (val) => val.toString().replace(/[^0-9]/g, '');
    data.append('project_id', id); 
    data.append('jenis', formData.jenis);
    data.append('kategori', formData.kategori);
    data.append('jumlah', cleanNumber(formData.jumlah));
    data.append('total_tagihan', formData.jenis === 'Masuk' ? '0' : cleanNumber(formData.total_tagihan)); 
    data.append('vendor', formData.vendor);
    data.append('pic', formData.pic);
    data.append('updated_by', userVa?.nama_lengkap || userVa?.username || 'Pengguna tidak diketahui');
    if (file) data.append('bukti', file);
    let url = isEditing ? 'edit_transaction.php' : 'add_transaction.php';
    if (isEditing) data.append('id', editId); 
    axios.post(url, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => { cancelEdit(); setFile(null); fetchData(); }).catch(err => console.error("Error submit:", err));
  }

  const theme = {
    bg: isDarkMode ? '#0a0a0a' : '#f8f9fa',
    text: isDarkMode ? '#f0f0f0' : '#1a1a1a',
    card: isDarkMode ? '#141414' : '#ffffff',
    border: isDarkMode ? '#222222' : '#e9ecef',
    accent: isDarkMode ? '#ffffff' : '#000000'
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Montserrat:wght@200;400;700;800&display=swap');
    body { background-color: ${theme.bg}; color: ${theme.text}; margin: 0; font-family: 'Inter', sans-serif; transition: 0.4s ease; }
    h1 { font-family: 'Montserrat', sans-serif; font-weight: 200; letter-spacing: 12px; text-transform: uppercase; }
    h2, h3, .btn-save, .form-label, .status-btn, .text-icon-btn, .btn-action-luxury { font-family: 'Montserrat', sans-serif; }
    .container-detail { padding: 40px 20px; max-width: 1200px; margin: 0 auto; box-sizing: border-box; }
    .btn-action-luxury { background: ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}; border: 1px solid ${theme.border}; color: ${theme.text}; padding: 10px 18px; border-radius: 12px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 10px; font-weight: 800; letter-spacing: 1px; }
    .btn-action-luxury:hover { background: ${theme.accent}; color: ${isDarkMode ? '#000' : '#fff'}; transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
    .btn-delete-luxury:hover { background: #ff4757 !important; border-color: #ff4757 !important; color: #fff !important; box-shadow: 0 10px 20px rgba(255,71,87,0.3); }
    .card-va { background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 28px; padding: 30px; box-shadow: 0 4px 30px rgba(0,0,0,${isDarkMode ? '0.4' : '0.02'}); }
    .form-label { font-size: 9px; font-weight: 800; letter-spacing: 2px; color: #888; text-transform: uppercase; margin-bottom: 10px; display: block; }
    .transaction-form-grid { display: grid; grid-template-columns: 1fr 1.5fr 1.5fr 1.2fr 1.5fr 1.5fr 1.2fr; gap: 20px; align-items: flex-end; }
    input, select { width: 100%; padding: 14px; border-radius: 12px; border: 1.5px solid ${theme.border}; background: ${isDarkMode ? '#1a1a1a' : '#fff'}; color: ${theme.text}; font-size: 13px; outline:none; box-sizing: border-box; transition: 0.3s; }
    .btn-save { background: ${theme.accent}; color: ${isDarkMode ? '#000' : '#fff'}; border: none; border-radius: 12px; height: 50px; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; transition: 0.3s; cursor: pointer; }
    .table-va { font-family: 'Inter', sans-serif; width: 100%; border-collapse: collapse; min-width: 800px; font-size: 13px; }
    th { text-align: left; padding: 22px 25px; font-size: 11px; color: #888; border-bottom: 1px solid ${theme.border}; background: ${isDarkMode ? '#1a1a1a' : '#fafafa'}; font-family: 'Montserrat'; letter-spacing: 1px; }
    td { padding: 25px; border-bottom: 1px solid ${theme.border}; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; margin-top: 15px; }
    .gallery-item { aspect-ratio: 1/1; border-radius: 20px; overflow: hidden; position: relative; border: 1px solid ${theme.border}; background: ${isDarkMode ? '#000' : '#f0f0f0'}; transition: 0.4s; }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
    .delete-photo-btn { position: absolute; top: 10px; right: 10px; background: #ff4757; color: white; border: none; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 5; }
    .status-btn { border: 1px solid ${theme.border}; padding: 10px 22px; border-radius: 50px; font-size: 10px; cursor: pointer; font-weight: 800; transition: 0.3s; background: none; color: ${theme.text}; }
    .weighted-progress-track { width: 100%; height: 14px; border-radius: 999px; background: ${isDarkMode ? '#242424' : '#eceff1'}; overflow: hidden; }
    .weighted-progress-fill { height: 100%; border-radius: inherit; background: ${theme.accent}; transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
    @media print { @page { size: A4; margin: 1cm; } body { background: white !important; color: black !important; } .no-print, .top-nav, button, form, .gallery-grid, input[type="file"], .btn-action-luxury { display: none !important; } .container-detail { padding: 0; width: 100%; } .card-va { box-shadow: none !important; border: none !important; padding: 10px 0 !important; background: white !important; } .stats-wrapper { display: flex !important; flex-wrap: wrap !important; gap: 15px !important; margin-bottom: 30px !important; } .stats-wrapper .card-va { border: 1px solid #eee !important; border-radius: 15px !important; padding: 15px !important; flex: 1 !important; } .table-va { font-size: 10px !important; width: 100% !important; border: 1px solid #eee !important; color: black !important; } th { background: #f9f9f9 !important; color: #000 !important; border-bottom: 2px solid #333 !important; } td { padding: 10px !important; border-bottom: 1px solid #eee !important; color: black !important; } h1 { font-size: 22px !important; letter-spacing: 8px !important; margin-bottom: 5px !important; color: black !important; } p { color: black !important; } }
    .table-container { width: 100%; overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
    .table-scroll-hint { display: none; }
    .top-nav-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
    @media (max-width: 900px) { .container-detail { padding: 20px 14px 35px; } .stats-wrapper { flex-direction: column !important; } .grid-cards { grid-template-columns: 1fr !important; } .top-nav { flex-direction: column; align-items: stretch !important; gap: 15px; position: static !important; padding: 14px !important; } .top-nav-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); } .transaction-form-grid { grid-template-columns: 1fr !important; } .table-scroll-hint { display: block; padding: 0 4px 10px; color: #888; font-size: 10px; } .card-va { padding: 22px 18px; border-radius: 20px; } }
    @media (max-width: 520px) { .top-nav-actions { grid-template-columns: 1fr; } .gallery-grid { grid-template-columns: 1fr; } .stats-wrapper p { font-size: 20px !important; overflow-wrap: anywhere; } }
  `;

  if (loading || !projectInfo) return <div style={{ background: theme.bg, height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: theme.text }}>MENYINKRONKAN...</div>;

  return (
    <div className="container-detail">
      <style>{styles}</style>
      
      {/* HIDDEN INPUT FOR EXCEL IMPORT */}
      <input type="file" ref={fileInputRef} onChange={handleImportExcel} style={{ display: 'none' }} accept=".xlsx, .xls" />

      <div className="top-nav no-print" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px', background: isDarkMode?'rgba(20,20,20,0.8)':'rgba(255,255,255,0.8)', padding:'15px 25px', borderRadius:'20px', border:`1px solid ${theme.border}`, position:'sticky', top:'10px', zIndex:1000, backdropFilter:'blur(10px)'}}>
        <Link to="/" className="btn-action-luxury">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'8px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            BERANDA
        </Link>
        <div className="top-nav-actions">
            <button onClick={downloadImportTemplate} className="btn-action-luxury">TEMPLATE EXCEL</button>
            <button onClick={() => fileInputRef.current.click()} className="btn-action-luxury" style={{ background: '#27ae60', color: '#fff', border: 'none' }}>IMPOR EXCEL</button>
            <button onClick={exportToExcel} className="btn-action-luxury">EKSPOR EXCEL</button>
            <button onClick={() => window.print()} className="btn-action-luxury" style={{background:theme.accent, color:isDarkMode?'#000':'#fff', border:'none'}}>CETAK ARSIP</button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '32px', margin: '0' }}>{projectInfo?.nama_proyek}</h1>
        <p style={{ fontSize: '10px', color: '#888', letterSpacing: '6px', textTransform: 'uppercase', marginTop: '15px' }}>Audit Finansial • KLIEN: {projectInfo?.klien?.toUpperCase()}</p>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '30px' }}>
            {['Perencanaan', 'Berjalan', 'Selesai'].map(status => (
                <button key={status} onClick={() => handleUpdateStatus(status)} className="status-btn"
                  style={{ backgroundColor: projectInfo?.status === status ? theme.accent : 'transparent', color: projectInfo?.status === status ? (isDarkMode?'#000':'#fff') : theme.text }}>
                  {status.toUpperCase()}
                </button>
            ))}
        </div>
      </div>

      <div className="card-va" style={{ marginBottom: '30px' }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'20px', marginBottom:'16px', flexWrap:'wrap'}}>
          <div>
            <span className="form-label">Progress Proyek Berdasarkan Bobot</span>
            <div style={{fontSize:'11px', color:'#888'}}>{weightedItems.length} item RAB berbobot</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'Montserrat', fontSize:'28px', fontWeight:'800'}}>{weightedProgressPercent.toLocaleString('id-ID', {minimumFractionDigits:2, maximumFractionDigits:2})}%</div>
            <div style={{fontSize:'10px', color:'#888'}}>Rp {weightedNominal.toLocaleString('id-ID')} / Rp {weightedRabTotal.toLocaleString('id-ID')}</div>
          </div>
        </div>
        <div className="weighted-progress-track" role="progressbar" aria-label="Progress proyek berdasarkan bobot" aria-valuemin="0" aria-valuemax="100" aria-valuenow={weightedProgressPercent}>
          <div className="weighted-progress-fill" style={{width:`${weightedProgressPercent}%`}} />
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginTop:'9px', fontSize:'9px', fontWeight:'700', color:'#888'}}>
          <span>0%</span><span>BOBOT × PROGRESS ITEM</span><span>100%</span>
        </div>
      </div>

      <div className="stats-wrapper" style={{display:'flex', gap:'25px', marginBottom:'40px'}}>
        <div className="grid-cards" style={{flex:1.5, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'15px'}}>
            <div className="card-va"><span className="form-label" style={{color: '#2ecc71'}}>Pemasukan</span><p style={{fontSize:'24px', color:'#2ecc71', fontWeight:'800', margin:0}}>Rp {totalMasuk.toLocaleString('id-ID')}</p></div>
            <div className="card-va" style={{ background: '#3498db', color: '#fff', border: 'none' }}><span className="form-label" style={{color:'#fff', opacity:0.8}}>Piutang</span><p style={{ fontSize: '24px', fontWeight: '800', margin:0 }}>Rp {sisaPiutangOwner.toLocaleString('id-ID')}</p></div>
            <div className="card-va"><span className="form-label" style={{color:'#e67e22'}}>Hutang Vendor</span><p style={{fontSize:'24px', color:'#e67e22', fontWeight:'800', margin:0}}>Rp {totalHutangVendor.toLocaleString('id-ID')}</p></div>
            <div className="card-va" style={{ background: isDarkMode ? '#fff' : '#1a1a1a', color: isDarkMode ? '#000' : '#fff', border: 'none' }}><span className="form-label" style={{color:'inherit', opacity:0.6}}>Sisa Anggaran</span><p style={{ fontSize: '24px', fontWeight: '800', margin:0 }}>Rp {sisaSaldoProject.toLocaleString('id-ID')}</p></div>
        </div>

        <div className="card-va" style={{ flex: 1, display: 'flex', flexDirection:'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke={isDarkMode ? '#222' : '#f0f0f0'} strokeWidth="10" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke={expensePercent > 90 ? '#e74c3c' : '#2ecc71'} strokeWidth="10" 
                        strokeDasharray="251.2" strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: '1.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '15px', fontWeight: '800', fontFamily: 'Montserrat' }}>{Math.round(expensePercent)}%</div>
            </div>
            <div style={{textAlign:'center'}}>
                <span className="form-label">Kondisi Anggaran</span>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: '900', color: expensePercent > 100 ? '#e74c3c' : '#2ecc71', letterSpacing:'1.5px', fontFamily:'Montserrat' }}>
                    {expensePercent > 100 ? '⚠️ MELEBIHI ANGGARAN' : '✅ SESUAI RENCANA'}
                </p>
            </div>
        </div>
      </div>

      <div className="card-va no-print" style={{ marginBottom: '40px' }}>
        <span className="form-label">Dokumentasi Progres ({progressFotos.length})</span>
        <form onSubmit={handleUploadProgress} style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <input type="file" onChange={e => setFotoProgress(e.target.files[0])} style={{ flex: 1, minWidth: '200px' }} />
          <input placeholder="Keterangan progress..." value={ketProgress} onChange={e => setKetProgress(e.target.value)} style={{ flex: 2, minWidth: '200px' }} />
          <button type="submit" className="btn-save" style={{ padding: '0 35px' }}>Unggah Progres</button>
        </form>
        <div className="gallery-grid">
          {progressFotos.map(foto => (
            <div key={foto.id} className="gallery-item">
              <button className="delete-photo-btn" onClick={() => handleDeleteProgress(foto.id)}>✕</button>
              <img src={apiAssetUrl(`uploads/${foto.foto_path || foto.foto}`)} alt="progress" onClick={() => setSelectedImage(apiAssetUrl(`uploads/${foto.foto_path || foto.foto}`))} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '10px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '9px', fontWeight: '600' }}>{foto.keterangan}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-va no-print" style={{marginBottom: '40px'}}>
        <span className="form-label">{isEditing ? "✎ Edit Detail Transaksi" : "+ Catat Transaksi Baru"}</span>
        <form onSubmit={handleSubmit} className="transaction-form-grid">
          <div><label className="form-label">Jenis</label><select value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value})}><option value="Keluar">Pengeluaran</option><option value="Masuk">Pemasukan</option></select></div>
          <div><label className="form-label">Vendor</label><input placeholder="Nama vendor" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} /></div>
          <div><label className="form-label">Kelompok Deskripsi</label>
            <select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})}>
                <option value="">Pilih Kelompok</option>
                <option value="Material">Material</option>
                <option value="Subcon">Subcon / Vendor</option>
                <option value="Upah">Upah / Pegawai</option>
                <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div><label className="form-label">PIC</label><input placeholder="Nama PIC" value={formData.pic} onChange={e => setFormData({...formData, pic: e.target.value})} /></div>
          <div><label className="form-label">Tagihan (Rp)</label><input placeholder="0" value={formatNumber(formData.total_tagihan)} onChange={(e) => handleAmountChange(e, 'total_tagihan')} disabled={formData.jenis === 'Masuk'} /></div>
          <div><label className="form-label">Dibayar (Rp)</label><input placeholder="0" value={formatNumber(formData.jumlah)} onChange={(e) => handleAmountChange(e, 'jumlah')} style={{fontWeight:'800'}} /></div>
          <div><label className="form-label">Lampiran</label><input type="file" onChange={e => setFile(e.target.files[0])} style={{border:'none', fontSize:'10px', paddingTop:'12px'}} /></div>
          <button type="submit" className="btn-save">{isEditing ? "Perbarui" : "Simpan"}</button>
        </form>
        {isEditing && <button onClick={cancelEdit} style={{marginTop:'15px', background:'none', border:`1px solid ${theme.border}`, color:theme.text, padding:'10px', borderRadius:'10px', width:'100%', fontSize:'10px', cursor:'pointer'}}>Batal Mengedit</button>}
      </div>

      <div className="table-scroll-hint">Geser tabel ke samping untuk melihat semua kolom.</div>
      <div className="table-container" style={{background:theme.card, borderRadius:'28px', border:`1px solid ${theme.border}`}}>
        <table className="table-va">
            <thead><tr><th>TANGGAL</th><th>DETAIL & OTORISASI</th><th style={{textAlign:'right'}}>JUMLAH</th><th style={{textAlign:'right'}}>SISA HUTANG</th><th className="no-print" style={{textAlign:'center'}}>AKSI</th></tr></thead>
            <tbody>
                {transaksi.map(t => (
                    <tr key={t.id}>
                        <td style={{fontSize:'11px', color:'#888', fontWeight:'500'}}>{t.tanggal}</td>
                        <td>
                          <div style={{fontWeight:'700', fontSize:'14px'}}>
                            {t.vendor || t.keterangan || "SISTEM PENGGAJIAN"}
                          </div>
                          <div style={{fontSize:'11px', color:'#666', marginTop:'4px'}}>
                            {t.kategori || "Payroll Disbursement"} {t.pic ? `• PIC: ${t.pic}` : ''}
                          </div>
                          <div style={{fontSize:'9px', color:'#888', marginTop:'6px'}}>
                            Update terakhir: {t.last_updated_by || 'Belum pernah diperbarui'}{t.last_updated_at ? ` • ${new Date(t.last_updated_at.replace(' ', 'T')).toLocaleString('id-ID')}` : ''}
                          </div>
                        </td>
                        <td style={{textAlign:'right', fontWeight:'800', color: t.jenis?.toLowerCase().includes('masuk') ? '#2ecc71' : (isDarkMode ? '#f0f0f0' : '#1a1a1a')}}>
                          {t.jenis?.toLowerCase().includes('masuk') ? '+' : '-'} {Number(t.jumlah).toLocaleString('id-ID')}
                        </td>
                        <td style={{textAlign:'right', color:'#e67e22', fontWeight:'700'}}>
                          {t.jenis?.toLowerCase().includes('keluar') && (parseFloat(t.total_tagihan)-parseFloat(t.jumlah)) > 0 ? (parseFloat(t.total_tagihan)-parseFloat(t.jumlah)).toLocaleString('id-ID') : '—'}
                        </td>
                        <td className="no-print" style={{textAlign:'center'}}>
                          <div style={{display:'flex', gap:'8px', justifyContent:'center'}}>
                            <button className="btn-action-luxury" onClick={() => openStackModal(t.id)} title="Lihat bukti">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </button>
                            <button className="btn-action-luxury" onClick={() => startEdit(t)} title="Edit transaksi">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <select aria-label={`Status transaksi ${t.id}`} title="Perbarui status transaksi" value={t.status_pembayaran || 'Lunas'} onChange={(e) => handleTransactionStatus(t.id, e.target.value)} style={{width:'120px', padding:'8px', borderRadius:'10px', border:`1px solid ${theme.border}`, background:theme.card, color:theme.text, fontSize:'10px', fontWeight:'800'}}>
                              <option value="Lunas">Lunas</option><option value="Belum Lunas">Belum Lunas</option><option value="Sebagian">Sebagian</option><option value="Dibatalkan">Dibatalkan</option>
                            </select>
                          </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {showStackModal && (
        <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.85)', zIndex:10000, display:'flex', justifyContent:'center', alignItems:'center', backdropFilter:'blur(15px)' }} onClick={() => setShowStackModal(false)}>
            <div className="card-va" style={{ width:'95%', maxWidth:'500px' }} onClick={e => e.stopPropagation()}>
                <span className="form-label">Bukti Transaksi</span>
                <div style={{display:'flex', gap:'12px', margin:'25px 0'}}>
                    <input type="file" onChange={e => setNewStackFile(e.target.files[0])} style={{fontSize:'11px'}} />
                    <button onClick={handleAddStackProof} className="btn-save" style={{padding:'0 25px'}}>Tambah</button>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'15px'}}>
                    {stackFiles && stackFiles.length > 0 ? stackFiles.map(s => (
                        <div key={s.id} className="gallery-item">
                             <button className="delete-photo-btn" onClick={() => handleDeleteStackProof(s.id)} style={{width:'20px', height:'20px', fontSize:'8px'}}>✕</button>
                             <img src={apiAssetUrl(`uploads/${s.file_path || s.bukti || s.file}`)} alt="proof" onClick={() => setSelectedImage(apiAssetUrl(`uploads/${s.file_path || s.bukti || s.file}`))} />
                        </div>
                    )) : <p style={{gridColumn:'span 3', textAlign:'center', color:'#888', fontSize:'12px'}}>Belum ada bukti transfer.</p>}
                </div>
                <button onClick={() => setShowStackModal(false)} style={{width:'100%', marginTop:'25px', cursor:'pointer'}} className="btn-action-luxury">TUTUP</button>
            </div>
        </div>
      )}

      {selectedImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, backdropFilter:'blur(10px)' }} onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Fullscreen" style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: '20px' }} />
        </div>
      )}
    </div>
  )
}

export default ProjectDetail;
