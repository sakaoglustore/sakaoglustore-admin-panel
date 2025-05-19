import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/adminAuth', {
        identifier,
        password,
      });

      // ✅ Hem token hem user bilgisini kaydet
      localStorage.setItem('admin', JSON.stringify({
        token: res.data.token,
        user: res.data.user
      }));

      // ✅ Başarılı giriş → yönlendir
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş başarısız');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <h2>Admin Giriş</h2>

        <input
          type="text"
          placeholder="Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Giriş Yap</button>

        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
};

export default Login;
