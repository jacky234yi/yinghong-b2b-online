import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, FileText, LogOut, 
  Menu, X, Shirt, ListOrdered, BarChart3, FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { name: '仪表盘', path: '/admin', icon: LayoutDashboard },
    { name: '商品管理', path: '/admin/products', icon: Shirt },
    { name: '订单管理', path: '/admin/orders', icon: ListOrdered },
    { name: '拿货商管理', path: '/admin/users', icon: Users },
    { name: '文件中心', path: '/admin/files', icon: FolderOpen },
    { name: '数据报表', path: '/admin/reports', icon: BarChart3 },
  ];

  const buyerLinks = [
    { name: '选货中心', path: '/buyer', icon: ShoppingBag },
    { name: '我的订单', path: '/buyer/orders', icon: Package },
    { name: '个人看板', path: '/buyer/dashboard', icon: BarChart3 },
    { name: '文件中心', path: '/buyer/files', icon: FolderOpen },
  ];

  const links = user?.role === 'buyer' ? buyerLinks : adminLinks;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">迎鸿服装 B2B</h1>
          <p className="text-xs text-slate-400 mt-1">牛仔裤供应链管理平台</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon size={20} />
                {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role === 'super_admin' ? '超级管理员' : user?.role === 'admin' ? '管理员' : '拿货商'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-20 flex items-center justify-between p-4 shadow-md">
        <h1 className="font-bold">迎鸿服装 B2B</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed inset-0 bg-slate-900 text-white z-10 pt-20 px-4 md:hidden"
          >
            <nav className="space-y-2">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-4 rounded-lg text-lg font-medium hover:bg-slate-800"
                >
                  <link.icon size={24} />
                  {link.name}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-4 text-lg text-red-400 hover:bg-slate-800 rounded-lg mt-8"
              >
                <LogOut size={24} />
                退出登录
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
}
