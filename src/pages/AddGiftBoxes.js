import React, { useState } from 'react';
import axios from 'axios';
import './AddGiftBox.css';

const AddGiftBox = () => {
  const [form, setForm] = useState({
    category: '',
    name: '',
    price: '',
    image: '',
    description: '',
    kdvOrani: '',
    kutuUcreti: ''
  });


  const token = JSON.parse(localStorage.getItem('admin'))?.token;


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/gifts', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Ürün eklendi!');
      setForm({
        category: '',
        name: '',
        price: '',
        image: '',
        description: '',
        kdvOrani: '',
        kutuUcreti: ''
      });
    } catch (err) {
      alert('Ekleme başarısız');
    }
  };



  return (
    <div className="add-giftbox-container">
      <h2>➕ Ürün Ekle</h2>
      <form onSubmit={handleSubmit} className="giftbox-form">
        <input name="category" placeholder="Kategori" value={form.category} onChange={handleChange} required />
        <input name="name" placeholder="Ürün Adı" value={form.name} onChange={handleChange} required />
        <input name="price" placeholder="Fiyat" type="number" value={form.price} onChange={handleChange} required />
        <input name="image" placeholder="Resim URL" value={form.image} onChange={handleChange} required />
        <textarea name="description" placeholder="Açıklama" value={form.description} onChange={handleChange} />
        <input name="kdvOrani" placeholder="KDV Oranı" type="number" value={form.kdvOrani} onChange={handleChange} />
        <input name="kutuUcreti" placeholder="Kutu Ücreti" type="number" value={form.kutuUcreti} onChange={handleChange} />
        <button type="submit">Kaydet</button>
      </form>
    </div>
  );
};

export default AddGiftBox;
