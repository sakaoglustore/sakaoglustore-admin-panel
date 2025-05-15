// src/pages/Orders.jsx

'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;
  const pageSize = 50;

  useEffect(() => {
    fetchOrders(query, page);
  }, [page, query]);

  const fetchOrders = async (searchQuery = '', pageNumber = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/orders?query=${searchQuery}&page=${pageNumber}&limit=${pageSize}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data.orders || []);
      setHasMore(res.data.orders?.length === pageSize);
    } catch (err) {
      console.error('Sipariş çekme hatası:', err);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };

  const handleTrackingChange = (orderId, value) => {
    setTrackingInputs(prev => ({ ...prev, [orderId]: value }));
  };

  const handleTrackingUpdate = async (orderId) => {
    try {
      const newTracking = trackingInputs[orderId]?.trim();
      if (!newTracking) return;
      await axios.put(`http://localhost:5000/api/orders/${orderId}/tracking`, { trackingNumber: newTracking }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders(query, page);
    } catch (err) {
      alert('Takip numarası güncellenemedi.');
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const generateRandomBagNumber = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  const exportToXML = () => {
  let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<orders>`;

  orders.forEach(order => {
    const matchedAddress = order.userId?.addresses?.find(a => a._id.toString() === order.addressId?.toString());

    const fullAddress = matchedAddress?.fullAddress || '';
    const city = matchedAddress?.city || '';
    const district = matchedAddress?.district || '';
    const combinedAddress = `${fullAddress}`;
    const phone = matchedAddress?.phone || '';
    const name = `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`;
    const email = order.userId?.email || '';

    xmlContent += `
  <cargo>
    <receiver_name>${name}</receiver_name>
    <receiver_address>${combinedAddress}</receiver_address>
    <city>${city}</city>
    <town>${district}</town>
    <phone_gsm>${phone}</phone_gsm>
    <email_address>${email}</email_address>
    <cargo_type>K</cargo_type>
    <payment_type>1</payment_type>
    <dispatch_number></dispatch_number>
    <referans_number>${order._id}</referans_number>
    <cargo_count>1</cargo_count>
    <cargo_content>Gift Box</cargo_content>
    <collection_type></collection_type>
    <invoice_number></invoice_number>
    <invoice_amount></invoice_amount>
    <file_bag_number>${generateRandomBagNumber()}</file_bag_number>
    <campaign_id></campaign_id>
    <campaign_code></campaign_code>
  </cargo>`;
  });

  xmlContent += `\n</orders>`;

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  saveAs(blob, 'siparisler.xml');
};


  const nextPage = () => {
    if (hasMore) setPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage(prev => prev - 1);
  };

  if (!isSuperAdmin && !admin?.permissions?.orders) {
    return <div>Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return (
    <div className="orders-container">
      <h2 className="orders-title">📦 Gelen Siparişler</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="İsim, e-posta ya da sipariş numarası ile ara..."
          value={query}
          onChange={handleSearch}
          className="search-input"
        />
        <button onClick={exportToXML} className="excel-export-btn">
          📥 Siparişleri XML İndir
        </button>
      </div>

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : orders.length === 0 ? (
        <p>Hiç sipariş bulunamadı.</p>
      ) : (
        orders.map(order => {
          const matchedAddress = order.userId?.addresses?.find(a => a._id === order.addressId);

          return (
<div key={order._id} className="order-card">
  <div className="order-header">
    <input
      type="checkbox"
      checked={selectedOrders.includes(order._id)}
      onChange={() => handleSelectOrder(order._id)}
    />
    <div>
      <strong>{order.userId.firstName} {order.userId.lastName}</strong><br />
      <span>{order.userId.email}</span><br />
      <small className="order-id">🆔 {order._id}</small>
    </div>
    <div>
      <span className="order-date">{new Date(order.createdAt).toLocaleString()}</span>
    </div>
  </div>

  {/* Ürünler Bölümü */}
  <div className="order-items">
    <strong>Ürünler:</strong>
    <ul>
      {order.items.map((item, idx) => (
        <li key={idx}>
          {item.productId?.name || 'Ürün adı yok'} x {item.quantity}
        </li>
      ))}
    </ul>
  </div>

  {/* Adres Bölümü */}
  <div className="order-address">
    <strong>Adres:</strong><br />
    {(() => {
      const addressObj = order.userId.addresses?.find(addr => addr._id.toString() === order.addressId?.toString());
      if (addressObj) {
        return `${addressObj.title} - ${addressObj.fullAddress}`;
      } else {
        return <em>Adres bulunamadı.</em>;
      }
    })()}
  </div>

</div>

          );
        })
      )}

      <div className="pagination-buttons">
        <button onClick={prevPage} disabled={page === 1}>⬅️ Önceki</button>
        <span>Sayfa {page}</span>
        <button onClick={nextPage} disabled={!hasMore}>Sonraki ➡️</button>
      </div>
    </div>
  );
};

export default Orders;
