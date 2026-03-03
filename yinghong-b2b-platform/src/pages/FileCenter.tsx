import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileRecord, User } from '../types';
import { Upload, FileText, Download, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function FileCenter() {
  const { token, user } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState('all');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFiles();
    if (user?.role !== 'buyer') fetchUsers();
  }, []);

  const fetchFiles = async () => {
    const res = await fetch('/api/files', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setFiles(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Upload file
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const uploadData = await uploadRes.json();

      // 2. Create file record
      await fetch('/api/files/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: user?.role === 'buyer' ? 'admin' : selectedReceiver, // Buyers send to admin by default? Or all?
          url: uploadData.url,
          name: uploadData.name,
          size: uploadData.size
        })
      });
      
      fetchFiles();
    } catch (err) {
      console.error(err);
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">文件中心</h1>
        <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors cursor-pointer shadow-lg shadow-indigo-200">
          <Upload size={20} />
          {uploading ? '上传中...' : '上传文件'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {user?.role !== 'buyer' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700">发送给:</span>
          <select
            value={selectedReceiver}
            onChange={(e) => setSelectedReceiver(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">所有用户</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-500">文件名</th>
              <th className="px-6 py-4 font-medium text-slate-500">发送者</th>
              <th className="px-6 py-4 font-medium text-slate-500">日期</th>
              <th className="px-6 py-4 font-medium text-slate-500">大小</th>
              <th className="px-6 py-4 font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.map(file => (
              <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <FileText size={20} />
                    </div>
                    <span className="font-medium text-slate-900">{file.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <UserIcon size={16} />
                    {file.sender_name || '未知'}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {format(new Date(file.created_at), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </td>
                <td className="px-6 py-4">
                  <a 
                    href={file.url} 
                    download 
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={16} /> 下载
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {files.length === 0 && (
          <div className="p-8 text-center text-slate-500">暂无文件。</div>
        )}
      </div>
    </div>
  );
}
