// API URL configuration
const config = {
  // Development API URL
  development: 'http://localhost:5000',
  
  // Production API URL - to be updated when deploying
  production: 'https://api.sakaoglustore.com'
};

// Use production URL if in production mode, otherwise use development URL
const API_URL = process.env.NODE_ENV === 'production' 
  ? config.production 
  : config.development;

export default API_URL;
