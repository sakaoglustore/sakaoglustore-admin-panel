import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminManage.css';

const AdminManage = () => {
  const [admins, setAdmins] = useState([]);
  const [editIndex, setEditIndex] = useState(null);

  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;

  useEffect(() => {
    if (isSuperAdmin) fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admins/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(res.data);
    } catch (err) {
      alert('Admin listesi alınamadı');
    }
  };

  const handleCheckbox = (index, field) => {
    const updated = [...admins];
    updated[index].permissions[field] = !updated[index].permissions[field];
    setAdmins(updated);
  };

  const handleSave = async (id, index) => {
    try {
      const body = { permissions: admins[index].permissions };
      await axios.put(`http://localhost:5000/api/admins/update/${id}`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Güncellendi');
      setEditIndex(null);
    } catch (err) {
      alert('Güncelleme başarısız');
    }
  };

  const handleDelete = async (id) => {
    const onay = window.confirm('Bu admini silmek istediğinize emin misiniz?');
    if (!onay) return;

    try {
      await axios.delete(`http://localhost:5000/api/admins/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(admins.filter((a) => a._id !== id));
      alert('Admin silindi');
    } catch (err) {
      alert(err.response?.data?.message || 'Silme başarısız');
    }
  };

  if (!isSuperAdmin) return <div>Bu sayfaya yalnızca süper admin erişebilir.</div>;

  return (
    <div className="giftbox-container">
      <h2>👥 Adminleri Yönet</h2>

      {admins.map((a, i) => (
        <div key={a._id} className="admin-card">
          <strong>{a.name}</strong> — {a.email}{' '}
          {a.isSuperAdmin && <span className="tag super">⭐ Süper Admin</span>}

          {a.createdBy && (
            <div className="creator-info">Oluşturan: {a.createdBy.name}</div>
          )}

          {editIndex === i ? (
            <>
              <div className="permission-labels">
                <label>
                  <input type="checkbox" checked={a.permissions.orders} onChange={() => handleCheckbox(i, 'orders')} /> Sipariş
                </label>
                <label>
                  <input type="checkbox" checked={a.permissions.users} onChange={() => handleCheckbox(i, 'users')} /> Kullanıcı
                </label>
                <label>
                  <input type="checkbox" checked={a.permissions.products} onChange={() => handleCheckbox(i, 'products')} /> Ürün
                </label>
              </div>
              <button onClick={() => handleSave(a._id, i)} className="save-btn">Kaydet</button>
            </>
          ) : (
            <>
              <span className="tag">
                [{Object.entries(a.permissions).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'Yetki yok'}]
              </span>

              {/* 🛑 superadmin@example.com editlenemez */}
              {a.email !== 'superadmin@example.com' && (
                <button onClick={() => setEditIndex(i)} className="edit-btn">Düzenle</button>
              )}

              {/* 🛑 sadece superadmin@example.com diğerlerini silebilir, ama kendisini ve süperadmin hesabını silemez */}
              {admin.email === 'superadmin@example.com' &&
                a._id !== admin._id &&
                a.email !== 'superadmin@example.com' && (
                  <button onClick={() => handleDelete(a._id)} className="delete-btn">Sil</button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminManage;
