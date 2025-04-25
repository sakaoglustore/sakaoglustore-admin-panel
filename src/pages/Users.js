import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './GiftBoxes.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('https://api.sakaoglustore.net/api/user/all', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        alert('Kullanıcılar getirilemedi');
      }
    };

    if (isSuperAdmin || admin?.permissions?.users) {
      fetchUsers();
    }
  }, []);

  if (!isSuperAdmin && !admin?.permissions?.users) {
    return <div>Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return (
    <div className="giftbox-container">
      <h2>👥 Kullanıcılar</h2>
      {users.length === 0 ? (
        <p>Hiç kullanıcı yok.</p>
      ) : (
        users.map((user) => (
          <div key={user._id} style={{ borderBottom: '1px solid #ccc', padding: '10px 0' }}>
            <strong>{user.firstName} {user.lastName}</strong><br />
            📧 {user.email}<br />
            📞 {user.phone}<br />
            🏠 Adresler:
            <ul>
              {user.addresses.map((addr, i) => (
                <li key={i}>
                  <strong>{addr.title}</strong>: {addr.fullAddress}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default Users;
