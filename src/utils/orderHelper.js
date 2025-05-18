// Bu dosya, sipariş nesnelerinden içerik bilgisini çıkarmak için yardımcı fonksiyonlar içerir

/**
 * Sipariş öğesinden kutu içeriği bilgisini çıkarır
 * @param {Object} item - Sipariş öğesi
 * @returns {String|null} - Kutu içeriği metni veya bilgi yoksa null
 */
export const getBoxContents = (item) => {
  // Kutu içeriği için olası tüm alanları kontrol et
  return item.whatOrdered || 
         item.orderNote || 
         item.notes || 
         item.boxContents ||
         (item.customFields?.boxContents) || 
         (item.customization?.content) ||
         (item.productCustomization?.content) ||
         null;
};

/**
 * Debug için kullanılabilecek madde özelliklerini yazdır
 * @param {Object} item - Düz bir nesne olarak dönüştürülecek madde
 */
export const getDebugInfo = (item) => {
  // Önemli alanları içeren düz bir nesne oluştur
  const debugObj = {
    id: item._id,
    productName: item.productId?.name,
    qty: item.quantity,
    fields: Object.keys(item).join(', ')
  };
  return JSON.stringify(debugObj);
};
