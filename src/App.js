import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import GiftBoxes from './pages/GiftBoxes';
import AddGiftBox from './pages/AddGiftBoxes';
import AdminLayout from './pages/AdminLayout';
import AdminCreate from './pages/AdminCreate';
import AdminManage from './pages/AdminManage';
import Users from './pages/Users';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="giftboxes" element={<GiftBoxes />} />
          <Route path="giftboxes/add" element={<AddGiftBox />} />
          <Route path="users" element={<Users />} />
          <Route path="admins/add" element={<AdminCreate />} />
          <Route path="admins/manage" element={<AdminManage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
