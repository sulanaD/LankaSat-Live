import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RegisterShelterPage from './pages/RegisterShelterPage'
import ShelterMapPage from './pages/ShelterMapPage'
import ReliefDirectoryPage from './pages/ReliefDirectoryPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register-shelter" element={<RegisterShelterPage />} />
          <Route path="/shelters-map" element={<ShelterMapPage />} />
          <Route path="/relief-directory" element={<ReliefDirectoryPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
