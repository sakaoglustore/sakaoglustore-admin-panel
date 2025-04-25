import React, { useState } from 'react';
import '../pages/GiftBoxes.css';

const EditGiftBoxModal = ({ box, onClose, onSave, onDelete }) => {
  const [items, setItems] = useState(JSON.parse(JSON.stringify(box.items)));
  const [details, setDetails] = useState({
    price: box.price,
    description: box.description,
    kdvOrani: box.kdvOrani,
    kutuUcreti: box.kutuUcreti,
    kargoUcreti: box.kargoUcreti || 0,
    image: box.image
  });

  const handleItemChange = (category, idx, field, value) => {
    const updated = { ...items };
    updated[category][idx][field] = value;
    setItems(updated);
  };

  const handleAddNewItem = (category) => {
    setItems(prev => ({
      ...prev,
      [category]: [...prev[category], { id: '', name: '' }]
    }));
  };

  const handleRemoveItem = (category, idx) => {
    const updated = { ...items };
    updated[category].splice(idx, 1);
    setItems(updated);
  };

  const handleDetailChange = (field, value) => {
    setDetails(prev => ({
      ...prev,
      [field]: ['price', 'kdvOrani', 'kutuUcreti', 'kargoUcreti'].includes(field)
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSave = () => {
    const cleanedItems = {
      low: items.low.filter(i => i.name.trim() && i.id.trim()),
      medium: items.medium.filter(i => i.name.trim() && i.id.trim()),
      high: items.high.filter(i => i.name.trim() && i.id.trim()),
    };

    const fullPrice =
      Number(details.price || 0) * (1 + Number(details.kdvOrani || 0)) +
      Number(details.kutuUcreti || 0) +
      Number(details.kargoUcreti || 0);

    onSave(box._id, {
      ...details,
      items: cleanedItems,
      fullPrice: parseFloat(fullPrice.toFixed(2))
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{box.name} – Ürün Düzenleme</h2>

        <label>Açıklama</label>
        <input type="text" value={details.description} onChange={(e) => handleDetailChange('description', e.target.value)} />

        <label>Ham Fiyat (₺)</label>
        <input type="number" value={details.price} onChange={(e) => handleDetailChange('price', e.target.value)} />

        <label>KDV Oranı (örn: 0.2)</label>
        <input type="number" value={details.kdvOrani} onChange={(e) => handleDetailChange('kdvOrani', e.target.value)} />

        <label>Kutu Ücreti (₺)</label>
        <input type="number" value={details.kutuUcreti} onChange={(e) => handleDetailChange('kutuUcreti', e.target.value)} />

        <label>Kargo Ücreti (₺)</label>
        <input type="number" value={details.kargoUcreti} onChange={(e) => handleDetailChange('kargoUcreti', e.target.value)} />

        <label>Resim URL</label>
        <input type="text" value={details.image} onChange={(e) => handleDetailChange('image', e.target.value)} />

        <div className="total-price-preview">
          Toplam Fiyat: ₺{(
            Number(details.price || 0) * (1 + Number(details.kdvOrani || 0)) +
            Number(details.kutuUcreti || 0) +
            Number(details.kargoUcreti || 0)
          ).toFixed(2)}
        </div>

        <div className="editable-items">
          {['low', 'medium', 'high'].map(category => (
            <div key={category}>
              <h4>{category.toUpperCase()} Items</h4>
              {items[category]?.map((item, i) => (
                <div key={i} className="item-row">
                  <input
                    value={item.name}
                    onChange={(e) => handleItemChange(category, i, 'name', e.target.value)}
                    placeholder="Item name"
                  />
                  <input
                    value={item.id}
                    onChange={(e) => handleItemChange(category, i, 'id', e.target.value)}
                    placeholder="Item ID"
                  />
                  <button className="remove-btn" onClick={() => handleRemoveItem(category, i)}>❌</button>
                </div>
              ))}
              <button className="add-btn" onClick={() => handleAddNewItem(category)}>+ Ürün Ekle</button>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="save-btn" onClick={handleSave}>Kaydet</button>
          <button className="delete-btn" onClick={() => onDelete(box._id)}>Sil</button>
          <button className="edit-btn" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
};

export default EditGiftBoxModal;
