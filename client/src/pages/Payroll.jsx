import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'

function Payroll() {
  const [proyek, setProyek] = useState([])
  const [dataGaji, setDataGaji] = useState([])
  const [isDarkMode] = useState(localStorage.getItem('nightMode') === 'true');
  
  // State untuk Filter dan Input Periode
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [filterPeriode, setFilterPeriode] = useState({ bulan: currentMonth, tahun: currentYear });

  const [formData, setFormData] = useState({ 
    project_id: '', nama_karyawan: '', jabatan: '', hari_kerja: '', gaji_perhari: '', kasbon: '0',
    bulan_gaji: currentMonth, tahun_gaji: currentYear
  })

  const listJabatan = [
    { nama: "Admin", gaji: "2750000" },
    { nama: "Logistik1", gaji: "135000" },
    { nama: "Logistik2", gaji: "2750000" },
    { nama: "Kepala Logistik", gaji: "4200000" },
    { nama: "Drafter1", gaji: "2750000" },
    { nama: "Drafter2", gaji: "3000000" },
    { nama: "Mandor", gaji: "200000" },
    { nama: "Laden", gaji: "105000" },
    { nama: "Tukang", gaji: "110000" },
    { nama: "Kepala Tukang", gaji: "130000" },
  ];

  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const formatNumber = (num) => {
    if (!num || num === "0") return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const fetchData = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const [resProyek, resGaji] = await Promise.all([
        axios.get(`http://localhost/skripsi-manajemen/api/get_projects.php?t=${timestamp}`),
        axios.get(`http://localhost/skripsi-manajemen/api/get_payroll.php?t=${timestamp}`)
      ]);
      setProyek(resProyek.data);
      setDataGaji(resGaji.data);
    } catch (err) {
      console.error("Gagal muat data payroll:", err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleJabatanChange = (e) => {
    const selectedJabatan = e.target.value;
    const dataJabatan = listJabatan.find(j => j.nama === selectedJabatan);
    if (dataJabatan) {
      setFormData({
        ...formData,
        jabatan: dataJabatan.nama,
        gaji_perhari: dataJabatan.gaji,
        hari_kerja: ["Laden", "Tukang", "Kepala Tukang"].includes(dataJabatan.nama) ? formData.hari_kerja : "1"
      });
    } else {
      setFormData({ ...formData, jabatan: selectedJabatan });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost/skripsi-manajemen/api/add_payroll.php', formData)
      .then(() => {
        setFormData({ ...formData, nama_karyawan: '', hari_kerja: '', kasbon: '0' });
        fetchData();
        alert("Data Gaji Berhasil Disimpan! ✨");
      })
      .catch(err => alert("Gagal simpan: " + err));
  }

  const handleDelete = (id) => {
    if (window.confirm("Hapus riwayat gaji ini secara permanen?")) {
      axios.post('http://localhost/skripsi-manajemen/api/delete_payroll.php', { id }).then(() => fetchData());
    }
  }

  const exportToExcel = () => {
    const filteredData = dataGaji.filter(g => 
        (!g.bulan_gaji) || 
        (Number(g.bulan_gaji) === Number(filterPeriode.bulan) && Number(g.tahun_gaji) === Number(filterPeriode.tahun))
    );
    
    const excelData = filteredData.map(g => [
      g.nama_karyawan,
      g.jabatan,
      g.nama_proyek,
      Number(g.hari_kerja),
      { v: Number(g.gaji_perhari), t: 'n', z: 'Rp #,##0' },
      { v: Number(g.kasbon), t: 'n', z: 'Rp #,##0' },
      { v: Number(g.total_diterima), t: 'n', z: 'Rp #,##0' },
      g.bulan_gaji ? `${namaBulan[g.bulan_gaji-1]} ${g.tahun_gaji}` : 'Data Lama'
    ]);

    excelData.unshift(["NAMA KARYAWAN", "JABATAN", "PROYEK", "HARI KERJA", "GAJI/HARI", "KASBON", "TOTAL TERIMA", "PERIODE"]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    ws['!cols'] = [{wch:25}, {wch:15}, {wch:25}, {wch:10}, {wch:15}, {wch:15}, {wch:15}, {wch:20}];
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Report");
    XLSX.writeFile(wb, `VA_Payroll_Export.xlsx`);
  };

  const theme = {
    bg: isDarkMode ? '#0a0a0a' : '#f8f9fa',
    text: isDarkMode ? '#f0f0f0' : '#1a1a1a',
    card: isDarkMode ? '#141414' : '#ffffff',
    border: isDarkMode ? '#222222' : '#e9ecef',
    accent: isDarkMode ? '#ffffff' : '#000000'
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;600;700;800&family=Inter:wght@400;500;700&display=swap');
    
    body { background-color: ${theme.bg}; color: ${theme.text}; margin: 0; font-family: 'Inter', sans-serif; transition: 0.4s ease; }
    h1 { font-family: 'Montserrat', sans-serif; font-weight: 200; letter-spacing: 12px; text-transform: uppercase; margin: 0; color: ${theme.text}; }
    h2, h3, .btn-action-luxury, .form-label, .year-select, select { font-family: 'Montserrat', sans-serif; }

    .container-payroll { padding: 40px 20px; max-width: 1200px; margin: 0 auto; box-sizing: border-box; }
    
    .top-nav { 
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;
      background: ${isDarkMode ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.85)'}; 
      backdrop-filter: blur(15px); padding: 12px 25px; border-radius: 20px; border: 1px solid ${theme.border};
      position: sticky; top: 15px; z-index: 1000;
    }

    .btn-action-luxury { 
      background: ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}; 
      border: 1px solid ${theme.border}; color: ${theme.text}; padding: 10px 18px; border-radius: 12px; 
      cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 10px; font-weight: 800; letter-spacing: 1px;
    }
    .btn-action-luxury:hover { background: ${theme.accent}; color: ${isDarkMode ? '#000' : '#fff'}; transform: translateY(-2px); }

    .card-va { background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 28px; padding: 35px; box-shadow: 0 4px 30px rgba(0,0,0,${isDarkMode ? '0.4' : '0.02'}); }
    .form-label { font-size: 9px; font-weight: 800; letter-spacing: 2px; color: #888; text-transform: uppercase; margin-bottom: 10px; display: block; }
    
    input, select { width: 100%; padding: 14px; border-radius: 12px; border: 1.5px solid ${theme.border}; background: ${isDarkMode ? '#1a1a1a' : '#fff'}; color: ${theme.text}; font-family: 'Inter', sans-serif; font-size: 13px; outline:none; box-sizing: border-box; transition: 0.3s; }
    input:focus, select:focus { border-color: ${theme.accent}; }

    .btn-save { font-family: 'Montserrat', sans-serif; background: ${theme.accent}; color: ${isDarkMode ? '#000' : '#fff'}; border: none; border-radius: 15px; height: 50px; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; cursor: pointer; width: 100%; transition: 0.3s; }
    .btn-save:hover { opacity: 0.8; transform: translateY(-2px); }

    .payroll-grid { display: grid; grid-template-columns: 1fr 1.8fr; gap: 35px; }

    .table-container { background: ${theme.card}; border-radius: 28px; border: 1px solid ${theme.border}; overflow: hidden; margin-top: 0px; }
    .table-va { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 18px 20px; font-size: 10px; color: #888; border-bottom: 1px solid ${theme.border}; background: ${isDarkMode ? '#1a1a1a' : '#fafafa'}; letter-spacing: 1px; font-family: 'Montserrat', sans-serif; }
    td { padding: 22px 20px; border-bottom: 1px solid ${theme.border}; }

    @media (max-width: 950px) {
      .payroll-grid { grid-template-columns: 1fr; }
      .top-nav { flex-direction: column; gap: 15px; position: static; }
      .table-va thead { display: none; }
      .table-va tr { display: flex; flex-direction: column; padding: 20px; border-bottom: 1px solid ${theme.border}; }
      .table-va td { padding: 8px 0; border: none; }
      .table-va td:last-child { margin-top: 15px; border-top: 1px dashed ${theme.border}; padding-top: 15px; }
    }
  `;

  return (
    <div className="container-payroll">
      <style>{styles}</style>
      
      <div className="top-nav">
        <Link to="/" className="btn-action-luxury">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> 
          <span style={{marginLeft:'8px'}}>DASHBOARD</span>
        </Link>
        
        <div style={{ display: 'flex', gap: '10px' }}>
            <select style={{width:'150px', padding:'8px 15px', borderRadius:'10px', fontSize:'11px', fontWeight:'800'}} value={filterPeriode.bulan} onChange={e => setFilterPeriode({...filterPeriode, bulan: e.target.value})}>
                {namaBulan.map((b, i) => <option key={i} value={i+1}>{b}</option>)}
            </select>
            <button onClick={exportToExcel} className="btn-action-luxury">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                <span style={{marginLeft:'8px'}}>EXCEL</span>
            </button>
        </div>
      </div>

      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1>Manajemen Gaji</h1>
        <p style={{ fontSize: '10px', color: '#888', letterSpacing: '6px', textTransform: 'uppercase', marginTop: '15px', fontStyle: 'italic', fontFamily: 'Montserrat' }}>
          VA Construction • {namaBulan[filterPeriode.bulan-1].toUpperCase()} {filterPeriode.tahun}
        </p>
      </header>

      <div className="payroll-grid">
        <section>
            <div className="card-va">
            <span className="form-label">Registrasi Pembayaran</span>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                    <div>
                        <label className="form-label">Bulan</label>
                        <select value={formData.bulan_gaji} onChange={e => setFormData({...formData, bulan_gaji: e.target.value})}>
                            {namaBulan.map((b, i) => <option key={i} value={i+1}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Tahun</label>
                        <input type="number" value={formData.tahun_gaji} onChange={e => setFormData({...formData, tahun_gaji: e.target.value})} />
                    </div>
                </div>
                <div>
                  <label className="form-label">Sumber Proyek</label>
                  <select value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} required>
                      <option value="">Pilih Proyek</option>
                      {proyek.map(p => <option key={p.id} value={p.id}>{p.nama_proyek}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Nama Karyawan</label>
                  <input placeholder="Nama Lengkap" value={formData.nama_karyawan} onChange={e => setFormData({...formData, nama_karyawan: e.target.value})} required />
                </div>
                <div>
                  <label className="form-label">Jabatan</label>
                  <select value={formData.jabatan} onChange={handleJabatanChange} required>
                      <option value="">Pilih Jabatan</option>
                      {listJabatan.map((j, i) => <option key={i} value={j.nama}>{j.nama}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '15px' }}>
                  <div>
                    <label className="form-label">Hari Kerja</label>
                    <input type="number" placeholder="0" value={formData.hari_kerja} onChange={e => setFormData({...formData, hari_kerja: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label">Gaji / Hari</label>
                    <input type="text" value={formatNumber(formData.gaji_perhari)} onChange={e => setFormData({...formData, gaji_perhari: e.target.value.replace(/\./g, '')})} required />
                  </div>
                </div>
                <div>
                  <label className="form-label">Kasbon</label>
                  <input type="text" value={formatNumber(formData.kasbon)} onChange={e => setFormData({...formData, kasbon: e.target.value.replace(/\./g, '')})} />
                </div>
                <button type="submit" className="btn-save">Simpan Data Gaji</button>
            </form>
            </div>
        </section>

        <section className="table-container">
            <table className="table-va">
              <thead>
                <tr>
                  <th>KARYAWAN & PERIODE</th>
                  <th style={{ textAlign: 'right' }}>TOTAL DITERIMA</th>
                  <th style={{ textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {dataGaji
                  .filter(g => (!g.bulan_gaji) || (Number(g.bulan_gaji) === Number(filterPeriode.bulan) && Number(g.tahun_gaji) === Number(filterPeriode.tahun)))
                  .map(g => (
                  <tr key={g.id}>
                    <td>
                      <div style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '-0.3px' }}>{g.nama_karyawan}</div>
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', fontWeight: '700', textTransform: 'uppercase' }}>{g.nama_proyek} • {g.jabatan}</div>
                      <div style={{ fontSize: '10px', color: g.bulan_gaji ? '#2ecc71' : '#e67e22', fontWeight: '800', marginTop: '4px' }}>
                        {g.bulan_gaji ? `${namaBulan[g.bulan_gaji-1]} ${g.tahun_gaji}` : 'ARSIP LAMA'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '900', fontSize: '18px', fontFamily: 'Montserrat' }}>Rp {Number(g.total_diterima).toLocaleString('id-ID')}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <Link className="btn-action-luxury" style={{padding:'10px'}} to={`/salary-slip/${g.id}`}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </Link>
                        {/* ICON HAPUS BARU: Modern Trash Icon */}
                        <button className="btn-action-luxury" onClick={() => handleDelete(g.id)} style={{ color: '#ff4757', padding:'10px', border:'1.5px solid rgba(255,71,87,0.2)' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            {dataGaji.filter(g => (!g.bulan_gaji) || (Number(g.bulan_gaji) === Number(filterPeriode.bulan) && Number(g.tahun_gaji) === Number(filterPeriode.tahun))).length === 0 && (
              <div style={{padding:'50px', textAlign:'center', opacity:0.4, fontSize:'11px', letterSpacing:'2px', fontWeight:'800'}}>RECORD EMPTY</div>
            )}
        </section>
      </div>
    </div>
  )
}

export default Payroll;