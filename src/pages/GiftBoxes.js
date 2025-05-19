import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './GiftBoxes.css';
import EditGiftBoxModal from '../components/EditGiftBoxModal';

const GiftBoxes = () => {
  const [giftBoxes, setGiftBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);

  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;

  useEffect(() => {
    fetchGiftBoxes();
  }, []);
  const fetchGiftBoxes = async () => {
    try {
      const res = await axios.get('https://api.sakaoglustore.net/api/gifts/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGiftBoxes(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching gift boxes:", err);
      setLoading(false);
    }
  };
  const handleSave = async (id, updatedData) => {
    try {
      console.log('Saving gift box data:', id, updatedData);
      const response = await axios.put(`https://api.sakaoglustore.net/api/gifts/${id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Save response:', response.data);
      setSelectedBox(null);
      fetchGiftBoxes();
    } catch (err) {
      console.error('Save error:', err);
      alert('Kaydetme başarısız: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm('Bu ürünü silmek istediğinize emin misiniz?');
    if (!confirm) return;

    try {
      await axios.delete(`https://api.sakaoglustore.net/api/gifts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedBox(null);
      fetchGiftBoxes();
    } catch (err) {
      alert('Ürün silinemedi');
    }
  };

  if (!isSuperAdmin && !admin?.permissions?.products) {
    return <div>Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return (
    <div className="giftbox-container">
      <h2>🎁 Ürünlerim Sayfası</h2>
      {loading ? (
        <p>Yükleniyor...</p>
      ) : giftBoxes.length === 0 ? (
        <p>Hiç ürün bulunamadı.</p>
      ) : (
        <div className="giftbox-grid">
          {giftBoxes.map((box) => (
            <div key={box._id} className="giftbox-card">
              <img src={box.image} alt={box.name} />
              <h3>{box.name}</h3>
              <p className="desc">{box.description}</p>
              <p><strong>Fiyat:</strong> ₺{(box.fullPrice || (box.price * (1 + box.kdvOrani) + box.kutuUcreti)).toFixed(2)}</p>
              <button className="edit-btn" onClick={() => setSelectedBox(box)}>Düzenle</button>
            </div>
          ))}
        </div>
      )}

      {selectedBox && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <EditGiftBoxModal
            box={selectedBox}
            onClose={() => setSelectedBox(null)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  );
};

export default GiftBoxes;