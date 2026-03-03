import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  User as UserIcon,
  Layers,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Notification } from '../types';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import LowStockAlert from './LowStockAlert';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, onLogout, children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'super_admin' || user?.role === 'supplier_admin';

  const fetchNotifications = React.useCallback(async () => {
    if (!isAdmin) return;
    const res = await fetch('/api/notifications');
    setNotifications(await res.json());
  }, [isAdmin]);

  React.useEffect(() => {
    fetchNotifications();
    const socket = io();
    socket.on('notification:created', () => {
      fetchNotifications();
    });
    return () => {
      socket.disconnect();
    };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const menuItems = React.useMemo(() => {
    if (!user) return [];
    
    const items = [
      { name: '数据报表', path: '/', icon: LayoutDashboard, roles: ['super_admin', 'supplier_admin', 'buyer'] },
      { name: '商品浏览', path: '/products', icon: Package, roles: ['buyer'] },
      { name: '商品管理', path: '/admin/products', icon: Package, roles: ['super_admin', 'supplier_admin'] },
      { name: '分区管理', path: '/admin/partitions', icon: Layers, roles: ['super_admin', 'supplier_admin'] },
      { name: '我的订单', path: '/orders', icon: ShoppingCart, roles: ['buyer'] },
      { name: '订单管理', path: '/admin/orders', icon: ShoppingCart, roles: ['super_admin', 'supplier_admin'] },
      { name: '拿货商管理', path: '/admin/users', icon: Users, roles: ['supplier_admin'] },
      { name: '管理员管理', path: '/admin/admins', icon: Users, roles: ['super_admin'] },
      { name: '文件中心', path: '/files', icon: FileText, roles: ['super_admin', 'supplier_admin', 'buyer'] },
    ];

    return items.filter(item => item.roles.includes(user.role));
  }, [user]);

  const activeItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white sticky top-0 h-screen">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-emerald-400">迎鸿服装</h1>
          <p className="text-xs text-slate-400 mt-1">Temu牛仔裤拿货系统</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                location.pathname === item.path 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
              {location.pathname === item.path && (
                <motion.div layoutId="active-pill" className="ml-auto">
                  <ChevronRight size={16} />
                </motion.div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate">
                {user?.role === 'super_admin' ? '超级管理员' : user?.role === 'supplier_admin' ? '供应商管理员' : '拿货商'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">退出登录</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-lg font-bold text-emerald-400">迎鸿服装</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-40 bg-slate-900 pt-20 px-4"
          >
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl ${
                    location.pathname === item.path ? 'bg-emerald-500 text-white' : 'text-slate-400'
                  }`}
                >
                  <item.icon size={24} />
                  <span className="text-lg font-medium">{item.name}</span>
                </button>
              ))}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-4 text-red-400"
              >
                <LogOut size={24} />
                <span className="text-lg font-medium">退出登录</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        {isAdmin && <LowStockAlert />}
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{activeItem?.name}</h2>
              <p className="text-slate-500">欢迎回来，{user?.username}</p>
            </div>
            
            {isAdmin && (
              <div className="relative">
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all relative"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotifOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setIsNotifOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[70] overflow-hidden"
                      >
                        <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                          <h4 className="font-bold text-slate-900 text-sm">系统通知</h4>
                          {unreadCount > 0 && (
                            <button 
                              onClick={markAllAsRead}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
                            >
                              全部标记为已读
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                              暂无通知
                            </div>
                          ) : (
                            notifications.map(n => (
                              <div 
                                key={n.id} 
                                className={`p-4 border-b border-slate-50 last:border-0 transition-colors ${!n.is_read ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}
                              >
                                <p className={`text-xs leading-relaxed ${!n.is_read ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                                  {n.message}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2">
                                  {format(new Date(n.created_at), 'yyyy-MM-dd HH:mm')}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
