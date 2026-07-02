import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx' // Pastikan library ini sudah terinstall

function VendorHutang() {
    const [debts, setDebts] = useState([])
    const [isDarkMode] = useState(localStorage.getItem('nightMode') === 'true');
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        let isMounted = true;
        try {
            setLoading(true);
            const timestamp = Date.now();
            const res = await axios.get(`http://localhost/skripsi-manajemen/api/get_vendor_debts.php?t=${timestamp}`)
            if (isMounted) {
                setDebts(res.data);
                setLoading(false);
            }
        } catch (err) {
            console.error("Gagal memuat data hutang:", err);
            if (isMounted) setLoading(false);
        }
        return () => { isMounted = false };
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalHutangGlobal = debts.reduce((acc, curr) => acc + Number(curr.sisa_hutang || 0), 0)

    // --- FUNGSI EXCEL ---
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        
        // Menyiapkan data dengan format Rupiah yang bisa dihitung di Excel
        const excelData = debts
            .filter(d => (d.vendor || "").toLowerCase().includes(searchTerm.toLowerCase()))
            .map(d => [
                d.vendor,
                d.nama_proyek,
                d.tanggal,
                { v: Number(d.total_tagihan), t: 'n', z: 'Rp #,##0' },
                { v: Number(d.sisa_hutang), t: 'n', z: 'Rp #,##0' }
            ]);

        // Tambah Header
        excelData.unshift(["NAMA VENDOR", "PROYEK", "TANGGAL STATEMENT", "TOTAL INVOICE", "SISA HUTANG"]);

        const ws = XLSX.utils.aoa_to_sheet(excelData);

        // Atur Lebar Kolom Otomatis
        ws['!cols'] = [{wch:25}, {wch:30}, {wch:20}, {wch:20}, {wch:20}];

        XLSX.utils.book_append_sheet(wb, ws, "Laporan Hutang Vendor");
        XLSX.writeFile(wb, `Laporan_Hutang_Vendor_${new Date().toLocaleDateString('id-ID')}.xlsx`);
    };

    const theme = {
        bg: isDarkMode ? '#0a0a0a' : '#f8f9fa',
        text: isDarkMode ? '#f0f0f0' : '#1a1a1a',
        card: isDarkMode ? '#141414' : '#ffffff',
        border: isDarkMode ? '#222222' : '#e9ecef',
        muted: '#888888',
        accent: isDarkMode ? '#ffffff' : '#000000'
    }

    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800&family=Inter:wght@400;500;600&display=swap');
        
        body { background-color: ${theme.bg}; color: ${theme.text}; margin: 0; font-family: 'Montserrat', sans-serif; transition: 0.4s ease; }
        .container-v { padding: 40px 20px; max-width: 1100px; margin: 0 auto; box-sizing: border-box; }
        
        .top-nav { 
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;
          background: ${isDarkMode ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.85)'}; 
          backdrop-filter: blur(15px); padding: 12px 25px; border-radius: 20px; border: 1px solid ${theme.border};
          position: sticky; top: 15px; z-index: 1000;
        }

        .btn-luxury {
          background: ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
          border: 1px solid ${theme.border}; color: ${theme.text};
          padding: 10px 18px; border-radius: 12px; cursor: pointer; transition: 0.3s;
          display: flex; align-items: center; justify-content: center; text-decoration: none;
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
        }
        .btn-luxury:hover { background: ${theme.accent}; color: ${isDarkMode ? '#000' : '#fff'}; transform: translateY(-2px); }

        .total-banner {
            background: ${isDarkMode ? '#111' : '#fff'};
            color: ${theme.text};
            padding: 60px 20px;
            border-radius: 35px;
            text-align: center;
            margin-bottom: 50px;
            border: 1px solid ${theme.border};
            box-shadow: 0 20px 40px rgba(0,0,0,${isDarkMode ? '0.3' : '0.03'});
        }

        .debt-card { 
            background: ${theme.card}; 
            border: 1px solid ${theme.border}; 
            border-radius: 25px; 
            padding: 25px 35px; 
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .debt-card:hover { transform: scale(1.01); border-color: ${theme.accent}; box-shadow: 0 15px 30px rgba(0,0,0,0.05); }
        
        .form-label { font-size: 9px; font-weight: 800; letter-spacing: 2px; color: ${theme.muted}; text-transform: uppercase; margin-bottom: 8px; display: block; }
        .vendor-name-amount { font-size: 26px; font-weight: 800; margin: 5px 0; letter-spacing: -0.5px; }
        
        .project-link { 
            font-size: 10px; color: #3498db; text-decoration: none; font-weight: 700; 
            display: inline-flex; align-items: center; gap: 8px; margin-top: 12px;
            letter-spacing: 1px; text-transform: uppercase;
        }

        .search-input { 
            padding: 15px 25px; border-radius: 15px; border: 1px solid ${theme.border}; 
            background: ${theme.card}; color: ${theme.text}; outline: none; font-family: 'Inter';
            font-size: 13px; width: 250px; transition: 0.3s;
        }
        .search-input:focus { border-color: ${theme.accent}; width: 300px; }

        .nav-icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-list { animation: fadeIn 0.5s ease forwards; }

        @media (max-width: 768px) {
            .debt-card { flex-direction: column; align-items: flex-start; gap: 20px; padding: 25px; }
            .top-nav { flex-direction: row; padding: 10px 15px; }
            .total-banner h1 { font-size: 2.5rem !important; }
            .search-input { width: 100%; }
        }
        
        @media print {
            body { background: white !important; color: black !important; }
            .no-print, .top-nav, input { display: none !important; }
            .total-banner { background: #f9f9f9 !important; color: black !important; border: 1px solid #eee !important; box-shadow: none !important; }
            .debt-card { break-inside: avoid; border: 1px solid #eee !important; background: white !important; }
            .project-link { color: black !important; }
        }
    `;

    if (loading) return (
        <div style={{ background: theme.bg, height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: theme.text }}>
            <style>{styles}</style>
            <h1 style={{ fontFamily: 'Montserrat', letterSpacing: '8px', fontWeight: '300', fontSize: '14px' }}>SYNCHRONIZING...</h1>
        </div>
    );

    return (
        <div className="container-v">
            <style>{styles}</style>
            
            <div className="top-nav no-print">
                <Link to="/" className="btn-luxury">
                    <svg className="nav-icon" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> 
                    <span style={{marginLeft: '10px'}}>DASHBOARD</span>
                </Link>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={exportToExcel} className="btn-luxury">
                        <svg className="nav-icon" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        <span style={{marginLeft: '10px'}}>EXPORT EXCEL</span>
                    </button>
                    <button onClick={() => window.print()} className="btn-luxury">
                        <svg className="nav-icon" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
                        <span style={{marginLeft: '10px'}}>PRINT ARCHIVE</span>
                    </button>
                </div>
            </div>

            <div className="total-banner">
                <span className="form-label">Total Outstanding Liabilities</span>
                <h1 style={{ margin: '20px 0', fontSize: '4rem', fontWeight: '800', letterSpacing: '-2px' }}>
                    <span style={{ fontSize: '1.5rem', opacity: 0.2, marginRight: '15px', fontWeight: '400' }}>Rp</span>
                    {totalHutangGlobal.toLocaleString('id-ID')}
                </h1>
                <p style={{fontSize: '10px', color: '#888', letterSpacing: '3px'}}>VA CONSTRUCTION MANAGEMENT SYSTEM</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
                <h3 style={{ fontSize: '11px', letterSpacing: '5px', fontWeight: '800', margin: 0, opacity: 0.6 }}>VENDOR LIABILITIES</h3>
                <input 
                    className="search-input"
                    placeholder="Search vendor..." 
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="animate-list">
            {debts
                .filter(d => (d.vendor || "").toLowerCase().includes(searchTerm.toLowerCase()))
                .map((debt, index) => (
                <div key={index} className="debt-card">
                    <div style={{ flex: 1 }}>
                        <span className="form-label" style={{color: theme.accent}}>{debt.vendor}</span>
                        <div className="vendor-name-amount">Rp {Number(debt.sisa_hutang || 0).toLocaleString('id-ID')}</div>
                        <Link to={`/project/${debt.project_id}`} className="project-link">
                            <svg className="nav-icon" style={{width: 12, height: 12}} viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                            PROYEK: {debt.nama_proyek}
                        </Link>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span className="form-label">Statement Date</span>
                        <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>{debt.tanggal}</div>
                        <div style={{ fontSize: '10px', color: isDarkMode ? '#aaa' : '#444', marginTop: '15px', fontWeight: '600', padding: '6px 12px', border: `1px solid ${theme.border}`, borderRadius: '10px', display: 'inline-block' }}>
                           Invoice: Rp {Number(debt.total_tagihan || 0).toLocaleString('id-ID')}
                        </div>
                    </div>
                </div>
            ))}
            </div>

            {debts.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.2 }}>
                    <h2 style={{letterSpacing: '10px', fontWeight: '300'}}>NO ACTIVE DEBTS</h2>
                </div>
            )}
        </div>
    )
}

export default VendorHutang;