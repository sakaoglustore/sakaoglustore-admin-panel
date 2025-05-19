'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import API_URL from '../config';
import { getBoxContents, getDebugInfo, getItemName } from '../utils/orderHelper';
import './Orders.css';

GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);  const [successMessage, setSuccessMessage] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;
  const pageSize = 50;

  useEffect(() => {
    fetchOrders(query, page);
  }, [page, query]);  const fetchOrders = async (searchQuery = '', pageNumber = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`https://api.sakaoglustore.net/api/orders?query=${searchQuery}&page=${pageNumber}&limit=${pageSize}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('API Yanıtı:', JSON.stringify(res.data.orders, null, 2));
      console.log('Sipariş Öğeleri:', res.data.orders.map(order => order.items));
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
      await axios.put(`${API_URL}/api/orders/${orderId}/tracking`, { trackingNumber: newTracking }, {
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
        `${API_URL}/api/orders/verify-order/${orderId}`,
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
  };  const extractOrderIdFromPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      
      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          const page = await pdf.getPage(1);
          const textContent = await page.getTextContent();
          const text = textContent.items.map(item => item.str).join(' ');

          // PDF içeriğini temizle
          const cleanText = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
                              .replace(/\s+/g, " ")
                              .trim();
          
          // Tüm MongoDB ObjectId formatına benzeyen 24 karakterlik hexadecimal ID'leri bul
          const idMatches = [...cleanText.matchAll(/\b([a-f0-9]{24})\b/gi)].map(match => match[1]);
          
          if (idMatches.length === 0) {
            reject(new Error('PDF içinde geçerli sipariş ID\'si bulunamadı'));
            return;
          }
          
          resolve({
            orderIds: idMatches,
            fullText: text
          });
        } catch (error) {
          reject(error);
        }
      };
      
      fileReader.onerror = () => reject(new Error('PDF dosyası okunamadı'));
      fileReader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.includes('pdf')) {
      setVerificationError('Lütfen geçerli bir PDF dosyası yükleyin.');
      return;
    }

    setIsProcessing(true);
    setVerificationError('');
    setSuccessMessage(null);

    try {
      const { orderIds, fullText } = await extractOrderIdFromPDF(file);
      
      // Başarılı ve başarısız işlemleri takip et
      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        confirmationCodes: []
      };

      // Tüm ID'ler için paralel işlem yap
      await Promise.all(orderIds.map(async (orderId) => {
        const matchingOrder = orders.find(order => order._id === orderId);

        if (matchingOrder) {
          if (matchingOrder.status === 'pending') {
            try {
              const response = await axios.put(
                `${API_URL}/api/orders/verify-order/${orderId}`,
                { 
                  status: 'confirmed',
                  paymentReference: fullText
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (response.data.order.confirmationCode) {
                results.confirmationCodes.push({
                  orderId: orderId,
                  code: response.data.order.confirmationCode
                });
              }
              results.success++;
            } catch (error) {
              console.error(`Hata (ID: ${orderId}):`, error);
              results.failed++;
            }
          } else {
            results.skipped++;
          }
        } else {
          results.failed++;
        }
      }));      // Sonuçları göster
      let message = `İşlem tamamlandı!`;
      const resultDetails = [];
      
      if (results.success > 0) resultDetails.push(`${results.success} sipariş onaylandı`);
      if (results.skipped > 0) resultDetails.push(`${results.skipped} sipariş zaten onaylanmış`);
      if (results.failed > 0) resultDetails.push(`${results.failed} sipariş onaylanamadı`);
      
      const confirmationInfo = results.confirmationCodes.length > 0 
        ? results.confirmationCodes.map(({orderId, code}) => `ID: ${orderId.slice(-6)} -> Kod: ${code}`).join('\n')
        : '';
      
      setSuccessMessage({
        mainMessage: message,
        details: resultDetails,
        confirmationCodes: confirmationInfo
      });
      
      setVerificationError('');
      event.target.value = ''; // Dosya inputunu temizle
      fetchOrders(query, page);
    } catch (error) {
      console.error('Hata detayı:', error);
      setVerificationError(`Hata: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isSuperAdmin && !admin?.permissions?.orders) {
    return <div>Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return (
    <div className="orders-container">      <h2 className="orders-title">Gelen Siparişler</h2>      <div className="search-controls">
        <input
          type="text"
          placeholder="İsim, e-posta ya da sipariş numarası ile ara..."
          value={query}
          onChange={handleSearch}
          className="search-input"
        />        <button onClick={exportToXML} className="excel-export-btn">
          Siparişleri XML İndir
        </button>
        
        <label className="file-upload-button" title="PDF faturayı yükleyin. Sistem otomatik olarak sipariş numaralarını tespit edecek ve siparişleri doğrulayacaktır.">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="file-input"
            disabled={isProcessing}
          />
          <div className="top-file-upload-ui">
            <span className="top-file-upload-text">PDF Fatura Yükle</span>
            {isProcessing && <div className="mini-spinner"></div>}
          </div>
        </label>
      </div>
      
      {verificationError && <div className="verification-error">{verificationError}</div>}
      
      {successMessage && (
        <div className="verification-success">
          <div className="success-header">
            <div className="success-icon">✓</div>
            <h4>{successMessage.mainMessage}</h4>
            <button className="close-success" onClick={() => setSuccessMessage(null)}>×</button>
          </div>
          <div className="success-details">
            {successMessage.details.map((detail, index) => (
              <div key={index} className="success-detail-item">
                {index === 0 ? '✅ ' : index === 1 ? '⏭️ ' : '❌ '}{detail}
              </div>
            ))}
            
            {successMessage.confirmationCodes && (
              <div className="confirmation-codes">
                <h5>Onay Kodları:</h5>
                <pre>{successMessage.confirmationCodes}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : orders.length === 0 ? (
        <p>Hiç sipariş bulunamadı.</p>
      ) : (
        orders.map(order => {
          const address = order.address || {};

          return (        <div key={order._id} className="order-card">
        <div className="order-header">
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order._id)}
                  onChange={() => handleSelectOrder(order._id)}
                />
                <div className="order-header-info">
                  <strong>{order.userId.firstName} {order.userId.lastName}</strong>
                  <div className="order-meta">
                    {order.userId.email}
                    <span className="order-id">{order._id}</span>
                  </div>
                </div>
                <div className="order-date">
                  {new Date(order.createdAt).toLocaleString()}
                </div>
              </div><div className="order-content">
                <div className="order-section">
                  <div className="order-section-title">Ürünler</div>                  <ul className="order-items">                    {order.items.map((item, idx) => {
                      // Sadece kutu başlığı ve adedi göster
                      const itemNameDisplay = getItemName(item);
                      return (
                        <li key={idx} className="order-item">
                          <div className="order-item-header">
                            <span className="product-name">{itemNameDisplay}</span>
                            <span className="quantity-badge">x {item.quantity}</span>
                          </div>
                          {/* Kutu içeriğinden çıkan ürünler */}
                          {order.orderItems && order.orderItems.length > 0 && (
                            <ul className="box-contents-list">
                              {order.orderItems.map((oi, oidx) => (
                                <li key={oi._id || oidx} className="box-content-item">
                                  <span className="box-content-dot">•</span> {oi.itemName}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="order-section">
                  <div className="order-section-title">Teslimat Adresi</div>
                  {address.title ? (
                    <div>
                      <div>{address.title}</div>
                      <div>{address.fullAddress}</div>
                      <div>{address.city}, {address.district}</div>
                      <div>{address.phone}</div>
                    </div>
                  ) : (
                    <em>Adres bilgisi bulunamadı.</em>
                  )}
                </div>
              </div>

              <div className="order-section" style={{ marginTop: '15px' }}>
                <strong>Durum: </strong>                <span className={`status-${order.status}`}>
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
      )}      <div className="pagination-buttons">
        <button onClick={prevPage} disabled={page === 1}>Önceki</button>
        <span>Sayfa {page}</span>
        <button onClick={nextPage} disabled={!hasMore}>Sonraki</button>
      </div>
    </div>
  );
};

export default Orders;
