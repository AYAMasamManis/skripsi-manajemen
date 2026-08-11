import { useState } from 'react';
import axios from '../config/api';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Ambil status Night Mode agar sinkron dengan Home
  const [isDarkMode] = useState(localStorage.getItem('nightMode') === 'true');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // PERBAIKAN: Menggunakan path relatif agar jalan di hosting manapun
      const res = await axios.post('login.php', formData);
      
      if (res.data.success) {
        localStorage.setItem('user_va', JSON.stringify(res.data.user)); 
        navigate('/'); 
      } else {
        setError(res.data.message || 'Username atau Password salah.');
      }
    } catch (err) {
      // Log error ke console buat debug kalau perlu
      console.error("Login Error:", err);
      setError('Gagal terhubung ke server. Pastikan database aktif.');
    } finally {
      setLoading(false);
    }
  };

  const theme = {
    bg: isDarkMode ? '#0a0a0a' : '#ffffff',
    text: isDarkMode ? '#f0f0f0' : '#1a1a1a',
    card: isDarkMode ? '#141414' : '#ffffff',
    inputBg: isDarkMode ? '#1a1a1a' : '#fafafa',
    border: isDarkMode ? '#222222' : '#eeeeee',
    accent: isDarkMode ? '#ffffff' : '#1a1a1a',
    accentText: isDarkMode ? '#000000' : '#ffffff'
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    .login-container { 
      height: 100vh; display: flex; justify-content: center; align-items: center; 
      background-color: ${theme.bg}; font-family: 'Inter', sans-serif; 
      transition: background-color 0.4s ease;
    }
    .login-card { 
      width: 100%; max-width: 380px; padding: 40px; text-align: center; box-sizing: border-box;
      background: ${isDarkMode ? theme.card : 'transparent'};
      border-radius: 24px;
      border: ${isDarkMode ? `1px solid ${theme.border}` : 'none'};
      box-shadow: ${isDarkMode ? '0 20px 50px rgba(0,0,0,0.5)' : 'none'};
    }
    .login-input { 
      width: 100%; padding: 14px; margin-bottom: 15px; border: 1px solid ${theme.border}; 
      border-radius: 12px; font-size: 14px; outline: none; box-sizing: border-box;
      background: ${theme.inputBg}; 
      color: ${theme.text}; 
      transition: 0.3s;
    }
    .login-input:focus { 
      border-color: ${isDarkMode ? '#555' : '#1a1a1a'}; 
      background: ${isDarkMode ? '#222' : '#fff'}; 
    }
    .btn-login { 
      width: 100%; padding: 18px; background: ${theme.accent}; color: ${theme.accentText}; border: none; 
      border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 11px;
      letter-spacing: 2px; transition: 0.3s; margin-top: 10px;
      text-transform: uppercase;
    }
    .btn-login:hover { 
      opacity: 0.9;
      transform: translateY(-1px); 
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    .btn-login:disabled { background: #555; cursor: not-allowed; opacity: 0.5; }
    
    .label-min { 
      display: block; text-align: left; font-size: 9px; font-weight: 800; 
      color: ${isDarkMode ? '#555' : '#aaa'}; letter-spacing: 2px; margin-bottom: 8px; text-transform: uppercase;
    }
    
    .login-input::placeholder {
      color: ${isDarkMode ? '#333' : '#ccc'};
    }

    .error-box {
      background-color: ${isDarkMode ? 'rgba(192, 57, 43, 0.1)' : '#fff5f5'};
      color: #c0392b; padding: 12px; border-radius: 12px; font-size: 12px; 
      margin-bottom: 20px; border: 1px solid rgba(192, 57, 43, 0.2);
      font-weight: 500;
    }

    .logo-img {
      height: 70px; margin-bottom: 20px; 
      filter: ${isDarkMode ? 'invert(1) brightness(2)' : 'none'};
      mix-blend-mode: ${isDarkMode ? 'screen' : 'multiply'};
    }
    @media (max-width: 480px) {
      .login-container { padding: 12px; box-sizing: border-box; }
      .login-card { padding: 30px 20px; }
    }
  `;

  return (
    <div className="login-container">
      <style>{styles}</style>
      <div className="login-card">
        <img 
          src="/logo-va.jpeg" 
          alt="VA Logo" 
          className="logo-img"
        />
        <h2 style={{ fontSize: '18px', letterSpacing: '8px', fontWeight: '300', textTransform: 'uppercase', color: theme.text, margin: '0 0 10px 0' }}>
          VIRTUAL ACTUALIZE
        </h2>
        <p style={{ fontSize: '8px', color: '#666', letterSpacing: '5px', textTransform: 'uppercase', marginBottom: '50px' }}>
          Construction Management
        </p>

        <form onSubmit={handleLogin}>
          {error && (
            <div className="error-box">
              {error}
            </div>
          )}
          
          <div style={{ marginBottom: '20px' }}>
              <span className="label-min">Nama Pengguna</span>
            <input 
              className="login-input"
              type="text" 
                placeholder="Masukkan nama pengguna"
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required 
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
              <span className="label-min">Kata Sandi</span>
            <input 
              className="login-input"
              type="password" 
                placeholder="Masukkan kata sandi"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required 
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'MEMVERIFIKASI...' : 'MASUK KE SISTEM'}
          </button>
        </form>

        <div style={{ marginTop: '60px', borderTop: `1px solid ${theme.border}`, paddingTop: '25px', opacity: 0.3 }}>
          <p style={{ fontSize: '9px', color: theme.text, letterSpacing: '2px', fontWeight: '600' }}>
            VA CONSTRUCTION • BI UNIT • 2026
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
