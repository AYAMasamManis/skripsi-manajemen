import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Settings() {
  const userVa = JSON.parse(localStorage.getItem('user_va'));
  const navigate = useNavigate(); 
  const [isDarkMode] = useState(localStorage.getItem('nightMode') === 'true');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false); // Pop-up success state
  
  const [formData, setFormData] = useState({
    id: userVa?.id,
    username: userVa?.username || '', 
    nama_lengkap: userVa?.nama_lengkap || '',
    password: ''
  });

  const [message, setMessage] = useState('');

  const handleUpdate = (e) => {
    e.preventDefault();
    setLoading(true);
    axios.post('http://localhost/skripsi-manajemen/api/update_profile.php', formData)
      .then(res => {
        if(res.data.status === 'success') {
          // UPDATE DATA DI BROWSER (KTP DIGITAL)
          const currentUser = JSON.parse(localStorage.getItem('user_va'));
          const newUser = { 
            ...currentUser, 
            username: formData.username,
            nama_lengkap: formData.nama_lengkap 
          };
          localStorage.setItem('user_va', JSON.stringify(newUser));
          
          // MUNCULKAN POP-UP MEWAH
          setShowToast(true);
          
          setTimeout(() => {
            setShowToast(false);
            navigate('/');
            window.location.reload(); 
          }, 2000);
        } else {
          setMessage('❌ ' + (res.data.message || 'Update failed'));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal update:", err);
        setMessage('❌ Connection to server failed');
        setLoading(false);
      });
  };

  const theme = {
    bg: isDarkMode ? '#0a0a0a' : '#f4f6f8',
    text: isDarkMode ? '#f0f0f0' : '#1a1a1a',
    card: isDarkMode ? '#141414' : '#ffffff',
    border: isDarkMode ? '#222222' : '#eef0f2',
    inputBg: isDarkMode ? '#1a1a1a' : '#ffffff',
    muted: '#888'
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;400;600;700;800&display=swap');
    
    .settings-container {
      background-color: ${theme.bg};
      min-height: 100vh;
      padding: 40px 20px;
      color: ${theme.text};
      font-family: 'Inter', sans-serif;
      transition: 0.4s ease;
    }

    .settings-input {
      width: 100%; padding: 16px; margin-top: 10px; border-radius: 14px; 
      border: 1.5px solid ${theme.border}; background: ${theme.inputBg}; 
      color: ${theme.text}; outline: none; transition: 0.3s; font-size: 14px;
      box-sizing: border-box;
    }

    .settings-input:focus { 
      border-color: ${isDarkMode ? '#444' : '#ccc'}; 
      box-shadow: 0 0 0 4px ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
    }

    .btn-save-settings {
      width: 100%; padding: 20px; border-radius: 14px; border: none; 
      background: ${isDarkMode ? '#ffffff' : '#1a1a1a'}; color: ${isDarkMode ? '#000000' : '#ffffff'}; 
      font-weight: 800; cursor: pointer; letter-spacing: 2px; font-size: 11px; 
      transition: 0.3s; margin-top: 10px; text-transform: uppercase;
    }

    .btn-save-settings:hover { opacity: 0.9; transform: translateY(-2px); }

    /* POP-UP SUCCESS STYLES */
    .toast-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
      display: flex; justify-content: center; align-items: center; z-index: 9999;
    }

    .toast-card {
      background: ${theme.card}; padding: 40px; border-radius: 30px;
      text-align: center; border: 1px solid ${theme.border};
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      width: 90%; max-width: 320px;
      animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes popIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (max-width: 600px) {
      .settings-container { padding: 20px 15px; }
      .settings-card { padding: 30px 20px !important; border-radius: 20px !important; }
      header h1 { font-size: 28px !important; }
    }
  `;

  return (
    <div className="settings-container">
      <style>{styles}</style>
      
      {/* OVERLAY POP-UP BERHASIL */}
      {showToast && (
        <div className="toast-overlay">
          <div className="toast-card">
            <div style={{ 
              width: '60px', height: '60px', borderRadius: '50%', background: '#2ecc71',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>SUCCESS</h3>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.6 }}>Account Synchronized</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '550px', margin: '0 auto' }}>
        
        {/* NAV TOP */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <Link to="/" style={{ color: theme.muted, textDecoration: 'none', fontSize: '10px', letterSpacing: '2px', fontWeight: '700' }}>
            ← BACK TO DASHBOARD
          </Link>
          <div style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '3px', opacity: 0.4 }}>
            VA SYSTEM v1.0
          </div>
        </div>

        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontWeight: '200', fontSize: '36px', margin: '0', letterSpacing: '-1.5px' }}>
            Account Settings
          </h1>
          <p style={{ color: theme.muted, fontSize: '12px', marginTop: '10px', letterSpacing: '0.5px' }}>
            Manage credentials and administrative profile
          </p>
        </header>

        <div className="settings-card" style={{ 
          background: theme.card, padding: '45px', borderRadius: '30px', 
          border: `1px solid ${theme.border}`, 
          boxShadow: `0 20px 60px rgba(0,0,0,${isDarkMode ? '0.4' : '0.03'})` 
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '45px' }}>
            <div style={{ 
              width: '90px', height: '90px', borderRadius: '50%', 
              background: isDarkMode ? '#1a1a1a' : '#f9f9f9', margin: '0 auto 20px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              border: `1.5px solid ${theme.border}`
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: '800', letterSpacing: '3px', color: theme.muted }}>
              ROLE: {userVa?.role?.toUpperCase()}
            </p>
          </div>

          <form onSubmit={handleUpdate}>
            {/* USERNAME */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '9px', fontWeight: '800', color: theme.muted, letterSpacing: '2.5px' }}>USERNAME (LOGIN KEY)</label>
              <input 
                className="settings-input"
                value={formData.username} 
                onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                required
              />
            </div>

            {/* FULL NAME */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '9px', fontWeight: '800', color: theme.muted, letterSpacing: '2.5px' }}>FULL NAME (DISPLAY)</label>
              <input 
                className="settings-input"
                value={formData.nama_lengkap} 
                onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})}
                required
              />
            </div>

            {/* PASSWORD */}
            <div style={{ marginBottom: '35px' }}>
              <label style={{ fontSize: '9px', fontWeight: '800', color: theme.muted, letterSpacing: '2.5px' }}>SECURITY KEY / PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Leave blank to keep current"
                  className="settings-input"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '18px', top: '60%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {message && (
              <div style={{ padding: '15px', borderRadius: '12px', background: isDarkMode ? 'rgba(231,76,60,0.1)' : '#fff5f5', color: '#e74c3c', fontSize: '11px', textAlign: 'center', marginBottom: '25px', fontWeight: '700', border: '1px solid rgba(231,76,60,0.2)' }}>
                {message}
              </div>
            )}

            <button type="submit" className="btn-save-settings" disabled={loading}>
              {loading ? 'SYNCHRONIZING...' : 'UPDATE ADMINISTRATIVE DATA'}
            </button>
          </form>
        </div>

        <div style={{ marginTop: '50px', textAlign: 'center', opacity: 0.3 }}>
          <p style={{ fontSize: '9px', letterSpacing: '3px', fontWeight: '700' }}>VIRTUAL ACTUALIZE • 2026</p>
        </div>
      </div>
    </div>
  );
}

export default Settings;