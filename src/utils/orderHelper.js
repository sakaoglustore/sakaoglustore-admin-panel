// Bu dosya, sipariş nesnelerinden içerik bilgisini çıkarmak için yardımcı fonksiyonlar içerir

/**
 * Sipariş öğesinden kutu içeriği bilgisini çıkarır
 * @param {Object} item - Sipariş öğesi
 * @returns {String|null} - Kutu içeriği metni veya bilgi yoksa null
 */
export const getBoxContents = (item) => {
  // Kutu içeriği için olası tüm alanları kontrol et
  const contents = item.whatOrdered || 
         item.orderNote || 
         item.notes || 
         item.boxContents ||
         (item.customFields?.boxContents) || 
         (item.customization?.content) ||
         (item.productCustomization?.content);
  
  if (!contents) return null;
  
  // İçeriği daha okunabilir hale getir (satırlar arasına boşluk ekle)
  return contents.replace(/,\s*/g, '\n• ').replace(/^\s*/, '• ');
};

/**
 * Item name bilgisini çıkarır
 * @param {Object} item - Sipariş öğesi
 * @returns {String} - Öğe adı veya ürün adı
 */
export const getItemName = (item) => {
  // itemName veya productId.name veya varsayılan değer döndür
  return item.itemName || item.productId?.name || 'Ürün adı yok';
};

/**
 * Debug için kullanılabilecek madde özelliklerini yazdır
 * @param {Object} item - Düz bir nesne olarak dönüştürülecek madde
 */
export const getDebugInfo = (item) => {
  // Önemli alanları içeren düz bir nesne oluştur
  const debugObj = {
    id: item._id,
    itemId: item.itemId,
    itemName: item.itemName,
    productName: item.productId?.name,
    qty: item.quantity,
    fields: Object.keys(item).join(', ')
  };
  return JSON.stringify(debugObj);
};
