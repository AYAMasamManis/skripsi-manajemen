import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../config/api';

function SalarySlip() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [slip, setSlip] = useState(null);
    const [isDarkMode] = useState(localStorage.getItem('nightMode') === 'true');

    useEffect(() => {
        // Ambil data dengan timestamp agar tidak kena cache browser
        axios.get(`get_payroll_detail.php?id=${id}&t=${Date.now()}`)
            .then(res => {
                console.log("Data dari API:", res.data); // CEK DI KONSOL F12
                
                // Cek apakah data yang datang itu Array atau Object
                if (Array.isArray(res.data)) {
                    setSlip(res.data[0]); 
                } else if (res.data && typeof res.data === 'object') {
                    setSlip(res.data);
                } else {
                    setSlip({}); // Set object kosong jika data tidak valid
                }

                if (res.data && res.data.nama_karyawan) {
                    document.title = `Slip Gaji - ${res.data.nama_karyawan}`;
                }
            })
            .catch(err => {
                console.error("Error Fetching:", err);
                setSlip({}); // Tetap set agar tidak loading selamanya
            });
        
        return () => { document.title = "Virtual Actualize"; };
    }, [id]);

    // Tunggu sampai slip ada isinya DAN bukan object kosong
    if (!slip || Object.keys(slip).length === 0) {
        return (
            <div style={{ background: isDarkMode ? '#0a0a0a' : '#f8f9fa', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: isDarkMode ? '#fff' : '#000' }}>
                <style>{`
                    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
                `}</style>
                <h1 style={{ fontFamily: 'Montserrat', letterSpacing: '5px', fontWeight: '300', animation: 'pulse 1.5s infinite' }}>
                    MENYINKRONKAN DOKUMEN...
                </h1>
                <p style={{ fontSize: '10px', marginTop: '10px', opacity: 0.5 }}>Pastikan ID Proyek benar atau data sudah ada di database.</p>
            </div>
        );
    }

    // Perhitungan dilakukan HANYA jika data sudah dipastikan ada
    const hariKerja = Number(slip.hari_kerja || 0);
    const gajiPerHari = Number(slip.gaji_perhari || 0);
    const kasbon = Number(slip.kasbon || 0);
    const gajiPokok = hariKerja * gajiPerHari;
    
    // Gunakan total_diterima dari database jika ada, jika tidak, hitung manual
    const totalTakeHomePay = Number(slip.total_diterima) || (gajiPokok - kasbon);

    const theme = {
        bg: isDarkMode ? '#0a0a0a' : '#f8f9fa',
        text: isDarkMode ? '#f0f0f0' : '#1a1a1a',
        accent: isDarkMode ? '#ffffff' : '#000000',
        border: isDarkMode ? '#222222' : '#e9ecef',
    };

    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;800&family=Inter:wght@400;500;700&display=swap');
        body { background-color: ${theme.bg}; margin: 0; font-family: 'Montserrat', sans-serif; transition: 0.4s ease; }
        .nav-header {
            max-width: 800px; margin: 0 auto 30px auto; display: flex; justify-content: space-between; align-items: center;
            background: ${isDarkMode ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.85)'};
            backdrop-filter: blur(15px); padding: 12px 20px; border-radius: 20px; border: 1px solid ${theme.border};
            position: sticky; top: 15px; z-index: 1000;
        }
        .btn-nav {
            background: ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}; 
            border: 1px solid ${theme.border}; color: ${theme.text}; 
            padding: 10px 20px; border-radius: 12px; cursor: pointer; font-size: 10px; 
            font-weight: 700; display: flex; align-items: center; gap: 8px; transition: 0.3s;
            text-transform: uppercase; letter-spacing: 1px;
        }
        .btn-nav:hover { background: ${theme.accent}; color: ${isDarkMode ? '#000' : '#fff'}; transform: translateY(-2px); }
        #printable-slip {
            background: white; color: black; padding: 70px; border-radius: 28px;
            box-shadow: 0 30px 60px rgba(0,0,0,${isDarkMode ? '0.6' : '0.06'});
            position: relative; overflow: hidden;
        }
        #printable-slip::before {
            content: "VIRTUAL ACTUALIZE"; position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg); font-size: 85px;
            font-weight: 800; color: rgba(0,0,0,0.015); z-index: 0; white-space: nowrap; pointer-events: none;
        }
        .label-slip { font-size: 10px; color: #888; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        @media print {
            @page { margin: 0; size: auto; }
            body { background: white !important; padding: 0 !important; }
            .no-print { display: none !important; }
            #printable-slip { box-shadow: none !important; border: none !important; padding: 40px !important; width: 100% !important; border-radius: 0 !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @media (max-width: 600px) {
            #printable-slip { padding: 30px; border-radius: 0; }
        }
    `;

    return (
        <div style={{ padding: '40px 20px' }}>
            <style>{styles}</style>
            
            <div className="nav-header no-print">
                <button onClick={() => navigate(-1)} className="btn-nav">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    KEMBALI
                </button>
                <button onClick={() => window.print()} className="btn-nav" style={{ background: theme.accent, color: isDarkMode ? '#000' : '#fff' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
                    CETAK SLIP
                </button>
            </div>

            <div id="printable-slip" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Header Logo */}
                    <div style={{ textAlign: 'center', marginBottom: '50px', borderBottom: '1.5px solid #000', paddingBottom: '30px' }}>
                        <img src="/logo-va.jpeg" alt="Logo" style={{ height: '60px', marginBottom: '15px', mixBlendMode: 'multiply' }} />
                        <h2 style={{ letterSpacing: '10px', margin: '0', fontWeight: '300', fontSize: '24px', textTransform: 'uppercase' }}>Virtual Actualize</h2>
                <p style={{ fontSize: '10px', letterSpacing: '5px', textTransform: 'uppercase', margin: '8px 0', fontStyle: 'italic', opacity: 0.6 }}>Profesional Renovasi & Konstruksi</p>
                    </div>

                    {/* Info Penerima */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '50px', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <span className="label-slip">Penerima Gaji</span>
                            <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '8px', color: '#000' }}>{slip.nama_karyawan?.toUpperCase()}</div>
                            <div style={{ fontSize: '12px', color: '#555', marginTop: '5px', fontWeight: '500' }}>{slip.jabatan} • {slip.nama_proyek}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span className="label-slip">ID Dokumen</span>
                            <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '8px' }}>#VA-PAY-{slip.id}-{new Date().getFullYear()}</div>
                            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{slip.tanggal}</div>
                        </div>
                    </div>

                    {/* Rincian Biaya */}
                    <div style={{ marginBottom: '50px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ fontSize: '14px', color: '#444' }}>Gaji Pokok ({hariKerja} Hari x Rp {gajiPerHari.toLocaleString('id-ID')})</span>
                            <span style={{ fontWeight: '700', fontSize: '15px' }}>Rp {gajiPokok.toLocaleString('id-ID')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid #f0f0f0', color: '#e74c3c' }}>
                            <span style={{ fontSize: '14px' }}>Potongan Kasbon / Lainnya</span>
                            <span style={{ fontWeight: '700', fontSize: '15px' }}>- Rp {kasbon.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    {/* Grand Total */}
                    <div style={{ background: '#000', color: '#fff', padding: '30px', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '3px' }}>TOTAL GAJI BERSIH</div>
                        <div style={{ fontSize: '28px', fontWeight: '800' }}>Rp {totalTakeHomePay.toLocaleString('id-ID')}</div>
                    </div>

                    {/* Tanda Tangan */}
                    <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ textAlign: 'center', width: '200px' }}>
                            <p style={{ fontSize: '11px', marginBottom: '60px', opacity: 0.6 }}>Penerima,</p>
                            <div style={{ borderTop: '1.5px solid #000', width: '160px', margin: '0 auto' }}></div>
                            <p style={{ fontSize: '11px', fontWeight: '700', marginTop: '10px' }}>{slip.nama_karyawan}</p>
                        </div>
                        <div style={{ textAlign: 'center', width: '200px' }}>
                            <p style={{ fontSize: '11px', marginBottom: '60px', opacity: 0.6 }}>Administrasi,</p>
                            <div style={{ borderTop: '1.5px solid #000', width: '160px', margin: '0 auto' }}></div>
                    <p style={{ fontSize: '11px', fontWeight: '700', marginTop: '10px' }}>Bagian Keuangan</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '70px', textAlign: 'center', fontSize: '9px', color: '#bbb', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        Computer Generated Slip • Virtual Actualize System
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SalarySlip;
