import { useState, useEffect } from 'react';
import axios from '../config/api';
import { useNavigate } from 'react-router-dom';

function UpdateProgress() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [foto, setFoto] = useState(null);
  const [ket, setKet] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    // Tendang jika bukan karyawan atau belum login
    if (!user) { navigate('/login'); return; }
    
    axios.get('get_projects.php')
      .then(res => setProjects(res.data))
      .catch(err => console.error("Gagal ambil proyek", err));
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!foto || !selectedProject) return alert("Mohon pilih proyek dan foto!");

    setLoading(true);
    const data = new FormData();
    data.append('project_id', selectedProject);
    data.append('user_id', user.id);
    data.append('foto', foto);
    data.append('keterangan', ket);

    try {
      const res = await axios.post('upload_progress.php', data);
      if (res.data.status === 'success') {
        alert("Laporan Berhasil Terkirim! 🚀");
        setKet('');
        setFoto(null);
        // Reset input file secara manual
        document.getElementById('fileInput').value = "";
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;400;700&display=swap');
    .prog-container { min-height: 100vh; background: #0a0a0a; color: #fff; font-family: 'Montserrat', sans-serif; padding: 20px; }
    .header { text-align: center; margin-bottom: 40px; padding-top: 20px; }
    .header h1 { font-weight: 200; letter-spacing: 8px; font-size: 20px; text-transform: uppercase; }
    .header p { font-size: 10px; color: #666; letter-spacing: 2px; }
    
    .form-card { background: #141414; padding: 30px; border-radius: 25px; border: 1px solid #222; }
    label { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 10px; }
    
    select, textarea, input[type="file"] {
      width: 100%; padding: 15px; background: #1a1a1a; border: 1px solid #333; border-radius: 12px;
      color: #fff; margin-bottom: 25px; outline: none; box-sizing: border-box; font-family: 'Montserrat';
    }
    
    .btn-submit {
      width: 100%; padding: 18px; border-radius: 12px; border: none;
      background: #fff; color: #000; font-weight: 800; text-transform: uppercase;
      letter-spacing: 2px; cursor: pointer; transition: 0.3s;
    }
    .btn-submit:disabled { background: #333; color: #666; }
    .btn-back { display: block; text-align: center; margin-top: 20px; color: #555; font-size: 11px; text-decoration: none; }
  `;

  return (
    <div className="prog-container">
      <style>{styles}</style>
      <div className="header">
        <h1>Progress Report</h1>
        <p>USER: {user?.nama_lengkap?.toUpperCase()}</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <label>Project Name</label>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} required>
            <option value="">-- SELECT PROJECT --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.nama_proyek}</option>
            ))}
          </select>

          <label>Documentation (Photo)</label>
          <input 
            id="fileInput"
            type="file" 
            accept="image/*" 
            capture="environment" // Otomatis buka kamera di HP
            onChange={(e) => setFoto(e.target.files[0])} 
            required 
          />

          <label>Work Description</label>
          <textarea 
            placeholder="What has been done today?" 
            value={ket}
            onChange={(e) => setKet(e.target.value)}
          />

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "SENDING..." : "SUBMIT REPORT"}
          </button>
        </form>
      </div>
      
      <button onClick={() => {localStorage.clear(); navigate('/login')}} className="btn-back">LOGOUT SYSTEM</button>
    </div>
  );
}

export default UpdateProgress;
