import React, { useState } from 'react';
import axios from 'axios';
import './AdminCreated.css';

const AdminCreate = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    isSuperAdmin: false,
    permissions: {
      orders: false,
      users: false,
      products: false
    }
  });

  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;

  if (!isSuperAdmin) return <div>Bu sayfaya sadece süper admin erişebilir.</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://api.sakaoglustore.net/api/admins/add', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Admin başarıyla eklendi');
      setForm({
        name: '',
        email: '',
        password: '',
        isSuperAdmin: false,
        permissions: { orders: false, users: false, products: false }
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Ekleme hatası');
    }
  };

  return (
    <div className="giftbox-container">
      <h2>🛠️ Yeni Admin Oluştur</h2>
      <form onSubmit={handleSubmit} className="giftbox-form">
        <input placeholder="Ad Soyad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input placeholder="Şifre" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.isSuperAdmin}
            onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })}
          />
          Süper Admin mi?
        </label>

        {!form.isSuperAdmin && (
          <div className="permission-labels">
            <label><input type="checkbox" checked={form.permissions.orders} onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, orders: e.target.checked } })} /> Sipariş</label>
            <label><input type="checkbox" checked={form.permissions.users} onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, users: e.target.checked } })} /> Kullanıcı</label>
            <label><input type="checkbox" checked={form.permissions.products} onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, products: e.target.checked } })} /> Ürün</label>
          </div>
        )}

        <button type="submit" className="save-btn">Kaydet</button>
      </form>
    </div>
  );
};

export default AdminCreate;
