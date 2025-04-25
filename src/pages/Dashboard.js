import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [dailyOrders, setDailyOrders] = useState([]);
  const admin = JSON.parse(localStorage.getItem('admin'))?.user;

  useEffect(() => {
    const fetchStats = async () => {
      const token = JSON.parse(localStorage.getItem('admin'))?.token;
      try {
        const res = await axios.get('http://localhost:5000/api/adminStats/daily-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDailyOrders(res.data);
      } catch (err) {
        console.error('İstatistik alınamadı', err);
      }
    };

    fetchStats();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>🎉 Hoş geldin {admin?.name || 'Admin'}!</h1>
      <h3>📊 Günlük Satın Alma Sayısı (Son 7 Gün)</h3>
      <ul>
        {dailyOrders.map(day => (
          <li key={day._id}>
            <strong>{day._id}</strong>: {day.totalOrders} sipariş
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
