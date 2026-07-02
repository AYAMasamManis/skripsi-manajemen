import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ProjectDetail from './pages/ProjectDetail'
import Login from './pages/Login'
import Settings from './pages/Settings' 
import Payroll from './pages/Payroll'
import SalarySlip from './pages/SalarySlip'
import VendorHutang from './pages/VendorHutang'
import Reports from './pages/Reports' // <-- IMPORT BARU UNTUK ANALYTICS!

function App() {
  return (
    <Router>
      <Routes>
        {/* HALAMAN LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* HALAMAN UTAMA */}
        <Route path="/" element={<Home />} />

        {/* HALAMAN DETAIL PROYEK */}
        <Route path="/project/:id" element={<ProjectDetail />} />

        {/* HALAMAN SETTINGS */}
        <Route path="/settings" element={<Settings />} />

        {/* HALAMAN PAYROLL (Input Gaji) */}
        <Route path="/payroll" element={<Payroll />} />

        {/* HALAMAN SLIP GAJI (Detail Cetak) */}
        <Route path="/salary-slip/:id" element={<SalarySlip />} />

        {/* HALAMAN REKAP HUTANG VENDOR */}
        <Route path="/vendor-hutang" element={<VendorHutang />} />

        {/* HALAMAN ANALYTICS BULANAN (Fitur Baru) */}
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Router>
  )
}

export default App;