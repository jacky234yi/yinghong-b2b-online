import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import OrderList from './components/OrderList';
import FileCenter from './components/FileCenter';
import UserManagement from './components/UserManagement';
import PartitionManagement from './components/PartitionManagement';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, ShieldCheck, ShoppingBag } from 'lucide-react';

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [isRegister, setIsRegister] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/api/register' : '/api/login';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      if (isRegister) {
        setIsRegister(false);
        alert('注册成功，请登录');
      } else {
        onLogin(data.user);
      }
    } else {
      setError(data.message || '操作失败');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20 rotate-3">
            <ShoppingBag className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">迎鸿服装</h1>
          <p className="text-slate-400 mt-2">Temu牛仔裤拿货登记系统</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">用户名</label>
            <div className="relative">
              <input 
                required value={username} onChange={e => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                placeholder="输入您的账号"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">密码</label>
            <div className="relative">
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                placeholder="输入您的密码"
              />
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm font-medium text-center">
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            {isRegister ? '立即注册' : '登录系统'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            {isRegister ? '已有账号？返回登录' : '没有账号？申请注册'}
          </button>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} />
            <span className="text-[10px] uppercase tracking-widest font-bold">安全加密</span>
          </div>
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <div className="flex items-center gap-2">
            <LogIn size={16} />
            <span className="text-[10px] uppercase tracking-widest font-bold">快速访问</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = React.useState<User | null>(() => {
    const saved = localStorage.getItem('yh_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('yh_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('yh_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/products" element={<ProductList user={user} />} />
          <Route path="/admin/products" element={<ProductList user={user} />} />
          <Route path="/admin/partitions" element={<PartitionManagement user={user} />} />
          <Route path="/orders" element={<OrderList user={user} />} />
          <Route path="/admin/orders" element={<OrderList user={user} />} />
          <Route path="/admin/users" element={<UserManagement user={user} type="buyers" />} />
          <Route path="/admin/admins" element={<UserManagement user={user} type="admins" />} />
          <Route path="/files" element={<FileCenter user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
