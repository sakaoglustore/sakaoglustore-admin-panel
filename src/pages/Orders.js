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
  const [paymentText, setPaymentText] = useState('');
  const [verificationError, setVerificationError] = useState('');

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
      const res = await axios.get(`https://api.sakaoglustore.net/api/orders?query=${searchQuery}&page=${pageNumber}&limit=${pageSize}`, {
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
      await axios.put(`https://api.sakaoglustore.net/api/orders/${orderId}/tracking`, { trackingNumber: newTracking }, {
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
      const address = order.address || {};
      const fullAddress = address.fullAddress || '';
      const city = address.city || '';
      const district = address.district || '';
      const phone = address.phone || '';
      const name = `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`;
      const email = order.userId?.email || '';

      xmlContent += `
  <cargo>
    <receiver_name>${name}</receiver_name>
    <receiver_address>${fullAddress}</receiver_address>
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
  };  const handleVerifyOrder = async (orderId, status) => {
    try {
      const response = await axios.put(
        `https://api.sakaoglustore.net/api/orders/verify-order/${orderId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (status === 'confirmed' && response.data.order.confirmationCode) {
        alert(`Sipariş onaylandı! Onay Kodu: ${response.data.order.confirmationCode}`);
      }
      
      fetchOrders(query, page);
    } catch (error) {
      console.error('Hata detayı:', error.response?.data || error.message);
      alert(`Sipariş durumu güncellenirken hata oluştu: ${error.response?.data?.message || error.message}`);
      setVerificationError(`Güncelleme hatası: ${error.response?.data?.message || error.message}`);
    }
  };
  const handlePaymentVerification = () => {
    // Dekonttaki referans numarasını çıkar
    const reference = paymentText.split('(')[0].trim();
    
    // Sipariş ID'si ile eşleştirme yap
    const matchingOrder = orders.find(order => order._id === reference);

    if (matchingOrder) {
      if (matchingOrder.status === 'pending') {
        handleVerifyOrder(matchingOrder._id, 'confirmed');
        setVerificationError('');
        setPaymentText('');
      } else {
        setVerificationError('Bu sipariş zaten onaylanmış veya reddedilmiş.');
      }
    } else {
      setVerificationError('Eşleşen sipariş bulunamadı.');
    }
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
          const address = order.address || {};

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
                {address.title ? (
                  <>
                    <div><strong>{address.title}</strong></div>
                    <div>{address.fullAddress}</div>
                    <div>{address.city}, {address.district}</div>
                    <div>📱 {address.phone}</div>
                  </>
                ) : (
                  <em>Adres bilgisi bulunamadı.</em>
                )}
              </div>

              <div className="order-status">
                <strong>Durum: </strong>
                <span className={`status-${order.status}`}>
                  {order.status === 'pending' ? 'Ödeme Bekleniyor' : 
                   order.status === 'confirmed' ? 'Onaylandı' : 'Reddedildi'}
                </span>
              </div>

              {order.status === 'pending' && (
                <div className="order-actions">
                  <button 
                    className="confirm-btn"
                    onClick={() => handleVerifyOrder(order._id, 'confirmed')}
                  >
                    Ödemeyi Onayla
                  </button>
                  <button 
                    className="reject-btn"
                    onClick={() => handleVerifyOrder(order._id, 'rejected')}
                  >
                    Reddet
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      <div className="pagination-buttons">
        <button onClick={prevPage} disabled={page === 1}>⬅️ Önceki</button>
        <span>Sayfa {page}</span>
        <button onClick={nextPage} disabled={!hasMore}>Sonraki ➡️</button>
      </div>

      {/* Ödeme Doğrulama Bölümü */}
      <div className="payment-verification">
        <h3>Ödeme Doğrulama</h3>
        <input
          type="text"
          placeholder="Dekonttaki sipariş ID'sini girin..."
          value={paymentText}
          onChange={(e) => setPaymentText(e.target.value)}
          className="payment-input"
        />
        <button onClick={handlePaymentVerification} className="verify-payment-btn">
          Doğrula
        </button>
        {verificationError && <div className="verification-error">{verificationError}</div>}
      </div>
    </div>
  );
};

export default Orders;
