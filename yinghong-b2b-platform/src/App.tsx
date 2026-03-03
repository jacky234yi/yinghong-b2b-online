import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import ProductList from './pages/admin/ProductList';
import ProductForm from './pages/admin/ProductForm';

import { CartProvider } from './context/CartContext';
import Shop from './pages/buyer/Shop';
import ProductDetail from './pages/buyer/ProductDetail';
import Cart from './pages/buyer/Cart';

import OrderList from './pages/admin/OrderList';
import AdminDashboard from './pages/admin/AdminDashboard';
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import FileCenter from './pages/FileCenter';
import MyOrders from './pages/buyer/MyOrders';

import UserList from './pages/admin/UserList';

import Reports from './pages/admin/Reports';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<ProductList />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/edit/:id" element={<ProductForm />} />
              <Route path="orders" element={<OrderList />} />
              <Route path="users" element={<UserList />} />
              <Route path="files" element={<FileCenter />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* Buyer Routes */}
            <Route path="/buyer" element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Shop />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="cart" element={<Cart />} />
              <Route path="orders" element={<MyOrders />} />
              <Route path="dashboard" element={<BuyerDashboard />} />
              <Route path="files" element={<FileCenter />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
