/**
 * API handler utility for making API requests
 * This centralizes API calls and handles errors consistently
 */

import axios from 'axios';
import API_URL from '../config';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL
});

// Add request interceptor to add auth token
api.interceptors.request.use(config => {
  const token = JSON.parse(localStorage.getItem('admin'))?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
