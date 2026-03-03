import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import { Edit, Save, X } from 'lucide-react';

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const { token } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ discount_rate: number; notes: string }>({ discount_rate: 1, notes: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(data);
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({ discount_rate: user.discount_rate || 1, notes: user.notes || '' });
  };

  const saveEdit = async (id: string) => {
    await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(editForm)
    });
    setEditingId(null);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">拿货商管理</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-500">姓名 / 店铺名</th>
              <th className="px-6 py-4 font-medium text-slate-500">手机号</th>
              <th className="px-6 py-4 font-medium text-slate-500">折扣率</th>
              <th className="px-6 py-4 font-medium text-slate-500">内部备注</th>
              <th className="px-6 py-4 font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                <td className="px-6 py-4 text-slate-600">{user.phone}</td>
                <td className="px-6 py-4">
                  {editingId === user.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.discount_rate}
                      onChange={(e) => setEditForm({ ...editForm, discount_rate: parseFloat(e.target.value) })}
                      className="w-20 px-2 py-1 border rounded"
                    />
                  ) : (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                      {(user.discount_rate || 1).toFixed(2)}x
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {editingId === user.id ? (
                    <input
                      type="text"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  ) : (
                    user.notes || '-'
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === user.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => saveEdit(user.id)} className="text-green-600 hover:text-green-800"><Save size={18} /></button>
                      <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-800"><X size={18} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(user)} className="text-indigo-600 hover:text-indigo-800">
                      <Edit size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
