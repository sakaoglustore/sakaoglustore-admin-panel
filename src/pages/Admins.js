import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './GiftBoxes.css';

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    isSuperAdmin: false,
    permissions: {
      orders: false,
      users: false,
      products: false,
    },
  });

  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await axios.get('https://api.sakaoglustore.net/api/admins/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins(res.data);
    } catch (err) {
      alert('Adminler alınamadı');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://api.sakaoglustore.net/api/admins/add', form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Admin eklendi');
      setForm({
        name: '',
        email: '',
        password: '',
        isSuperAdmin: false,
        permissions: {
          orders: false,
          users: false,
          products: false,
        },
      });
      fetchAdmins();
    } catch (err) {
      alert(err.response?.data?.message || 'Ekleme başarısız');
    }
  };

  // ⛔ Yetki kontrolü sadece ekrana çıktı olarak yapılır
  if (!isSuperAdmin) {
    return <div>Bu sayfaya erişim sadece süper adminlere açıktır.</div>;
  }

  return (
    <div className="giftbox-container">
      <h2>🛡️ Admin Yönetimi</h2>

      <form onSubmit={handleAdd} className="giftbox-form">
        <input
          name="name"
          placeholder="Ad Soyad"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Şifre"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <label>
          <input
            type="checkbox"
            checked={form.isSuperAdmin}
            onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })}
          />
          Süper Admin mi?
        </label>

        {!form.isSuperAdmin && (
          <div style={{ marginBottom: 10 }}>
            <strong>Yetkiler:</strong><br />
            <label>
              <input
                type="checkbox"
                checked={form.permissions.orders}
                onChange={(e) =>
                  setForm({ ...form, permissions: { ...form.permissions, orders: e.target.checked } })
                }
              />
              Sipariş Yönetimi
            </label>
            <br />
            <label>
              <input
                type="checkbox"
                checked={form.permissions.users}
                onChange={(e) =>
                  setForm({ ...form, permissions: { ...form.permissions, users: e.target.checked } })
                }
              />
              Kullanıcı Yönetimi
            </label>
            <br />
            <label>
              <input
                type="checkbox"
                checked={form.permissions.products}
                onChange={(e) =>
                  setForm({ ...form, permissions: { ...form.permissions, products: e.target.checked } })
                }
              />
              Ürün Yönetimi
            </label>
          </div>
        )}

        <button type="submit">Yeni Admin Ekle</button>
      </form>

      <h3>👥 Mevcut Adminler</h3>
      <ul>
        {admins.map((a) => (
          <li key={a._id}>
            <strong>{a.name}</strong> – {a.email}{' '}
            {a.isSuperAdmin ? (
              <span style={{ color: 'green' }}>⭐ Süper</span>
            ) : (
              <span style={{ fontSize: 12 }}>
                [{Object.entries(a.permissions)
                  .filter(([_, v]) => v)
                  .map(([k]) => k)
                  .join(', ') || 'Yetki yok'}]
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Admins;
