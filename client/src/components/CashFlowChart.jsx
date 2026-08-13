import PropTypes from 'prop-types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function CashFlowChart({ semuaTransaksi = [], isDarkMode }) {
  const processData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = new Date().getFullYear();
    const monthlyData = months.map(m => ({ month: m, masuk: 0, keluar: 0 }));

    semuaTransaksi.forEach(t => {
      const date = new Date(t.tanggal);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        const jenis = t.jenis?.toLowerCase();
        if (jenis === 'masuk' || jenis === 'income') {
            monthlyData[monthIndex].masuk += Number(t.jumlah || 0);
        } else {
            monthlyData[monthIndex].keluar += Number(t.jumlah || 0);
        }
      }
    });
    return monthlyData; 
  };

  const chartData = processData();

  // Komponen Custom Tooltip dengan warna teks spesifik
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', 
          padding: '12px 15px', 
          border: `1.5px solid ${isDarkMode ? '#333' : '#eee'}`, 
          borderRadius: '15px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          fontFamily: 'Montserrat'
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '800', color: isDarkMode ? '#888' : '#444' }}>
            {label?.toUpperCase()}
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: isDarkMode ? '#aaa' : '#666' }}>MASUK</span>
            <span style={{ fontSize: '12px', color: '#2ecc71', fontWeight: '800' }}>
              Rp {payload[0].value.toLocaleString('id-ID')}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ fontSize: '11px', color: isDarkMode ? '#aaa' : '#666' }}>KELUAR</span>
            <span style={{ fontSize: '12px', color: '#e74c3c', fontWeight: '800' }}>
              Rp {payload[1].value.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // VALIDASI PROPS UNTUK CUSTOM TOOLTIP (Agar ESLint tidak error)
  CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
    label: PropTypes.string,
  };

  return (
    <section aria-labelledby="cash-flow-chart-title">
      <h2 id="cash-flow-chart-title" style={{ margin: '0', padding: '22px 24px 0', fontFamily: 'Montserrat', fontSize: '12px', letterSpacing: '2px', color: isDarkMode ? '#f0f0f0' : '#1a1a1a' }}>DIAGRAM ARUS KAS TAHUN BERJALAN</h2>
    <div style={{ 
      width: '100%', 
      height: 300, 
      backgroundColor: isDarkMode ? '#141414' : '#fff', 
      padding: '30px 10px 10px 10px', 
      borderRadius: '0 0 24px 24px',
      overflow: 'hidden'
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ right: 20, left: 0, top: 10 }}>
          <defs>
            <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#2ecc71" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#e74c3c" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
          
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: isDarkMode ? '#888' : '#444', fontWeight: '600', letterSpacing: '1px', fontFamily: 'Montserrat' }} 
            padding={{ left: 35, right: 35 }}
            dy={15}
          />
          
          <YAxis hide={true} domain={['auto', 'auto']} /> 
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDarkMode ? '#333' : '#f0f0f0', strokeWidth: 1 }} />
          
          <Area type="monotone" dataKey="masuk" stroke="#2ecc71" strokeWidth={3} fillOpacity={1} fill="url(#colorMasuk)" animationDuration={2000} />
          <Area type="monotone" dataKey="keluar" stroke="#e74c3c" strokeWidth={2} fill="url(#colorKeluar)" strokeDasharray="5 5" animationDuration={2500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    </section>
  );
}

// VALIDASI PROPS UTAMA
CashFlowChart.propTypes = { 
  semuaTransaksi: PropTypes.array,
  isDarkMode: PropTypes.bool 
};

export default CashFlowChart;
