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

// Material-UI imports
import { TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';

// Helper function to determine if an order requires manual shipping (has max or high items)
const requiresManualShipping = (order) => {
  // Check if order has maxItemCount or highItemCount
  if (order.maxItemCount > 0 || order.highItemCount > 0) {
    return true;
  }
  
  // Check if any orderItems have itemType of 'maximum' or 'high'
  if (order.orderItems && order.orderItems.length > 0) {
    return order.orderItems.some(item => 
      item.itemType === 'maximum' || item.itemType === 'high'
    );
  }
  
  return false;
};

GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [orderFilter, setOrderFilter] = useState('small-medium'); // 'small-medium', 'large-max'
  const [manualShippingCount, setManualShippingCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [xmlLoading, setXmlLoading] = useState(false);
  const [currentXmlPage, setCurrentXmlPage] = useState(1);
  const [totalXmlPages, setTotalXmlPages] = useState(1);

  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;
  const pageSize = 50;
  const xmlPageSize = 3000;  

  // Define fetchOrders before using it in useEffect  
  const fetchOrders = async (searchQuery = '', pageNumber = 1) => {
    setLoading(true);
    try {
      let apiUrl = `http://localhost:5000/api/orders?query=${searchQuery}&page=${pageNumber}&limit=${pageSize}`;
      
      // Add date range filters if dates are selected
      if (startDate && endDate) {
        const formattedStartDate = new Date(startDate).toISOString();
        const formattedEndDate = new Date(endDate).toISOString();
        apiUrl += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      }

      const res = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('API Yanıtı:', JSON.stringify(res.data.orders, null, 2));
      console.log('Sipariş Öğeleri:', res.data.orders.map(order => order.items));
      
      const allOrders = res.data.orders || [];
      
      // Filter orders based on item types
      let filteredOrders = allOrders;
      if (orderFilter === 'small-medium') {
        filteredOrders = allOrders.filter(order => {
          if (!order.orderItems || order.orderItems.length === 0) return false;
          return order.orderItems.every(item => 
            item.itemType !== 'high' && item.itemType !== 'maximum'
          );
        });
      } else if (orderFilter === 'large-max') {
        filteredOrders = allOrders.filter(order => {
          if (!order.orderItems || order.orderItems.length === 0) return false;
          return order.orderItems.some(item => 
            item.itemType === 'high' || item.itemType === 'maximum'
          );
        });
      }
      
      setOrders(filteredOrders);
      setManualShippingCount(filteredOrders.length);
      setHasMore(res.data.orders?.length === pageSize);
    } catch (err) {
      console.error('Sipariş çekme hatası:', err);
    }    setLoading(false);
  };
  
  useEffect(() => {
    fetchOrders(query, page);
  }, [page, query, orderFilter]); // startDate ve endDate çıkarıldı, sadece butona basıldığında filtre uygulanacak

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
  const handleBulkTrackingExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setVerificationError('Lütfen bir Excel dosyası yükleyin.');
      return;
    }
    
    // Check file type more reliably
    const validExcelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12'
    ];
    
    if (!validExcelTypes.includes(file.type)) {
      setVerificationError('Lütfen geçerli bir Excel dosyası yükleyin.');
      return;
    }

    setIsProcessing(true);
    setVerificationError('');
    setSuccessMessage(null);

    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel dosyası boş veya okunamıyor.');
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (!data || data.length === 0) {
        throw new Error('Excel dosyasında veri bulunamadı.');
      }

      console.log('Excel verileri:', data);
      
      // Veri yapısını kontrol et
      const firstRow = data[0];
      const hasReferenceColumn = 
        'Referans No' in firstRow || 
        'Reference No' in firstRow || 
        'Ref No' in firstRow ||
        'Referans Numarası' in firstRow;
        
      const hasTrackingColumn = 
        'Takip No' in firstRow || 
        'Tracking No' in firstRow ||
        'Gönderi Kodu' in firstRow ||
        'Kargo Takip' in firstRow;
      
      if (!hasReferenceColumn || !hasTrackingColumn) {
        throw new Error('Excel dosyasında gerekli sütunlar eksik. "Referans No" ve "Takip No" sütunlarının olduğundan emin olun.');
      }

      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        updates: []
      };

      // Her satırı sırayla işle (hata kontrolü için)
      for (const row of data) {
        try {
          // Birden fazla olası sütun adlarını kontrol et
          const referenceNumber = 
            row['Referans No'] || 
            row['Reference No'] || 
            row['Ref No'] || 
            row['Referans Numarası'];
            
          const trackingNumber = 
            row['Takip No'] || 
            row['Tracking No'] ||
            row['Gönderi Kodu'] || 
            row['Kargo Takip'];
          
          if (!referenceNumber || !trackingNumber) {
            results.skipped++;
            continue;
          }

          // Boş olmayan referans ve takip numarası kontrolü
          const refString = String(referenceNumber).trim();
          const trackString = String(trackingNumber).trim();
          
          if (!refString || !trackString) {
            results.skipped++;
            continue;
          }

          const response = await axios.put(
            `http://localhost:5000/api/orders/tracking-by-reference`,
            { 
              referenceNumber: refString,
              trackingNumber: trackString
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.updated) {
            results.success++;
            results.updates.push({
              referenceNumber: refString,
              trackingNumber: trackString
            });
          } else {
            results.failed++;
          }
        } catch (error) {
          console.error('Satır işleme hatası:', error);
          results.failed++;
        }
      }

      // Show results
      let message = `İşlem tamamlandı!`;
      const resultDetails = [];
      
      if (results.success > 0) resultDetails.push(`${results.success} sipariş güncellendi`);
      if (results.skipped > 0) resultDetails.push(`${results.skipped} satır atlandı`);
      if (results.failed > 0) resultDetails.push(`${results.failed} güncelleme başarısız oldu`);
      
      const updatesInfo = results.updates.length > 0 
        ? results.updates.map(({referenceNumber, trackingNumber}) => 
            `Ref: ${referenceNumber.slice(-6)} -> Takip: ${trackingNumber}`).join('\n')
        : '';
      
      setSuccessMessage({
        mainMessage: message,
        details: resultDetails,
        updateDetails: updatesInfo
      });
      
      event.target.value = ''; // Dosya inputunu temizle
      fetchOrders(query, page);
    } catch (error) {
      console.error('Excel işleme hatası:', error);
      setVerificationError(`Hata: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const generateRandomBagNumber = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };  // XML indirme için API çağrısı
  const fetchOrdersForXml = async (page = 1, startDate, endDate) => {
    try {
      const formattedStartDate = new Date(startDate).toISOString();
      const formattedEndDate = new Date(endDate).toISOString();
      
      const res = await axios.get(
        `http://localhost:5000/api/orders?page=${page}&limit=${xmlPageSize}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&status=confirmed`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Extract orders and handle pagination properly
      const orders = res.data.orders || [];
      const total = orders.length > 0 ? res.data.totalOrders : 0;
      
      return {
        orders: orders,
        total: total
      };
    } catch (err) {
      console.error('XML için sipariş çekme hatası:', err);
      setXmlLoading(false);
      alert('Siparişler alınırken bir hata oluştu: ' + err.message);
      throw err;
    }
  };  const exportToXML = async () => {
    if (!startDate || !endDate) {
      alert('Lütfen başlangıç ve bitiş tarihlerini seçin');
      return;
    }

    setXmlLoading(true);    try {
      // Get orders and filter based on selected filter
      const firstPageData = await fetchOrdersForXml(1, startDate, endDate);
      
      // Filter orders based on size type
      if (firstPageData?.orders) {
        if (orderFilter === 'large-max') {
          firstPageData.orders = firstPageData.orders.filter(order => {
            return order.orderItems?.some(item => 
              item.itemType === 'high' || item.itemType === 'maximum'
            );
          });
        } else if (orderFilter === 'small-medium') {
          firstPageData.orders = firstPageData.orders.filter(order => {
            return order.orderItems?.every(item => 
              item.itemType !== 'high' && item.itemType !== 'maximum'
            );
          });
        }
        firstPageData.total = firstPageData.orders.length;
      }
      
      if (!firstPageData?.orders || !Array.isArray(firstPageData.orders) || firstPageData.orders.length === 0) {
        alert('Seçilen tarih aralığında onaylanmış sipariş bulunamadı');
        setXmlLoading(false);
        return;
      }

      const totalOrders = firstPageData.total;
      const totalPages = Math.ceil(totalOrders / xmlPageSize);
      setTotalXmlPages(totalPages);

      // Her sayfayı işle ve XML'e ekle
      let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<orders>`;
      
      for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        setCurrentXmlPage(currentPage);
        const pageData = currentPage === 1 ? firstPageData : await fetchOrdersForXml(currentPage, startDate, endDate);
        
        pageData.orders.forEach(order => {
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
      }

      xmlContent += `\n</orders>`;
        // Dosya adına tarih aralığını ve sipariş türünü ekle
      const startDateStr = new Date(startDate).toLocaleDateString('tr-TR').replace(/\./g, '-');
      const endDateStr = new Date(endDate).toLocaleDateString('tr-TR').replace(/\./g, '-');
      const sizeType = orderFilter === 'large-max' ? 'buyuk_max' : 'kucuk_orta';
      const fileName = `${sizeType}_siparisler_${startDateStr}_${endDateStr}.xml`;

      const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
      saveAs(blob, fileName);
    } catch (err) {
      console.error('XML dışa aktarma hatası:', err);
      alert('XML dışa aktarma sırasında bir hata oluştu');
    } finally {
      setXmlLoading(false);
      setCurrentXmlPage(1);
    }
  };

  const exportToExcel = async () => {
    if (!startDate || !endDate) {
      alert('Lütfen başlangıç ve bitiş tarihlerini seçin');
      return;
    }

    setXmlLoading(true); // Aynı loading state'i kullanıyoruz
    try {      // Siparişleri çek ve filtreye göre ayır
      const data = await fetchOrdersForXml(1, startDate, endDate);
      
      if (!data?.orders || !Array.isArray(data.orders) || data.orders.length === 0) {
        alert('Seçilen tarih aralığında onaylanmış sipariş bulunamadı');
        return;
      }

      // Siparişleri filtreye göre filtrele
      if (data.orders && orderFilter !== 'all') {
        if (orderFilter === 'large-max') {
          data.orders = data.orders.filter(order => 
            order.orderItems?.some(item => 
              item.itemType === 'high' || item.itemType === 'maximum'
            )
          );
        } else if (orderFilter === 'small-medium') {
          data.orders = data.orders.filter(order => 
            order.orderItems?.every(item => 
              item.itemType !== 'high' && item.itemType !== 'maximum'
            )
          );
        }
      }

      if (data.orders.length === 0) {
        alert('Seçilen filtreye uygun sipariş bulunamadı');
        return;
      }

      // Excel için veriyi hazırla
      const excelData = data.orders.map(order => {
        // Sipariş içindeki ürünleri birleştir
        const boxContents = order.orderItems?.map(item => 
          `${item.itemName}${item.itemId ? ` (${item.itemId})` : ''}`
        ).join(', ') || 'Ürün detayı yok';

        return {
          'Referans No': order._id,
          'Müşteri': `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`,
          'Sipariş Tarihi': new Date(order.createdAt).toLocaleString('tr-TR'),
          'Kutu İçeriği': boxContents,
          'Kutu Adedi': order.items?.[0]?.quantity || 1,
          'Onay Kodu': order.confirmationCode || '',
          'Kargo Takip': order.trackingNumber || ''
        };
      });

      // Excel dosyası oluştur
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Siparişler');

      // Sütun genişliklerini ayarla
      const maxWidths = {};
      excelData.forEach(row => {
        Object.keys(row).forEach(key => {
          const cellLength = row[key]?.toString().length || 0;
          maxWidths[key] = Math.max(maxWidths[key] || 0, cellLength, key.length);
        });
      });

      worksheet['!cols'] = Object.keys(excelData[0]).map(key => ({
        wch: maxWidths[key] + 2
      }));      // Dosya adına tarih aralığını ve sipariş türünü ekle
      const startDateStr = new Date(startDate).toLocaleDateString('tr-TR').replace(/\./g, '-');
      const endDateStr = new Date(endDate).toLocaleDateString('tr-TR').replace(/\./g, '-');
      const sizeType = orderFilter === 'large-max' ? 'buyuk_max' : 'kucuk_orta';
      const fileName = `${sizeType}_siparisler_${startDateStr}_${endDateStr}.xlsx`;

      // Excel'i indir
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Excel dışa aktarma hatası:', err);
      alert('Excel dışa aktarma sırasında bir hata oluştu');
    } finally {
      setXmlLoading(false);
    }
  };

  const nextPage = () => {
    if (hasMore) setPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage(prev => prev - 1);
  };  const handleVerifyOrder = async (orderId, status) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/orders/verify-order/${orderId}`,
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
                `http://localhost:5000/api/orders/verify-order/${orderId}`,
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
    <div className="orders-container">      <div className="orders-title-container">
        <h2 className="orders-title">Gelen Siparişler</h2>        <div className="filter-buttons">
          <button 
            className={`filter-btn ${orderFilter === 'small-medium' ? 'active' : ''}`}
            onClick={() => setOrderFilter('small-medium')}
          >
            Küçük/Orta Boy
          </button>
          <button 
            className={`filter-btn ${orderFilter === 'large-max' ? 'active' : ''}`}
            onClick={() => setOrderFilter('large-max')}
          >
            Büyük/Maximum Boy
          </button>
        </div>
      </div>      <div className="search-controls">        <div className="date-range-controls">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="date-input-group">
              <label>Başlangıç Tarihi:</label>
              <DatePicker
                value={startDate ? dayjs(startDate) : null}
                onChange={(date) => {
                  if (date) {
                    setStartDate(date.format('YYYY-MM-DD') + 'T13:00');
                  } else {
                    setStartDate('');
                  }
                }}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    variant: "outlined",
                    size: "small"
                  } 
                }}
              />
            </div>
            <div className="date-input-group">
              <label>Bitiş Tarihi:</label>
              <DatePicker
                value={endDate ? dayjs(endDate) : null}
                onChange={(date) => {
                  if (date) {
                    setEndDate(date.format('YYYY-MM-DD') + 'T13:00');
                  } else {
                    setEndDate('');
                  }
                }}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    variant: "outlined",
                    size: "small"
                  } 
                }}
              />
            </div>
          </LocalizationProvider>
          <div className="date-action-buttons">
            <button
              className="filter-apply-btn"
              onClick={() => fetchOrders(query, 1)}
            >
              Filtreyi Uygula
            </button>
            <button
              className="filter-reset-btn"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setPage(1);
                fetchOrders('', 1);
              }}
            >
              Sıfırla
            </button>
          </div>
        </div><div className="export-buttons">
          {orderFilter !== 'all' && (
            <button 
              onClick={exportToXML} 
              className="excel-export-btn" 
              disabled={xmlLoading || !startDate || !endDate}
            >
              {xmlLoading ? (
                <>
                  XML İndiriliyor... ({currentXmlPage}/{totalXmlPages})
                  <div className="mini-spinner"></div>
                </>
              ) : (
                `${orderFilter === 'large-max' ? 'Büyük/Maximum' : 'Küçük/Orta'} Boy Siparişleri XML İndir`
              )}
            </button>
          )}
          
          <button 
            onClick={exportToExcel} 
            className="excel-export-btn excel-btn" 
            disabled={xmlLoading || !startDate || !endDate}
          >
            {xmlLoading ? (
              <>
                Excel İndiriliyor...
                <div className="mini-spinner"></div>
              </>
            ) : (
              'Siparişleri Excel Olarak İndir'
            )}
          </button>
        </div><div className="file-upload-controls">
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
          
          <label className="file-upload-button" title="Excel dosyası yükleyerek toplu kargo takip numarası güncellemesi yapabilirsiniz. Excel dosyasında 'Referans No' ve 'Takip No' sütunları bulunmalıdır.">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleBulkTrackingExcelUpload}
              className="file-input"
              disabled={isProcessing}
            />
            <div className="top-file-upload-ui tracking-upload">
              <span className="top-file-upload-text">Takip No Excel Yükle</span>
              {isProcessing && <div className="mini-spinner"></div>}
            </div>
          </label>
        </div>
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
              {successMessage.details && Array.isArray(successMessage.details) && (
                <>
                  {successMessage.details.map((detail, index) => (
                    <div key={index} className="success-detail-item">
                      {index === 0 ? '✅ ' : index === 1 ? '⏭️ ' : '❌ '}{detail}
                    </div>
                  ))}
                </>
              )}
              
              {successMessage.confirmationCodes && (
                <div className="confirmation-codes">
                  <h5>Onay Kodları:</h5>
                  <pre>{successMessage.confirmationCodes}</pre>
                </div>
              )}

              {successMessage.updateDetails && (
                <div className="update-details">
                  <h5>Güncellenen Takip Numaraları:</h5>
                  <pre>{successMessage.updateDetails}</pre>
                </div>
              )}
            </div>
          </div>
        )}      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : orders.length === 0 ? (
        <p>Hiç sipariş bulunamadı.</p>      ) : (
        orders.map(order => {
          const address = order.address || {};
          const needsManualShipping = requiresManualShipping(order);

          return (
            <div key={order._id} className={`order-card ${needsManualShipping ? 'needs-manual-shipping' : ''}`}>
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
                    {needsManualShipping && (
                      <span className="manual-shipping-badge" title="Bu siparişte büyük veya maximum boy ürünler var ve elle gönderilmesi gerekiyor.">
                        Elle Gönderilecek
                      </span>
                    )}
                  </div>
                </div>
                <div className="order-date">
                  {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="order-content">                <div className="order-section">
                  <div className="order-section-title">Ürünler</div>
                  <ul className="order-items">
                    {order.items.map((item, idx) => {
                      // Sadece kutu başlığı ve adedi göster
                      const itemNameDisplay = getItemName(item);
                      return (
                        <li key={idx} className="order-item">
                          <div className="order-item-header">
                            <span className="product-name">{itemNameDisplay}</span>
                            <span className="quantity-badge">x {item.quantity}</span>
                          </div>
                          {/* Kutu içeriğinden çıkan ürünler */}                          {order.orderItems && order.orderItems.length > 0 && (
                            <ul className="box-contents-list">
                              {order.orderItems.map((oi, oidx) => (
                                <li key={oi._id || oidx} className={`box-content-item ${oi.itemType === 'high' || oi.itemType === 'maximum' ? 'manual-item' : ''}`}>
                                  <span className="box-content-dot">•</span> {oi.itemName}
                                  {(oi.itemType === 'high' || oi.itemType === 'maximum') && (
                                    <span className="item-type-badge">
                                      {oi.itemType === 'high' ? 'Büyük Boy' : 'Maximum Boy'}
                                    </span>
                                  )}
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
              </div>              <div className="order-section" style={{ marginTop: '15px' }}>
                <strong>Durum: </strong>                <span className={`status-${order.status}`}>
                  {order.status === 'pending' ? 'Ödeme Bekleniyor' : 
                   order.status === 'confirmed' ? 'Onaylandı' : 'Reddedildi'}
                </span>

                {order.trackingNumber && order.trackingNumber !== 'İptal Edildi' && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>Kargo Takip: </strong>
                    {order.trackingNumber.includes('yurticikargo.com') ? (
                      <a 
                        href={order.trackingNumber} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="tracking-link"
                      >
                        {order.trackingNumber.split('code=')[1] || 'Takip Et'}
                      </a>
                    ) : (
                      <span>{order.trackingNumber}</span>
                    )}
                  </div>
                )}
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
              )}            </div>
          );
        })
      )}
      
      <div className="pagination-buttons">
        <button onClick={prevPage} disabled={page === 1}>Önceki</button>
        <span>Sayfa {page}</span>
        <button onClick={nextPage} disabled={!hasMore}>Sonraki</button>
      </div>
    </div>
  );
};

export default Orders;
