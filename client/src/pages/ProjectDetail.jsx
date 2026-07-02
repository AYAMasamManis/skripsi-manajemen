import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
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
        axios.get(`http://localhost/skripsi-manajemen/api/get_projects.php?t=${timestamp}`),
        axios.get(`http://localhost/skripsi-manajemen/api/get_transactions.php?project_id=${id}&t=${timestamp}`),
        axios.get(`http://localhost/skripsi-manajemen/api/get_progress.php?project_id=${id}&t=${timestamp}`)
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
        const data = XLSX.utils.sheet_to_json(ws);

        for (const row of data) {
          // Hanya proses baris yang memiliki nomor urut (menghindari baris "Grand Total")
          if (!row.No || isNaN(row.No)) continue;

          const bulkData = new FormData();
          bulkData.append('project_id', id); // JANGKAR: Mengunci ke proyek aktif
          bulkData.append('jenis', 'Keluar');
          bulkData.append('pic', 'Excel Import');
          
          // Deteksi apakah ini data Upah atau Material berdasarkan kolom Nama
          if (row.Nama) {
            bulkData.append('kategori', 'Upah');
            bulkData.append('vendor', row.Nama);
            
            // Kalkulasi: Pokok + Beras/Air + Lemburan
            const totalDasar = Number(row.Total || 0); 
            const berasAir = Number(row['Beras & Air'] || 0);
            const lemburan = Number(row.Lemburan || 0);
            const grandTotalRow = totalDasar + berasAir + lemburan;
            
            bulkData.append('jumlah', grandTotalRow);
            bulkData.append('total_tagihan', grandTotalRow);
          }

          await axios.post('http://localhost/skripsi-manajemen/api/add_transaction.php', bulkData);
        }
        alert("Import Data Berhasil! 🚀");
        fetchData();
      } catch (err) {
        alert("Gagal membaca file Excel. Pastikan format kolom sesuai.");
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
      const res = await axios.get(`http://localhost/skripsi-manajemen/api/get_transaction_proofs.php?transaction_id=${tId}&t=${Date.now()}`);
      setStackFiles(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("Gagal ambil stack:", err); }
  }

  const handleAddStackProof = async () => {
    if (!newStackFile) return alert("Pilih file dulu!");
    const data = new FormData();
    data.append('transaction_id', activeTransId);
    data.append('bukti', newStackFile);
    try {
      await axios.post('http://localhost/skripsi-manajemen/api/add_transaction_proof.php', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewStackFile(null);
      const res = await axios.get(`http://localhost/skripsi-manajemen/api/get_transaction_proofs.php?transaction_id=${activeTransId}&t=${Date.now()}`);
      setStackFiles(Array.isArray(res.data) ? res.data : []);
    } catch { alert("Gagal upload"); }
  }

  const handleDeleteStackProof = async (proofId) => {
    if (proofId && window.confirm("Hapus bukti transfer ini?")) {
      await axios.post('http://localhost/skripsi-manajemen/api/delete_transaction_proof.php', { id: proofId });
      const res = await axios.get(`http://localhost/skripsi-manajemen/api/get_transaction_proofs.php?transaction_id=${activeTransId}&t=${Date.now()}`);
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
    axios.post('http://localhost/skripsi-manajemen/api/upload_progress.php', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => {
        setFotoProgress(null); setKetProgress(''); fetchData(); 
        alert("Progress Uploaded! 🚀");
    }).catch(err => { alert("Gagal upload progress"); console.error(err); });
  };

  const handleDeleteProgress = (fotoId) => {
    if (window.confirm("Hapus foto progress ini?")) {
      axios.post('http://localhost/skripsi-manajemen/api/delete_progress.php', { id: fotoId }).then(() => fetchData());
    }
  };

  const handleDeleteTransaction = (transactionId) => {
    if (window.confirm("Hapus transaksi ini secara permanen?")) {
      axios.post('http://localhost/skripsi-manajemen/api/delete_transaction.php', { id: transactionId }).then(() => { cancelEdit(); fetchData(); });
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

  const handleUpdateStatus = (newStatus) => {
    axios.post('http://localhost/skripsi-manajemen/api/update_status.php', { id, status: newStatus }).then(() => fetchData());
  }

  const exportToExcel = () => {
    if (!transaksi || transaksi.length === 0) {
      alert("Tidak ada data untuk diekspor");
      return;
    }

    const data = transaksi.map(t => ({
      Tanggal: t.tanggal,
      Vendor: t.vendor || t.keterangan || "PAYROLL SYSTEM",
      Kategori: t.kategori || "Payroll Disbursement",
      PIC: t.pic || "-",
      Jenis: t.jenis,
      Jumlah: Number(t.jumlah),
      Total_Tagihan: Number(t.total_tagihan) || 0,
      Hutang_Sisa: t.jenis?.toLowerCase().includes('keluar') && (parseFloat(t.total_tagihan) - parseFloat(t.jumlah)) > 0 ? (parseFloat(t.total_tagihan) - parseFloat(t.jumlah)) : 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `${projectInfo?.nama_proyek}_Transactions.xlsx`);
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
    if (file) data.append('bukti', file);
    let url = isEditing ? 'http://localhost/skripsi-manajemen/api/edit_transaction.php' : 'http://localhost/skripsi-manajemen/api/add_transaction.php';
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
    @media print { @page { size: A4; margin: 1cm; } body { background: white !important; color: black !important; } .no-print, .top-nav, button, form, .gallery-grid, input[type="file"], .btn-action-luxury { display: none !important; } .container-detail { padding: 0; width: 100%; } .card-va { box-shadow: none !important; border: none !important; padding: 10px 0 !important; background: white !important; } .stats-wrapper { display: flex !important; flex-wrap: wrap !important; gap: 15px !important; margin-bottom: 30px !important; } .stats-wrapper .card-va { border: 1px solid #eee !important; border-radius: 15px !important; padding: 15px !important; flex: 1 !important; } .table-va { font-size: 10px !important; width: 100% !important; border: 1px solid #eee !important; color: black !important; } th { background: #f9f9f9 !important; color: #000 !important; border-bottom: 2px solid #333 !important; } td { padding: 10px !important; border-bottom: 1px solid #eee !important; color: black !important; } h1 { font-size: 22px !important; letter-spacing: 8px !important; margin-bottom: 5px !important; color: black !important; } p { color: black !important; } }
    @media (max-width: 900px) { .stats-wrapper { flex-direction: column !important; } .grid-cards { grid-template-columns: 1fr !important; } .top-nav { flex-direction: column; gap: 15px; position: static; } .transaction-form-grid { grid-template-columns: 1fr !important; } .table-container { overflow-x: auto; } }
  `;

  if (loading || !projectInfo) return <div style={{ background: theme.bg, height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: theme.text }}>SYNCING...</div>;

  return (
    <div className="container-detail">
      <style>{styles}</style>
      
      {/* HIDDEN INPUT FOR EXCEL IMPORT */}
      <input type="file" ref={fileInputRef} onChange={handleImportExcel} style={{ display: 'none' }} accept=".xlsx, .xls" />

      <div className="top-nav no-print" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px', background: isDarkMode?'rgba(20,20,20,0.8)':'rgba(255,255,255,0.8)', padding:'15px 25px', borderRadius:'20px', border:`1px solid ${theme.border}`, position:'sticky', top:'10px', zIndex:1000, backdropFilter:'blur(10px)'}}>
        <Link to="/" className="btn-action-luxury">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:'8px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            DASHBOARD
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => fileInputRef.current.click()} className="btn-action-luxury" style={{ background: '#27ae60', color: '#fff', border: 'none' }}>IMPORT EXCEL</button>
            <button onClick={exportToExcel} className="btn-action-luxury">EXPORT EXCEL</button>
            <button onClick={() => window.print()} className="btn-action-luxury" style={{background:theme.accent, color:isDarkMode?'#000':'#fff', border:'none'}}>PRINT ARCHIVE</button>
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

      <div className="stats-wrapper" style={{display:'flex', gap:'25px', marginBottom:'40px'}}>
        <div className="grid-cards" style={{flex:1.5, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'15px'}}>
            <div className="card-va"><span className="form-label" style={{color: '#2ecc71'}}>Income</span><p style={{fontSize:'24px', color:'#2ecc71', fontWeight:'800', margin:0}}>Rp {totalMasuk.toLocaleString('id-ID')}</p></div>
            <div className="card-va" style={{ background: '#3498db', color: '#fff', border: 'none' }}><span className="form-label" style={{color:'#fff', opacity:0.8}}>Receivable</span><p style={{ fontSize: '24px', fontWeight: '800', margin:0 }}>Rp {sisaPiutangOwner.toLocaleString('id-ID')}</p></div>
            <div className="card-va"><span className="form-label" style={{color:'#e67e22'}}>Vendor Debt</span><p style={{fontSize:'24px', color:'#e67e22', fontWeight:'800', margin:0}}>Rp {totalHutangVendor.toLocaleString('id-ID')}</p></div>
            <div className="card-va" style={{ background: isDarkMode ? '#fff' : '#1a1a1a', color: isDarkMode ? '#000' : '#fff', border: 'none' }}><span className="form-label" style={{color:'inherit', opacity:0.6}}>Rem. Budget</span><p style={{ fontSize: '24px', fontWeight: '800', margin:0 }}>Rp {sisaSaldoProject.toLocaleString('id-ID')}</p></div>
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
                <span className="form-label">Budget Health</span>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: '900', color: expensePercent > 100 ? '#e74c3c' : '#2ecc71', letterSpacing:'1.5px', fontFamily:'Montserrat' }}>
                    {expensePercent > 100 ? '⚠️ OVER BUDGET' : '✅ ON TRACK'}
                </p>
            </div>
        </div>
      </div>

      <div className="card-va no-print" style={{ marginBottom: '40px' }}>
        <span className="form-label">Progress Documentation ({progressFotos.length})</span>
        <form onSubmit={handleUploadProgress} style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <input type="file" onChange={e => setFotoProgress(e.target.files[0])} style={{ flex: 1, minWidth: '200px' }} />
          <input placeholder="Keterangan progress..." value={ketProgress} onChange={e => setKetProgress(e.target.value)} style={{ flex: 2, minWidth: '200px' }} />
          <button type="submit" className="btn-save" style={{ padding: '0 35px' }}>Upload Progress</button>
        </form>
        <div className="gallery-grid">
          {progressFotos.map(foto => (
            <div key={foto.id} className="gallery-item">
              <button className="delete-photo-btn" onClick={() => handleDeleteProgress(foto.id)}>✕</button>
              <img src={`http://localhost/skripsi-manajemen/api/uploads/${foto.foto_path || foto.foto}`} alt="progress" onClick={() => setSelectedImage(`http://localhost/skripsi-manajemen/api/uploads/${foto.foto_path || foto.foto}`)} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '10px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '9px', fontWeight: '600' }}>{foto.keterangan}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-va no-print" style={{marginBottom: '40px'}}>
        <span className="form-label">{isEditing ? "✎ Edit Transaction Details" : "+ Register New Transaction"}</span>
        <form onSubmit={handleSubmit} className="transaction-form-grid">
          <div><label className="form-label">Category</label><select value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value})}><option value="Keluar">Expense</option><option value="Masuk">Income</option></select></div>
          <div><label className="form-label">Vendor</label><input placeholder="Name" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} /></div>
          <div><label className="form-label">Description Group</label>
            <select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})}>
                <option value="">Select Group</option>
                <option value="Material">Material</option>
                <option value="Subcon">Subcon / Vendor</option>
                <option value="Upah">Upah / Pegawai</option>
                <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div><label className="form-label">PIC</label><input placeholder="Name" value={formData.pic} onChange={e => setFormData({...formData, pic: e.target.value})} /></div>
          <div><label className="form-label">Invoice (Rp)</label><input placeholder="0" value={formatNumber(formData.total_tagihan)} onChange={(e) => handleAmountChange(e, 'total_tagihan')} disabled={formData.jenis === 'Masuk'} /></div>
          <div><label className="form-label">Paid (Rp)</label><input placeholder="0" value={formatNumber(formData.jumlah)} onChange={(e) => handleAmountChange(e, 'jumlah')} style={{fontWeight:'800'}} /></div>
          <div><label className="form-label">Attach</label><input type="file" onChange={e => setFile(e.target.files[0])} style={{border:'none', fontSize:'10px', paddingTop:'12px'}} /></div>
          <button type="submit" className="btn-save">{isEditing ? "Update" : "Post"}</button>
        </form>
        {isEditing && <button onClick={cancelEdit} style={{marginTop:'15px', background:'none', border:`1px solid ${theme.border}`, color:theme.text, padding:'10px', borderRadius:'10px', width:'100%', fontSize:'10px', cursor:'pointer'}}>Cancel Editing</button>}
      </div>

      <div className="table-container" style={{background:theme.card, borderRadius:'28px', border:`1px solid ${theme.border}`, overflow:'hidden'}}>
        <table className="table-va">
            <thead><tr><th>DATE</th><th>DETAILS & AUTHORIZATION</th><th style={{textAlign:'right'}}>AMOUNT</th><th style={{textAlign:'right'}}>REMAINING DEBT</th><th className="no-print" style={{textAlign:'center'}}>MANAGEMENT</th></tr></thead>
            <tbody>
                {transaksi.map(t => (
                    <tr key={t.id}>
                        <td style={{fontSize:'11px', color:'#888', fontWeight:'500'}}>{t.tanggal}</td>
                        <td>
                          <div style={{fontWeight:'700', fontSize:'14px'}}>
                            {t.vendor || t.keterangan || "PAYROLL SYSTEM"}
                          </div>
                          <div style={{fontSize:'11px', color:'#666', marginTop:'4px'}}>
                            {t.kategori || "Payroll Disbursement"} {t.pic ? `• PIC: ${t.pic}` : ''}
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
                            <button className="btn-action-luxury" onClick={() => openStackModal(t.id)} title="View Proofs">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </button>
                            <button className="btn-action-luxury" onClick={() => startEdit(t)} title="Edit">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="btn-action-luxury btn-delete-luxury" onClick={() => handleDeleteTransaction(t.id)} title="Delete" style={{ color:'#ff4757', border:'1.5px solid rgba(255,71,87,0.2)'}}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
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
                <span className="form-label">Transaction Proofs</span>
                <div style={{display:'flex', gap:'12px', margin:'25px 0'}}>
                    <input type="file" onChange={e => setNewStackFile(e.target.files[0])} style={{fontSize:'11px'}} />
                    <button onClick={handleAddStackProof} className="btn-save" style={{padding:'0 25px'}}>Add</button>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'15px'}}>
                    {stackFiles && stackFiles.length > 0 ? stackFiles.map(s => (
                        <div key={s.id} className="gallery-item">
                             <button className="delete-photo-btn" onClick={() => handleDeleteStackProof(s.id)} style={{width:'20px', height:'20px', fontSize:'8px'}}>✕</button>
                             <img src={`http://localhost/skripsi-manajemen/api/uploads/${s.file_path || s.bukti || s.file}`} alt="proof" onClick={() => setSelectedImage(`http://localhost/skripsi-manajemen/api/uploads/${s.file_path || s.bukti || s.file}`)} />
                        </div>
                    )) : <p style={{gridColumn:'span 3', textAlign:'center', color:'#888', fontSize:'12px'}}>Belum ada bukti transfer.</p>}
                </div>
                <button onClick={() => setShowStackModal(false)} style={{width:'100%', marginTop:'25px', cursor:'pointer'}} className="btn-action-luxury">CLOSE</button>
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