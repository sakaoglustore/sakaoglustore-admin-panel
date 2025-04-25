import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = () => {
  const location = useLocation();
  const [productsOpen, setProductsOpen] = useState(false);
  const [adminsOpen, setAdminsOpen] = useState(false);

  const admin = JSON.parse(localStorage.getItem('admin'))?.user;
  const isSuperAdmin = admin?.isSuperAdmin;

  // Yetki kontrol fonksiyonu
  const hasPermission = (key) => {
    return isSuperAdmin || admin?.permissions?.[key];
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <h2 className="admin-title">🎯 Admin Panel</h2>
        <nav className="admin-nav">

          {/* Dashboard herkes için */}
          <Link to="/dashboard" className={`admin-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            Dashboard
          </Link>

          {/* Ürünler */}
          {hasPermission('products') && (
            <>
              <div className="admin-link dropdown-toggle" onClick={() => setProductsOpen(!productsOpen)}>
                Ürünler {productsOpen ? '▲' : '▼'}
              </div>
              {productsOpen && (
                <div className="dropdown-links">
                  <Link to="/giftboxes" className={`admin-link sub ${location.pathname === '/giftboxes' ? 'active' : ''}`}>
                    Ürünlerim
                  </Link>
                  <Link to="/giftboxes/add" className={`admin-link sub ${location.pathname === '/giftboxes/add' ? 'active' : ''}`}>
                    Ürün Ekle
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Siparişler */}
          {hasPermission('orders') && (
            <Link to="/orders" className={`admin-link ${location.pathname === '/orders' ? 'active' : ''}`}>
              Siparişler
            </Link>
          )}

          {/* Kullanıcılar */}
          {hasPermission('users') && (
            <Link to="/users" className={`admin-link ${location.pathname === '/users' ? 'active' : ''}`}>
              Kullanıcılar
            </Link>
          )}

          {/* Adminler (sadece süper admin) */}
          {isSuperAdmin && (
            <>
              <div className="admin-link dropdown-toggle" onClick={() => setAdminsOpen(!adminsOpen)}>
                Adminler {adminsOpen ? '▲' : '▼'}
              </div>
              {adminsOpen && (
                <div className="dropdown-links">
                  <Link to="/admins/add" className={`admin-link sub ${location.pathname === '/admins/add' ? 'active' : ''}`}>
                    Admin Oluştur
                  </Link>
                  <Link to="/admins/manage" className={`admin-link sub ${location.pathname === '/admins/manage' ? 'active' : ''}`}>
                    Adminleri Yönet
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Çıkış */}
          <button
            style={{
              marginTop: 30,
              background: '#ff4d4d',
              color: 'white',
              padding: '8px 12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
            }}
            onClick={() => {
              localStorage.removeItem('admin');
              window.location.href = '/';
            }}
          >
            🚪 Çıkış Yap
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
