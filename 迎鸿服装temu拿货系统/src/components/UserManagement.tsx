import React from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit2, 
  Search, 
  X, 
  Shield, 
  Percent, 
  StickyNote,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface UserManagementProps {
  user: User;
  type: 'admins' | 'buyers';
}

export default function UserManagement({ user, type }: UserManagementProps) {
  const [users, setUsers] = React.useState<User[]>([]);
  const [search, setSearch] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<Partial<User> | null>(null);
  const [newAdmin, setNewAdmin] = React.useState({ username: '', password: '' });

  const fetchData = React.useCallback(async () => {
    const endpoint = type === 'admins' ? '/api/admins' : '/api/buyers';
    const res = await fetch(endpoint);
    setUsers(await res.json());
  }, [type]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAdmin)
    });
    if (res.ok) {
      setIsModalOpen(false);
      setNewAdmin({ username: '', password: '' });
      fetchData();
    } else {
      alert('创建失败，用户名可能已存在');
    }
  };

  const handleUpdateBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const res = await fetch(`/api/buyers/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discount: editingUser.discount, notes: editingUser.notes })
    });
    if (res.ok) {
      setIsModalOpen(false);
      setEditingUser(null);
      fetchData();
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm('确定删除该管理员吗？')) return;
    await fetch(`/api/admins/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.notes?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`搜索${type === 'admins' ? '管理员' : '拿货商'}...`} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <button 
            onClick={() => fetchData()}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <Search size={16} />
            搜索
          </button>
        </div>
        {type === 'admins' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <UserPlus size={18} />
            新增管理员
          </button>
        )}
      </div>

      {/* User List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 card-hover group">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === 'admins' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  {type === 'admins' ? <Shield size={24} /> : <Users size={24} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{u.username}</h4>
                  <p className="text-xs text-slate-400">ID: {u.id.toString().padStart(4, '0')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {type === 'buyers' ? (
                  <button 
                    onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleDeleteAdmin(u.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {type === 'buyers' && (
                <>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <Percent size={14} />
                      专属折扣
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{(u.discount * 10).toFixed(1)} 折</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <StickyNote size={14} />
                      私密备注
                    </div>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 min-h-[60px]">
                      {u.notes || '暂无备注'}
                    </p>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-50">
                <Calendar size={14} className="text-slate-300" />
                <span>注册于: {format(new Date(u.created_at), 'yyyy-MM-dd')}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Users size={64} strokeWidth={1} />
            <p className="font-medium">暂无匹配的用户</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {type === 'admins' ? '新增管理员' : '编辑拿货商信息'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={type === 'admins' ? handleAddAdmin : handleUpdateBuyer} className="p-8 space-y-6">
                {type === 'admins' ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">用户名</label>
                      <input 
                        required value={newAdmin.username} 
                        onChange={e => setNewAdmin(p => ({ ...p, username: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">初始密码</label>
                      <input 
                        type="password" required value={newAdmin.password} 
                        onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">专属折扣 (0.1 - 1.0)</label>
                      <div className="relative">
                        <input 
                          type="number" step="0.1" min="0.1" max="1.0"
                          required value={editingUser?.discount || 1.0} 
                          onChange={e => setEditingUser(p => ({ ...p, discount: parseFloat(e.target.value) }))}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      </div>
                      <p className="text-[10px] text-slate-400">示例: 0.8 代表 8折</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">私密备注</label>
                      <textarea 
                        value={editingUser?.notes || ''} 
                        onChange={e => setEditingUser(p => ({ ...p, notes: e.target.value }))}
                        placeholder="仅管理员可见的备注信息..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 h-32 resize-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    确认保存
                  </button>
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="px-8 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
