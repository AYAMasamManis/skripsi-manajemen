import { useEffect, useState, useCallback } from 'react'
import axios from '../config/api'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell 
} from 'recharts'

function Reports() {
    const [reportData, setReportData] = useState([])
    const [categoryData, setCategoryData] = useState([])
    const [completedProjects, setCompletedProjects] = useState([])
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [reportMode, setReportMode] = useState('yearly')
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [customPeriod, setCustomPeriod] = useState({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) })
    const [isDarkMode] = useState(localStorage.getItem('nightMode') === 'true')
    const [loading, setLoading] = useState(true)

    // Opsi Tahun Dinamis
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({length: 11}, (_, i) => currentYear - 5 + i);

    const COLORS = ['#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#1abc9c', '#f39c12', '#d35400', '#c0392b'];

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ mode: reportMode, year: selectedYear, month: selectedMonth, start_date: customPeriod.start, end_date: customPeriod.end, t: Date.now() })
            const res = await axios.get(`get_monthly_reports.php?${params}`)
            if (res.data) {
                setReportData(res.data.monthly_stats || []);
                setCategoryData(res.data.category_distribution || []);
                setCompletedProjects(res.data.completed_projects || []);
            }
            setLoading(false)
        } catch (err) {
            console.error("Gagal tarik data:", err);
            setLoading(false);
        }
    }, [selectedYear, selectedMonth, reportMode, customPeriod.start, customPeriod.end])

    useEffect(() => { fetchData() }, [fetchData])

    const theme = {
        bg: isDarkMode ? '#0a0a0a' : '#ffffff',
        text: isDarkMode ? '#f0f0f0' : '#000000',
        card: isDarkMode ? '#141414' : '#ffffff',
        border: isDarkMode ? '#222222' : '#d1d1d1',
        subText: isDarkMode ? '#888' : '#444',
        chartGrid: isDarkMode ? '#222' : '#e0e0e0'
    };

    const formatRupiah = (val) => "Rp " + (val || 0).toLocaleString('id-ID')
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const periodLabel = reportMode === 'monthly' ? `${monthNames[selectedMonth - 1]} ${selectedYear}` : reportMode === 'custom' ? `${customPeriod.start} s.d. ${customPeriod.end}` : `Tahun ${selectedYear}`
    const totals = reportData.reduce((sum, item) => ({ income: sum.income + Number(item.income || 0), expense: sum.expense + Number(item.expense || 0) }), { income: 0, expense: 0 })
    const completedProfit = completedProjects.reduce((sum, item) => sum + Number(item.profit || 0), 0)

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const monthlyData = reportData.map(d => [d.bulan, { v: d.income, t: 'n', z: 'Rp #,##0' }, { v: d.expense, t: 'n', z: 'Rp #,##0' }, { v: d.balance_change, t: 'n', z: 'Rp #,##0' }]);
        monthlyData.unshift(["PERIODE", "PEMASUKAN", "PENGELUARAN", "PERUBAHAN SALDO"]);
        const ws1 = XLSX.utils.aoa_to_sheet(monthlyData);
        const categoryDataExcel = categoryData.map(d => [d.name, { v: d.value, t: 'n', z: 'Rp #,##0' }]);
        categoryDataExcel.unshift(["KATEGORI", "TOTAL PENGELUARAN"]);
        const ws2 = XLSX.utils.aoa_to_sheet(categoryDataExcel);
        ws1['!cols'] = [{wch:20}, {wch:20}, {wch:20}, {wch:20}];
        ws2['!cols'] = [{wch:30}, {wch:25}];
        XLSX.utils.book_append_sheet(wb, ws1, "Kinerja Bulanan");
        XLSX.utils.book_append_sheet(wb, ws2, "Distribusi Pengeluaran");
        const completedData = completedProjects.map(d => [d.nama_proyek, d.tanggal_selesai, d.income, d.expense, d.profit]);
        completedData.unshift(["PROYEK SELESAI", "TANGGAL SELESAI", "PEMASUKAN", "PENGELUARAN", "LABA"]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(completedData), "Laba Proyek Selesai");
        XLSX.writeFile(wb, `VA_Laporan_Laba_${reportMode}_${selectedYear}.xlsx`);
    };

    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;600;800&display=swap');

        body { background-color: ${theme.bg}; color: ${theme.text}; margin: 0; font-family: 'Inter', sans-serif; transition: 0.4s ease; }
        
        /* FONT HALUS & MEWAH SEPERTI HOME.JSX */
        h1 { font-family: 'Montserrat', sans-serif; font-weight: 200; letter-spacing: 12px; text-transform: uppercase; color: ${theme.text}; margin: 0; }
        h2, h3, .btn-nav-action, .form-label, .year-select { font-family: 'Montserrat', sans-serif; }
        .module-title { margin: 0 0 6px; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; }
        .module-subtitle { margin: 0 0 24px; color: ${theme.subText}; font-size: 11px; }
        .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:30px; }
        .summary-card { padding:22px; border-radius:20px; border:1px solid ${theme.border}; background:${theme.card}; }

        .container-reports { padding: 40px 20px; max-width: 1200px; margin: 0 auto; box-sizing: border-box; }
        
        .top-nav { 
            display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px;
            background: ${isDarkMode ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.9)'}; 
            backdrop-filter: blur(15px); padding: 12px 20px; border-radius: 20px; border: 1px solid ${theme.border};
            position: sticky; top: 15px; z-index: 1000;
        }

        .card-va { 
            background: ${theme.card}; border: 1px solid ${theme.border}; border-radius: 28px; 
            padding: 35px; box-shadow: ${isDarkMode ? '0 4px 30px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.08)'}; 
            margin-bottom: 30px;
        }

        .form-label { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: ${theme.subText}; text-transform: uppercase; margin-bottom: 25px; display: block; }
        
        .table-va { width: 100%; border-collapse: collapse; font-size: 13px; }
        .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .report-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items:center; }
        th { text-align: left; padding: 18px 15px; font-size: 11px; color: ${theme.text}; border-bottom: 2.5px solid ${theme.border}; letter-spacing: 1.5px; font-weight: 800; }
        td { padding: 22px 15px; border-bottom: 1px solid ${theme.border}; color: ${theme.text}; }

        .btn-nav-action { 
            background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#000'}; 
            border: 1px solid ${theme.border}; color: #fff; 
            padding: 10px 20px; border-radius: 12px; cursor: pointer; 
            font-size: 10px; font-weight: 800; transition: 0.3s; display: flex; align-items: center; gap: 8px; text-decoration: none;
        }
        .btn-nav-action:hover { background: #333; transform: translateY(-2px); }

        .year-select {
            background: ${isDarkMode ? '#1a1a1a' : '#ffffff'};
            color: ${theme.text}; border: 1.5px solid ${theme.border};
            padding: 8px 15px; border-radius: 10px; font-size: 11px; font-weight: 800; outline: none; cursor: pointer;
        }

        .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 10px; align-items: center; }

        @media print {
            @page { size: A4 portrait; margin: 15mm; }
            .no-print, .top-nav { display: none !important; }
            body { background: white !important; color: black !important; }
            .container-reports { padding: 0 !important; width: 100% !important; max-width: 100% !important; }
            .card-va { box-shadow: none !important; border: 1px solid #eee !important; margin-bottom: 30px !important; padding: 20px !important; page-break-inside: avoid !important; }
            .chart-grid { display: flex !important; flex-direction: column !important; gap: 50px !important; }
            .chart-item { width: 100% !important; height: 350px !important; position: relative !important; margin-bottom: 20px !important; }
            h1 { font-size: 22px !important; margin-top: 0; text-align: center; }
        }

        @media (max-width: 1050px) { .chart-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 700px) { .summary-grid { grid-template-columns:1fr; } }
        @media (max-width: 700px) { .container-reports { padding: 18px 12px 35px; } .top-nav { position: static; flex-direction: column; align-items: stretch; gap: 12px; padding: 14px; } .report-actions { display: grid; grid-template-columns: 1fr 1fr; } .year-select { grid-column: 1 / -1; width: 100%; } .btn-nav-action { justify-content: center; padding: 11px 8px; } h1 { font-size: 24px; letter-spacing: 6px; overflow-wrap: anywhere; } .card-va { padding: 20px 14px; border-radius: 20px; } .chart-item { height: 320px !important; min-width: 0; } .table-va { min-width: 620px; } }
    `;

    if (loading) return (
        <div style={{ background: theme.bg, height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: theme.text }}>
            <style>{styles}</style>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
                <h1 style={{ letterSpacing: '10px', fontSize: '15px' }}>MENYINKRONKAN...</h1>
        </div>
    )

    return (
        <div className="container-reports">
            <style>{styles}</style>
            
            <div className="top-nav no-print">
                <Link to="/" className="btn-nav-action" style={{ background: 'none', color: theme.text }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> 
                    <span>BERANDA</span>
                </Link>
                <div className="report-actions">
                    <select className="year-select" value={reportMode} onChange={(e) => setReportMode(e.target.value)}><option value="monthly">Per Bulan</option><option value="yearly">Per Tahun</option><option value="custom">Periode Tertentu</option></select>
                    {reportMode !== 'custom' && <select className="year-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>{yearOptions.map(y => <option key={y} value={y}>{y}</option>)}</select>}
                    {reportMode === 'monthly' && <select className="year-select" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select>}
                    {reportMode === 'custom' && <><input className="year-select" type="date" value={customPeriod.start} onChange={(e) => setCustomPeriod({...customPeriod, start:e.target.value})} /><input className="year-select" type="date" value={customPeriod.end} min={customPeriod.start} onChange={(e) => setCustomPeriod({...customPeriod, end:e.target.value})} /></>}
                    <button onClick={exportToExcel} className="btn-nav-action">
                        <span>EKSPOR EXCEL</span>
                    </button>
                    <button onClick={() => window.print()} className="btn-nav-action">
                        <span>CETAK ARSIP</span>
                    </button>
                </div>
            </div>

            <header style={{ textAlign: 'center', marginBottom: '60px' }}>
                <h1>Laporan Keuangan</h1>
                <p style={{ fontSize: '10px', color: theme.subText, letterSpacing: '4px', textTransform: 'uppercase', marginTop: '15px', fontFamily: 'Montserrat' }}>VA Construction • {periodLabel}</p>
            </header>

            <section className="summary-grid" aria-label="Ringkasan arus kas dan laba proyek selesai">
                <div className="summary-card"><span className="form-label">Total Pemasukan</span><strong>{formatRupiah(totals.income)}</strong></div>
                <div className="summary-card"><span className="form-label">Total Pengeluaran</span><strong>{formatRupiah(totals.expense)}</strong></div>
                <div className="summary-card"><span className="form-label">Laba Proyek Selesai</span><strong style={{color:completedProfit >= 0 ? '#27ae60' : '#c0392b'}}>{completedProfit < 0 ? '-' : ''}{formatRupiah(Math.abs(completedProfit))}</strong></div>
            </section>

            <div className="card-va">
                <div className="chart-grid">
                    <div><h2 className="module-title">Diagram Pemasukan dan Pengeluaran</h2><p className="module-subtitle">Perbandingan arus keuangan • {periodLabel}</p><div className="chart-item" style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} vertical={false} />
                                <XAxis dataKey="bulan" stroke={theme.text} fontSize={11} fontWeight="700" axisLine={false} tickLine={false} />
                                <YAxis stroke={theme.text} fontSize={10} fontWeight="700" axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000000}jt`} />
                                <Tooltip 
                                    cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                                    contentStyle={{ background: theme.card, border: `2px solid ${theme.border}`, borderRadius: '15px' }}
                                    itemStyle={{ color: isDarkMode ? '#ffffff' : '#000000', fontWeight: '700', fontSize: '12px' }}
                                    labelStyle={{ color: isDarkMode ? '#ffffff' : '#000000', marginBottom: '5px', fontWeight: '800' }}
                                    formatter={(value) => formatRupiah(value)}
                                />
                                <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '800', paddingBottom: '20px', color: theme.text, fontFamily: 'Montserrat' }} />
                                <Bar dataKey="income" name="Pemasukan" fill="#2ecc71" radius={[4, 4, 0, 0]} barSize={25} />
                                <Bar dataKey="expense" name="Pengeluaran" fill="#e74c3c" radius={[4, 4, 0, 0]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div></div>

                    <div><h2 className="module-title">Diagram Alokasi Pengeluaran</h2><p className="module-subtitle">Komposisi biaya berdasarkan kategori • {periodLabel}</p><div className="chart-item" style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categoryData} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke={theme.card} strokeWidth={3}>
                                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ background: theme.card, border: `2px solid ${theme.border}`, borderRadius: '15px' }}
                                    itemStyle={{ color: isDarkMode ? '#ffffff' : '#000000', fontWeight: '700', fontSize: '12px' }}
                                    formatter={(v) => formatRupiah(v)} 
                                />
                                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" 
                                    wrapperStyle={{ fontSize: '11px', fontWeight: '700', color: theme.text, paddingLeft: '20px', fontFamily: 'Montserrat' }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div></div>
                </div>
            </div>

            <div className="card-va" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '30px' }}><h2 className="module-title">Arus Kas</h2><p className="module-subtitle" style={{marginBottom:0}}>Pemasukan, pengeluaran, dan perubahan saldo • {periodLabel}</p></div>
                <div className="table-scroll">
                    <table className="table-va">
                        <thead>
                            <tr>
                                <th>BULAN</th>
                                <th style={{ textAlign: 'right' }}>PEMASUKAN</th>
                                <th style={{ textAlign: 'right' }}>PENGELUARAN</th>
                                <th style={{ textAlign: 'right' }}>PERUBAHAN SALDO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((d, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: '800' }}>{d.bulan?.toUpperCase()}</td>
                                    <td style={{ textAlign: 'right', color: isDarkMode ? '#2ecc71' : '#1b8a4a', fontWeight: '700' }}>{formatRupiah(d.income)}</td>
                                    <td style={{ textAlign: 'right', color: isDarkMode ? '#e74c3c' : '#b52b1d', fontWeight: '700' }}>{formatRupiah(d.expense)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{ 
                                            display: 'inline-block',
                                            minWidth: '130px',
                                            padding: '8px 12px',
                                            borderRadius: '10px',
                                            fontWeight: '900',
                                            color: '#ffffff',
                                            fontSize: '12px',
                                            background: Number(d.balance_change) >= 0
                                                ? (isDarkMode ? 'rgba(39, 174, 96, 0.9)' : '#27ae60') 
                                                : (isDarkMode ? 'rgba(192, 57, 43, 0.9)' : '#c0392b')
                                        }}>
                                            {(Number(d.balance_change) < 0 ? '-' : '') + formatRupiah(Math.abs(Number(d.balance_change || 0)))}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="card-va" style={{padding:0, overflow:'hidden', marginTop:'24px'}}>
              <div style={{padding:'30px'}}><h2 className="module-title">Laba Proyek Selesai</h2><p className="module-subtitle" style={{marginBottom:0}}>Hanya diakui setelah status proyek Selesai • {periodLabel}</p></div>
              <div className="table-scroll"><table className="table-va"><thead><tr><th>PROYEK</th><th>SELESAI</th><th style={{textAlign:'right'}}>PEMASUKAN</th><th style={{textAlign:'right'}}>PENGELUARAN</th><th style={{textAlign:'right'}}>LABA</th></tr></thead><tbody>
                {completedProjects.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center', color:theme.subText}}>Belum ada proyek selesai pada periode ini.</td></tr> : completedProjects.map(item => <tr key={item.id}><td style={{fontWeight:'800'}}>{item.nama_proyek}</td><td>{item.tanggal_selesai}</td><td style={{textAlign:'right'}}>{formatRupiah(item.income)}</td><td style={{textAlign:'right'}}>{formatRupiah(item.expense)}</td><td style={{textAlign:'right', fontWeight:'900', color:Number(item.profit)>=0?'#27ae60':'#c0392b'}}>{Number(item.profit)<0?'-':''}{formatRupiah(Math.abs(Number(item.profit)))}</td></tr>)}
              </tbody></table></div>
            </div>
        </div>
    )
}

export default Reports;
