import React, { useEffect, useState } from 'react';
import './GiftBoxes.css';
import './Users.css';
import api from '../utils/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);  const [verifying, setVerifying] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  const usersPerPage = 20;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;

  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/user/all');
      setUsers(res.data);
      setFilteredUsers(res.data);
      setTotalPages(Math.ceil(res.data.length / usersPerPage));
    } catch (err) {
      setErrorMessage('Kullanıcılar getirilemedi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
      setTotalPages(Math.ceil(users.length / usersPerPage));
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        (user.firstName && user.firstName.toLowerCase().includes(query)) ||
        (user.lastName && user.lastName.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.phone && user.phone.toLowerCase().includes(query))
      );
      setFilteredUsers(filtered);
      setTotalPages(Math.ceil(filtered.length / usersPerPage));
      setCurrentPage(1); // Arama yapıldığında ilk sayfaya dön
    }
  }, [searchQuery, users]);

  // Sayfalama için kullanıcıların geçerli sayfadakileri al
  const getCurrentUsers = () => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  };
  
  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };
  const handleBulkVerify = async () => {
    if (selectedUsers.length === 0) {
      setErrorMessage('Lütfen doğrulamak için kullanıcı seçin');
      return;
    }

    setVerifying(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await api.put('/api/user/verify/bulk', { userIds: selectedUsers });
      setSuccessMessage(response.data.message || `${selectedUsers.length} kullanıcı başarıyla doğrulandı`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      setErrorMessage(`Toplu doğrulama hatası: ${error.response?.data?.message || error.message}`);
    } finally {
      setVerifying(false);
    }
  };  const handleVerifyUser = async (userId) => {
    setVerifying(true);
    setVerifyingId(userId);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await api.put(`/api/user/verify/${userId}`);
      setSuccessMessage(response.data.message || `Kullanıcı başarıyla doğrulandı`);
      fetchUsers(); // Kullanıcı listesini güncelle
    } catch (error) {
      setErrorMessage(`Doğrulama hatası: ${error.response?.data?.message || error.message}`);
    } finally {
      setVerifying(false);
      setVerifyingId(null);
    }
  };
  
  if (!isSuperAdmin && !admin?.permissions?.users) {
    return <div>Bu sayfaya erişim yetkiniz yok.</div>;
  }

  const unverifiedCount = filteredUsers.filter(user => !user.isVerified).length;

  return (
    <div className="giftbox-container users-container">
      <h2>👥 Kullanıcılar</h2>
      
      {successMessage && (
        <div className="success-message">
          ✅ {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="error-message">
          ❌ {errorMessage}
        </div>
      )}
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="İsim, e-posta veya telefon ara..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>
      
      {unverifiedCount > 0 && (
        <div className="bulk-actions">
          <p>{unverifiedCount} doğrulanmamış kullanıcı bulundu.</p>
          <button 
            className="bulk-verify-btn" 
            onClick={handleBulkVerify}
            disabled={selectedUsers.length === 0 || verifying}
          >
            {verifying ? 'İşleniyor...' : `Seçilen ${selectedUsers.length} Kullanıcıyı Doğrula`}
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : filteredUsers.length === 0 ? (
        <p>Hiç kullanıcı bulunamadı.</p>
      ) : (
        <>
          <div className="users-list">
            {getCurrentUsers().map((user) => (
              <div key={user._id} className="user-card">
                <h3 className="user-name">
                  {user.firstName} {user.lastName}
                  {user.isVerified ? (
                    <span className="verified-badge">✓</span>
                  ) : (
                    <span className="unverified-badge">!</span>
                  )}
                </h3>
                
                {!user.isVerified && (
                  <div className="select-for-bulk">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleSelectUser(user._id)}
                      />
                      Toplu doğrulama için seç
                    </label>
                  </div>
                )}
                  <div className="user-info">
                  <p className="user-email">📧 {user.email}</p>
                  <p className="user-phone">📞 {user.phone || "Telefon bilgisi yok"}</p>
                  <p className="user-status">
                    <strong>Durum:</strong> {user.isVerified ? 
                      <span className="status-text verified">Doğrulanmış ✓</span> : 
                      <span className="status-text unverified">Doğrulanmamış ⚠️</span>
                    }
                  </p>
                    {!user.isVerified && (
                    <div className="verification-info">
                      {user.verificationToken && (
                        <p><strong>Doğrulama Kodu:</strong> <span className="verification-token">{user.verificationToken}</span></p>
                      )}
                      <button 
                        className="verify-btn" 
                        onClick={() => handleVerifyUser(user._id)}
                        disabled={verifying && verifyingId === user._id}
                      >
                        {verifying && verifyingId === user._id ? 'Doğrulanıyor...' : 'Kullanıcıyı Doğrula'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="user-addresses">
                  <h4>🏠 Adresler:</h4>
                  {user.addresses && user.addresses.length > 0 ? (
                    <ul>
                      {user.addresses.map((addr, i) => (
                        <li key={i}>
                          <strong>{addr.title}:</strong> {addr.fullAddress}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Kayıtlı adres bulunamadı</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="pagination">
            <button 
              onClick={() => handlePageChange(1)} 
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              {'<<'}
            </button>
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              {'<'}
            </button>
            
            <span className="page-info">
              Sayfa {currentPage} / {totalPages}
            </span>
            
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              {'>'}
            </button>
            <button 
              onClick={() => handlePageChange(totalPages)} 
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              {'>>'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Users;
