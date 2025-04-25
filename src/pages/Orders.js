import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState({});

  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (searchQuery = '') => {
    try {
      const res = await axios.get(`https://api.sakaoglustore.net/api/orders?query=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const q = e.target.value;
    setQuery(q);
    fetchOrders(q);
  };

  const handleTrackingChange = (orderId, value) => {
    setTrackingInputs(prev => ({ ...prev, [orderId]: value }));
  };

  const handleTrackingUpdate = async (orderId) => {
    try {
      const newTracking = trackingInputs[orderId]?.trim();
      if (!newTracking) return;

      await axios.put(
        `https://api.sakaoglustore.net/api/orders/${orderId}/tracking`,
        { trackingNumber: newTracking },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchOrders(query);
    } catch (err) {
      alert('Güncelleme başarısız.');
    }
  };

  if (!isSuperAdmin && !admin?.permissions?.orders) {
    return <div>Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return (
    <div className="orders-container">
      <h2 className="orders-title">📦 Gelen Siparişler</h2>
      <input
        type="text"
        placeholder="İsim, e-posta ya da sipariş numarası ile ara..."
        value={query}
        onChange={handleSearch}
        className="search-input"
      />
      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : orders.length === 0 ? (
        <p>Hiç sipariş bulunamadı.</p>
      ) : (
        orders.map(order => {
          const matchedAddress = order.userId?.addresses?.find(
            addr => addr._id?.toString() === order.addressId?.toString()
          );

          return (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div>
                  <strong>{order.userId.firstName} {order.userId.lastName}</strong><br />
                  <span>{order.userId.email}</span><br />
                  <small className="order-id">🆔 {order._id}</small>
                </div>
                <div>
                  <span className="order-date">{new Date(order.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="order-items">
                <strong>Ürünler:</strong>
                <ul>
                  {order.items.map((item, i) => (
                    <li key={i}>
                      {item.productId?.name || 'Ürün adı yok'} x {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-address">
                <strong>Adres:</strong><br />
                {matchedAddress
                  ? `${matchedAddress.title} - ${matchedAddress.fullAddress}`
                  : <em>Adres bilgisi bulunamadı.</em>}
              </div>
              <div className="order-other">
                <strong>Ne Kazandı:</strong> {order.whatOrdered || 'Bilinmiyor'}
              </div>
              <div className="tracking-section">
                <strong>Kargo Takip No:</strong>
                {order.trackingNumber === 'İptal Edildi' ? (
                  <div style={{ padding: '8px 0', color: '#888' }}>
                    İptal Edildi
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Takip no girin"
                      className="tracking-input"
                      value={
                        trackingInputs[order._id] !== undefined
                          ? trackingInputs[order._id]
                          : order.trackingNumber
                            ? order.trackingNumber.split('=')[1]
                            : ''
                      }
                      onChange={(e) => handleTrackingChange(order._id, e.target.value)}
                    />
                    <button onClick={() => handleTrackingUpdate(order._id)} className="tracking-save-btn">
                      {order.trackingNumber ? 'Güncelle' : 'Kaydet'}
                    </button>
                  </div>
                )}
                {order.trackingNumber && order.trackingNumber !== 'İptal Edildi' && (
                  <div style={{ marginTop: '5px' }}>
                    <a
                      href={order.trackingNumber}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tracking-link"
                    >
                      Takip Linkini Aç
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default Orders;
