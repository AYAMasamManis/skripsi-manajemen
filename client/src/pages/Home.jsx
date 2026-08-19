import { useEffect, useState, useCallback, useRef } from 'react'
import axios from '../config/api'
import { Link, useNavigate } from 'react-router-dom'
import CashFlowChart from '../components/CashFlowChart' 
import ProjectPayChart from '../components/ProjectPayChart'
import * as XLSX from 'xlsx';

function Home() {
  const [proyek, setProyek] = useState([])
  const [semuaTransaksi, setSemuaTransaksi] = useState([]) 
  const [projectPayData, setProjectPayData] = useState([])
  const [stats, setStats] = useState({ total_projects: 0, active_projects: 0, total_balance: 0, total_debt: 0, total_income: 0, total_expense: 0, completed_profit: 0 });
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ nama_proyek: '', klien: '', budget_total: '', tanggal_mulai: '', tanggal_target: '' })
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('nightMode') === 'true');
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ id: '', nama_proyek: '', klien: '', budget_total: '', status: '', tanggal_mulai: '', tanggal_target: '', tanggal_selesai: '', progress_percent: 0 });
  const [showBudgetHistory, setShowBudgetHistory] = useState(false);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [historyProject, setHistoryProject] = useState(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  const userVa = JSON.parse(localStorage.getItem('user_va'));
  const navigate = useNavigate();

  // Pastikan role di database adalah 'admin', 'bos', atau 'owner' (huruf kecil)
  const hasFullAccess = ['admin', 'bos', 'owner'].includes(String(userVa?.role || '').toLowerCase());

  const toggleNightMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('nightMode', newMode);
  };

  const fetchData = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const [resProyek, resTransaksi, resStats, resProjectPay] = await Promise.all([
        axios.get(`get_projects.php?t=${timestamp}`),
        axios.get(`get_transactions.php?global=true&t=${timestamp}`),
        axios.get(`get_statistics.php?t=${timestamp}`),
        axios.get(`get_project_pay_chart.php?t=${timestamp}`)
      ]);
      
      // Proteksi agar data selalu berupa array/object yang valid
      setProyek(Array.isArray(resProyek.data) ? resProyek.data : []);
      setSemuaTransaksi(Array.isArray(resTransaksi.data) ? resTransaksi.data : []);
      setStats(resStats.data || { total_projects: 0, active_projects: 0, total_balance: 0, total_debt: 0, total_income: 0, total_expense: 0, completed_profit: 0 });
      setProjectPayData(Array.isArray(resProjectPay.data) ? resProjectPay.data : []);
      
      setLoading(false);
    } catch (err) {
      console.error("Gagal memuat data:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    if (!userVa) navigate('/login');
    else {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [userVa, navigate, fetchData])

  const formatNumber = (num) => num ? num.toString().split('.')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";

  const hitungPersen = (project) => Math.max(0, Math.min(100, Number(project?.progress_percent || 0)));

  const timeStatus = (project) => {
    if (project.status === 'Selesai') return { label: `Selesai ${project.tanggal_selesai || ''}`.trim(), color: '#27ae60' };
    if (!project.tanggal_target) return { label: 'Target belum diatur', color: theme.mutedText };
    const overdue = new Date(`${project.tanggal_target}T23:59:59`) < new Date();
    return { label: `${overdue ? 'Terlambat' : 'Target'} ${project.tanggal_target}`, color: overdue ? '#e74c3c' : '#e67e22' };
  };

  const handleChange = (e) => { 
    const { name, value } = e.target;
    if (name === 'budget_total') {
      const rawValue = value.replace(/\./g, '');
      if (!isNaN(rawValue)) setFormData({ ...formData, [name]: rawValue });
    } else setFormData({ ...formData, [name]: value });
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    axios.post('add_project.php', { ...formData, changed_by: userVa?.nama_lengkap || userVa?.username || 'Bos' })
      .then(() => {
        setFormData({ nama_proyek: '', klien: '', budget_total: '', tanggal_mulai: '', tanggal_target: '' })
        fetchData()
      })
  }

  const handleEditClick = (p) => {
    const cleanBudget = p.budget_total.toString().split('.')[0];
    setEditData({ 
        id: p.id, 
        nama_proyek: p.nama_proyek, 
        klien: p.klien, 
        budget_total: cleanBudget, 
        status: p.status || 'Perencanaan', tanggal_mulai: p.tanggal_mulai || '', tanggal_target: p.tanggal_target || '', tanggal_selesai: p.tanggal_selesai || '', progress_percent: Number(p.progress_percent || 0)
    });
    setShowEditModal(true);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const finalData = { ...editData, budget_total: editData.budget_total.toString().replace(/\./g, ''), changed_by: userVa?.nama_lengkap || userVa?.username || 'Bos' };
    axios.post('update_project.php', finalData)
      .then(() => {
        alert("Proyek Berhasil Diupdate!");
        setShowEditModal(false);
        fetchData();
      })
      .catch(err => alert("Gagal update: " + err));
  };

  const handleDelete = (id) => {
    if (window.confirm("Hapus proyek secara permanen?")) {
      axios.post('delete_project.php', { id }).then(() => fetchData())
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user_va');
    navigate('/login');
  }

  const exportToExcel = () => {
    const dataPersiapan = proyek.map(p => ({
      "ID PROYEK": `VA-0${p.id}`, "NAMA PROYEK": p.nama_proyek, "KLIEN": p.klien, "STATUS": p.status || 'Perencanaan', "TOTAL KONTRAK (IDR)": Number(p.budget_total), "TANGGAL DAFTAR": p.created_at || '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataPersiapan);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Portofolio");
    XLSX.writeFile(workbook, `VA_Portofolio_${new Date().getFullYear()}.xlsx`);
  };

  const downloadProjectTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['NAMA PROYEK', 'KLIEN', 'TOTAL KONTRAK (IDR)'],
      ['Renovasi Kantor Contoh', 'PT Contoh Indonesia', 250000000],
    ]);
    worksheet['!cols'] = [{ wch: 32 }, { wch: 28 }, { wch: 24 }];
    worksheet['C2'].z = '#,##0';

    const instructions = XLSX.utils.aoa_to_sheet([
      ['PETUNJUK IMPORT PROYEK'],
      ['1. Isi data pada sheet "Data Proyek" tanpa mengubah judul kolom.'],
      ['2. Nama Proyek, Klien, dan Total Kontrak wajib diisi.'],
      ['3. Total Kontrak harus berupa angka dan tidak boleh negatif.'],
      ['4. Hapus baris contoh sebelum melakukan import.'],
      ['5. Simpan file dalam format .xlsx atau .xls.'],
    ]);
    instructions['!cols'] = [{ wch: 78 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Proyek');
    XLSX.utils.book_append_sheet(workbook, instructions, 'Petunjuk');
    XLSX.writeFile(workbook, 'Template_Import_Proyek.xlsx');
  };

  const openBudgetHistory = async (project) => {
    setHistoryProject(project);
    setShowBudgetHistory(true);
    setBudgetHistory([]);
    try {
      const response = await axios.get(`get_budget_history.php?project_id=${project.id}&t=${Date.now()}`);
      setBudgetHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error(err);
      alert('Histori budget gagal dimuat.');
    }
  };

  const handleImportExcel = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const workbook = XLSX.read(loadEvent.target.result, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
        if (!rows.length) throw new Error('File tidak memiliki data proyek.');
        const normalizedRows = rows.map((row, index) => {
          const rawBudget = row['TOTAL KONTRAK (IDR)'] ?? row.budget_total ?? row['Nilai Kontrak'] ?? row.BUDGET;
          const budget = Number(String(rawBudget ?? '').replace(/[^0-9.-]/g, ''));
          return {
            rowNumber: index + 2,
            nama_proyek: String(row['NAMA PROYEK'] ?? row.nama_proyek ?? row['Nama Proyek'] ?? '').trim(),
            klien: String(row.KLIEN ?? row.klien ?? row.Klien ?? '').trim(),
            budget_total: budget,
          };
        });
        const invalidRows = normalizedRows.filter((row) => !row.nama_proyek || !row.klien || !Number.isFinite(row.budget_total) || row.budget_total < 0);
        if (invalidRows.length) {
          throw new Error(`Data tidak valid pada baris ${invalidRows.map((row) => row.rowNumber).join(', ')}. Periksa Nama Proyek, Klien, dan Total Kontrak.`);
        }

        for (const row of normalizedRows) {
          await axios.post('add_project.php', {
            nama_proyek: row.nama_proyek,
            klien: row.klien,
            budget_total: row.budget_total,
            changed_by: userVa?.nama_lengkap || userVa?.username || 'Bos',
          });
        }
        alert(`${normalizedRows.length} proyek berhasil diimpor.`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert(err.message || 'Gagal membaca Excel. Pastikan format kolom sesuai.');
      } finally {
        setImporting(false);
        event.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const theme = {
    bg: isDarkMode ? '#0a0a0a' : '#f8f9fa', 
    text: isDarkMode ? '#f0f0f0' : '#1a1a1a',
    card: isDarkMode ? '#141414' : '#ffffff',
    border: isDarkMode ? '#222222' : '#e9ecef',
    inputBg: isDarkMode ? '#1a1a1a' : '#ffffff',
    mutedText: isDarkMode ? '#6c757d' : '#888888',
    accent: isDarkMode ? '#ffffff' : '#000000'
  }

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { background-color: ${theme.bg}; color: ${theme.text}; margin: 0; font-family: 'Inter', sans-serif; transition: 0.4s ease; overflow-x: hidden; }
    .container { padding: 30px 20px; max-width: 1200px; margin: 0 auto; box-sizing: border-box; }
    .top-bar { display: flex; justify-content: space-between; margin-bottom: 35px; padding: 12px 20px; align-items: center; background: ${isDarkMode ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.85)'}; backdrop-filter: blur(15px); border-radius: 20px; border: 1px solid ${theme.border}; position: sticky; top: 15px; z-index: 1000; }
    .main-grid { display: grid; grid-template-columns: ${hasFullAccess ? '320px 1fr' : '1fr'}; gap: 30px; }
    .card-home { background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 24px; padding: 25px; box-shadow: 0 4px 30px rgba(0,0,0,${isDarkMode ? '0.4' : '0.02'}); }
    .card-sticky { position: sticky; top: 110px; }
    .stat-mini-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; }
    .stat-mini-card { background: ${isDarkMode ? '#1a1a1a' : '#f1f3f5'}; padding: 15px; border-radius: 16px; text-align: center; }
    .balance-header { background: ${isDarkMode ? '#141414' : '#1a1a1a'}; padding: 45px 20px; border-radius: 28px; color: #fff; text-align: center; margin-bottom: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
    .real-balance-text { font-size: 3.5rem !important; fontWeight: 800 !important; letter-spacing: -2px; margin: 12px 0; }
    .input-home { width: 100%; padding: 14px; border: 1.5px solid ${theme.border}; border-radius: 12px; font-size: 13px; outline: none; box-sizing: border-box; background: ${theme.inputBg}; color: ${theme.text} !important; transition: 0.3s; }
    .input-home:focus { border-color: ${theme.accent}; }
    .project-row { background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 24px; padding: 25px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .project-row:hover { transform: translateY(-5px) scale(1.01); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    .btn-nav { background: none; border: 1px solid transparent; color: ${theme.text}; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; transition: 0.3s; display: flex; align-items: center; gap: 8px; }
    .btn-nav:hover { background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}; }
    .top-bar .btn-nav { border-color: ${theme.border}; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.82); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px; box-sizing: border-box; backdrop-filter: blur(12px); }
    .portfolio-toolbar, .portfolio-tools, .top-actions, .balance-summary { display: flex; align-items: center; }
    .portfolio-toolbar { justify-content: space-between; margin-bottom: 30px; gap: 16px; }
    .portfolio-tools { gap: 10px; }
    .top-actions { gap: 8px; }
    .balance-summary { justify-content: center; gap: 20px; font-size: 11px; margin-top: 20px; }
    .project-action-buttons { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .search-project { padding: 10px 15px; border-radius: 12px; border: 1px solid ${theme.border}; background: ${theme.inputBg}; color: ${theme.text}; font-size: 11px; outline: none; width: 150px; box-sizing: border-box; }
    .import-panel { margin-top: 22px; padding-top: 20px; border-top: 1px solid ${theme.border}; }
    .import-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .import-actions .btn-nav { justify-content: center; border-color: ${theme.border}; min-height: 42px; }
    .history-row { display: grid; grid-template-columns: 1fr auto; gap: 15px; padding: 16px 0; border-bottom: 1px solid ${theme.border}; }
    .brand-logo { height: 70px; margin-bottom: 15px; mix-blend-mode: ${isDarkMode ? 'screen' : 'multiply'}; filter: ${isDarkMode ? 'invert(1) brightness(1.5)' : 'none'}; transition: 0.3s; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spinner-icon { display: inline-block; animation: spin 3s linear infinite; margin-right: 8px; color: #e67e22; }
    @media (max-width: 850px) { .main-grid { grid-template-columns: minmax(0, 1fr); } .card-sticky { position: static; } .project-row { flex-direction: column; align-items: stretch; gap: 20px; } .project-actions { width: 100%; justify-content: space-between; display: flex; gap: 12px !important; flex-wrap: wrap; } .project-action-buttons { width: 100%; justify-content: flex-start; } .real-balance-text { font-size: clamp(1.65rem, 8vw, 2.2rem) !important; letter-spacing: -1px; overflow-wrap: anywhere; } .top-bar { padding: 10px; border-radius: 15px; } .top-bar .btn-nav span { display: none; } }
    @media (max-width: 600px) { .container { padding: 14px 12px 30px; } .top-bar { top: 8px; margin-bottom: 28px; gap: 8px; } .top-actions { gap: 4px; } .top-bar .btn-nav { padding: 9px; } .top-bar a > div:last-child { display: none; } .brand-logo { height: 58px; } .page-title { font-size: 17px !important; letter-spacing: 5px !important; overflow-wrap: anywhere; } .page-subtitle { letter-spacing: 3px !important; } .balance-header { padding: 32px 12px; border-radius: 20px; } .balance-title { letter-spacing: 3px !important; } .balance-summary { flex-direction: column; gap: 8px; } .card-home, .project-row { padding: 20px 16px; border-radius: 18px; } .portfolio-toolbar { align-items: stretch; flex-direction: column; margin-bottom: 20px; } .portfolio-tools { display: grid; grid-template-columns: 1fr 1fr; width: 100%; } .portfolio-tools .btn-nav { justify-content: center; } .search-project { grid-column: 1 / -1; width: 100%; min-height: 42px; } .project-action-buttons > * { flex: 1 1 calc(50% - 5px); text-align: center; justify-content: center; box-sizing: border-box; } .project-action-buttons a { padding: 12px !important; } .modal-overlay { padding: 12px; align-items: flex-end; } .history-row { grid-template-columns: 1fr; } }
  `;

  if (loading) return (
    <div style={{ background: theme.bg, height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: theme.text }}>
        <h1 style={{ letterSpacing: '10px', fontWeight: '200' }}>MEMUAT...</h1>
        <p style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '4px' }}>VIRTUAL ACTUALIZE SYSTEM</p>
    </div>
  );

  return (
    <div className="container">
      <style>{styles}</style>

      {/* TOP BAR */}
      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: theme.text }}>
            <div style={{ width: '32px', height: '32px', background: theme.accent, color: isDarkMode ? '#000' : '#fff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', fontWeight: 'bold' }}>
              {userVa?.nama_lengkap?.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '1px' }}>
              {userVa?.nama_lengkap?.toUpperCase()}
            </div>
          </Link>
        </div>
        
        <div className="top-actions">
          <Link to="/vendor-hutang" className="btn-nav">
            <svg style={{width:'16px'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8V21H3V8M1 3H23V8H1V3M10 12H14"/></svg>
            <span>HUTANG</span>
          </Link>

          <Link to="/payroll" className="btn-nav">
            <svg style={{width:'16px'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            <span>PAYROLL</span>
          </Link>

          <Link to="/reports" className="btn-nav">
            <svg style={{width:'16px'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>ANALITIK</span>
          </Link>

          <button onClick={toggleNightMode} className="btn-nav">
            {isDarkMode ? 
              <svg style={{width:'16px'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> 
              : 
              <svg style={{width:'16px'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          <button onClick={handleLogout} className="btn-nav"><span>KELUAR</span></button>
        </div>
      </div>
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <div style={{ display: 'inline-block', padding: '10px' }}>
           <img src="/logo-va.jpeg" alt="VA Logo" className="brand-logo" />
        </div>
        <h1 className="page-title" style={{ fontSize: '20px', letterSpacing: '12px', fontWeight: '300', textTransform: 'uppercase', margin: 0 }}>VIRTUAL ACTUALIZE</h1>
        <p className="page-subtitle" style={{ fontSize: '9px', color: theme.mutedText, letterSpacing: '6px', textTransform: 'uppercase', marginTop: '10px', fontStyle: 'italic' }}>Renovasi & Konstruksi</p>
      </div>

      {/* BALANCE HEADER */}
      <div className="balance-header">
        <p className="balance-title" style={{ margin: 0, fontSize: '10px', opacity: 0.5, letterSpacing: '5px' }}>SALDO RILL PERUSAHAAN</p>
        <h1 className="real-balance-text">
          <span style={{ fontSize: '1.5rem', opacity: 0.3, marginRight: '10px' }}>Rp</span>
          {Number(stats.total_balance || 0).toLocaleString('id-ID')}
        </h1>
        <div className="balance-summary">
            <div style={{ color: '#2ecc71', fontWeight: 'bold' }}>MASUK Rp {Number(stats.total_income || 0).toLocaleString('id-ID')}</div>
            <div style={{ color: '#e74c3c', fontWeight: 'bold' }}>KELUAR Rp {Number(stats.total_expense || 0).toLocaleString('id-ID')}</div>
            <div style={{ color: Number(stats.completed_profit) >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>LABA/RUGI SELESAI Rp {Number(stats.completed_profit || 0).toLocaleString('id-ID')}</div>
        </div>
      </div>

      <div style={{ marginBottom: '50px', borderRadius: '28px', overflow: 'hidden', background: theme.card, border: `1px solid ${theme.border}` }}>
        <CashFlowChart semuaTransaksi={semuaTransaksi} isDarkMode={isDarkMode} />
      </div>

      <div style={{ marginBottom: '50px', borderRadius: '28px', overflow: 'hidden', background: theme.card, border: `1px solid ${theme.border}` }}>
        <ProjectPayChart projects={projectPayData} isDarkMode={isDarkMode} />
      </div>

      <div className="main-grid">
        {hasFullAccess && (
          <aside>
            <div className="card-home card-sticky">
              <h3 style={{ margin: '0 0 25px 0', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px' }}>Input Proyek Baru</h3>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{fontSize:'9px', color:theme.mutedText, fontWeight:'700'}}>NAMA PROYEK</label>
                  <input name="nama_proyek" value={formData.nama_proyek} onChange={handleChange} required className="input-home" />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{fontSize:'9px', color:theme.mutedText, fontWeight:'700'}}>KLIEN</label>
                  <input name="klien" value={formData.klien} onChange={handleChange} required className="input-home" />
                </div>
                <div style={{ marginBottom: '25px' }}>
                  <label style={{fontSize:'9px', color:theme.mutedText, fontWeight:'700'}}>NILAI KONTRAK (IDR)</label>
                  <input name="budget_total" value={formatNumber(formData.budget_total)} onChange={handleChange} required className="input-home" style={{fontSize: '18px', fontWeight: '700'}} />
                </div>
                <button type="submit" style={{ background: theme.accent, color: isDarkMode ? '#000' : '#fff', border: 'none', padding: '16px', borderRadius: '15px', cursor: 'pointer', fontWeight: '800', width: '100%', fontSize: '11px' }}>TAMBAHKAN PROYEK</button>
              </form>

              <div className="import-panel">
                <div style={{fontSize:'9px', color:theme.mutedText, fontWeight:'700', marginBottom:'10px'}}>IMPOR BANYAK PROYEK</div>
                <p style={{fontSize:'10px', color:theme.mutedText, lineHeight:'1.6', margin:'0 0 12px'}}>Unduh template, isi data proyek, lalu unggah file Excel yang sudah dilengkapi.</p>
                <div className="import-actions">
                  <button type="button" onClick={downloadProjectTemplate} className="btn-nav">TEMPLATE</button>
                  <button type="button" onClick={() => importInputRef.current?.click()} disabled={importing} className="btn-nav">{importing ? 'MENGIMPOR...' : 'IMPOR'}</button>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px'}}>
                  <div><label style={{fontSize:'9px', color:theme.mutedText, fontWeight:'700'}}>MULAI</label><input type="date" name="tanggal_mulai" value={formData.tanggal_mulai} onChange={handleChange} className="input-home" /></div>
                  <div><label style={{fontSize:'9px', color:theme.mutedText, fontWeight:'700'}}>TARGET</label><input type="date" name="tanggal_target" min={formData.tanggal_mulai || undefined} value={formData.tanggal_target} onChange={handleChange} className="input-home" /></div>
                </div>
                <input ref={importInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} style={{display:'none'}} />
              </div>

              <div className="stat-mini-grid">
                <div className="stat-mini-card">
                    <div style={{fontSize:'18px', fontWeight:'800'}}>{stats.total_projects}</div>
                    <div style={{fontSize:'8px', opacity:0.6}}>TOTAL</div>
                </div>
                <div className="stat-mini-card">
                    <div style={{fontSize:'18px', fontWeight:'800', color:'#e67e22'}}>{stats.active_projects}</div>
                    <div style={{fontSize:'8px', opacity:0.6}}>AKTIF</div>
                </div>
              </div>
            </div>
          </aside>
        )}

        <section>
          <div className="portfolio-toolbar">
            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '800', letterSpacing: '2px' }}>PORTOFOLIO PROYEK</h3>
            <div className="portfolio-tools">
              <button onClick={downloadProjectTemplate} className="btn-nav" style={{border:`1px solid ${theme.border}`}}>TEMPLATE</button>
              <button onClick={exportToExcel} className="btn-nav" style={{border:`1px solid ${theme.border}`}}>EXCEL</button>
              <input aria-label="Cari proyek" placeholder="Cari proyek..." onChange={(e) => setSearchTerm(e.target.value)} className="search-project" />
            </div>
          </div>

          <div>
            {Array.isArray(proyek) && proyek.filter(p => p.nama_proyek.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
              <div key={item.id} className="project-row">
                <div style={{flex: 1}}>
                  <div style={{ fontSize: '9px', color: theme.mutedText, fontWeight: '700' }}>VA-PROJECT-{String(item.id).padStart(3, '0')}</div>
                  <div style={{ fontWeight: '700', fontSize: '20px', margin: '8px 0' }}>{item.nama_proyek}</div>
                  <div style={{ fontSize: '12px', color: theme.mutedText }}>{item.klien} • <span style={{ color: '#27ae60', fontWeight: '800' }}>IDR {Number(item.budget_total).toLocaleString('id-ID')}</span></div>
                  
                  <div style={{ width: '100%', maxWidth: '300px', height: '6px', background: isDarkMode ? '#222' : '#eee', borderRadius: '10px', marginTop: '15px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${hitungPersen(item)}%`,
                        height: '100%', 
                        background: '#27ae60',
                        transition: '1.5s cubic-bezier(0.16, 1, 0.3, 1)' 
                    }} />
                  </div>
                  <div style={{ fontSize: '9px', marginTop: '8px', opacity: 0.6, fontWeight: '700' }}>
                    {hitungPersen(item).toFixed(1)}% PROGRES PROYEK
                  </div>
                  <div style={{fontSize:'9px', marginTop:'6px', fontWeight:'700', color:timeStatus(item).color}}>{timeStatus(item).label.toUpperCase()}</div>
                </div>

                <div className="project-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    color: item.status === 'Berjalan' ? '#e67e22' : item.status === 'Selesai' ? '#2ecc71' : '#888',
                    fontSize: '10px', fontWeight: '800'
                  }}>
                    {item.status === 'Berjalan' && <span className="spinner-icon">◌</span>}
                    {item.status?.toUpperCase() || 'PERENCANAAN'}
                  </div>
                  <div className="project-action-buttons">
                    {hasFullAccess && (
                      <button onClick={() => handleEditClick(item)} className="btn-nav" style={{border:`1px solid ${theme.border}`}}>EDIT</button>
                    )}
                    <button onClick={() => openBudgetHistory(item)} className="btn-nav" style={{border:`1px solid ${theme.border}`}}>HISTORI</button>
                    <Link to={`/project/${item.id}`} state={{ namaProyek: item.nama_proyek }} 
                      style={{ padding: '12px 25px', backgroundColor: theme.accent, color: isDarkMode ? '#000' : '#fff', textDecoration: 'none', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                      DETAIL
                    </Link>
                    {hasFullAccess && (
                      <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px', opacity: 0.3 }}>✕</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MODAL EDIT TETAP SAMA */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(15px)' }}>
            <div style={{ background: theme.card, padding: '35px', borderRadius: '28px', width: '90%', maxWidth: '400px', border: `1px solid ${theme.border}` }}>
                <h3 style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '3px', marginBottom: '30px', textAlign: 'center' }}>EDIT PROYEK</h3>
                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: theme.mutedText }}>NAMA PROYEK</label>
                        <input className="input-home" value={editData.nama_proyek} onChange={e => setEditData({...editData, nama_proyek: e.target.value})} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: theme.mutedText }}>KLIEN</label>
                        <input className="input-home" value={editData.klien} onChange={e => setEditData({...editData, klien: e.target.value})} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: theme.mutedText }}>KONTRAK (IDR)</label>
                        <input className="input-home" style={{fontSize: '18px', fontWeight:'700'}}
                            value={formatNumber(editData.budget_total)} 
                            onChange={e => {
                                const val = e.target.value.replace(/\./g, '');
                                if (!isNaN(val)) setEditData({...editData, budget_total: val});
                            }} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: theme.mutedText }}>STATUS</label>
                        <select className="input-home" value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                            <option value="Perencanaan">Perencanaan</option>
                            <option value="Berjalan">Berjalan</option>
                            <option value="Selesai">Selesai</option>
                        </select>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                      <div><label style={{fontSize:'10px', fontWeight:'700', color:theme.mutedText}}>MULAI</label><input type="date" className="input-home" value={editData.tanggal_mulai} onChange={e => setEditData({...editData, tanggal_mulai:e.target.value})} /></div>
                      <div><label style={{fontSize:'10px', fontWeight:'700', color:theme.mutedText}}>TARGET</label><input type="date" className="input-home" min={editData.tanggal_mulai || undefined} value={editData.tanggal_target} onChange={e => setEditData({...editData, tanggal_target:e.target.value})} /></div>
                    </div>
                    <div>
                      <label style={{fontSize:'10px', fontWeight:'700', color:theme.mutedText}}>PROGRES PROYEK ({Number(editData.progress_percent).toFixed(1)}%)</label>
                      <input type="range" min="0" max="100" step="0.1" value={editData.progress_percent} onChange={e => setEditData({...editData, progress_percent:Number(e.target.value)})} style={{width:'100%'}} />
                    </div>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                        <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '15px', border: `1px solid ${theme.border}`, background: 'none', color: theme.text, fontWeight:'700', fontSize:'11px' }}>BATAL</button>
                        <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '15px', border: 'none', background: theme.accent, color: isDarkMode ? '#000' : '#fff', fontWeight: '800', fontSize:'11px' }}>PERBARUI</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showBudgetHistory && (
        <div className="modal-overlay" onClick={() => setShowBudgetHistory(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{background:theme.card, color:theme.text, width:'100%', maxWidth:'560px', maxHeight:'80vh', overflowY:'auto', borderRadius:'24px', border:`1px solid ${theme.border}`, padding:'28px'}}>
            <div style={{display:'flex', justifyContent:'space-between', gap:'20px', alignItems:'flex-start', marginBottom:'20px'}}>
              <div>
                <div style={{fontSize:'9px', letterSpacing:'2px', color:theme.mutedText}}>HISTORI BUDGET</div>
                <h3 style={{margin:'8px 0 0'}}>{historyProject?.nama_proyek}</h3>
              </div>
              <button className="btn-nav" onClick={() => setShowBudgetHistory(false)}>TUTUP</button>
            </div>
            {budgetHistory.length === 0 ? (
              <p style={{color:theme.mutedText, fontSize:'12px'}}>Belum ada perubahan budget yang tercatat.</p>
            ) : budgetHistory.map((entry) => (
              <div className="history-row" key={entry.id}>
                <div>
                  <div style={{fontSize:'12px', fontWeight:'700'}}>Diubah oleh {entry.changed_by}</div>
                  <div style={{fontSize:'10px', color:theme.mutedText, marginTop:'6px'}}>{new Date(entry.changed_at).toLocaleString('id-ID')}</div>
                </div>
                <div style={{textAlign:'right', fontSize:'11px'}}>
                  <div style={{color:theme.mutedText}}>Rp {Number(entry.old_budget).toLocaleString('id-ID')}</div>
                  <div style={{fontWeight:'800', marginTop:'5px'}}>Rp {Number(entry.new_budget).toLocaleString('id-ID')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Home;
