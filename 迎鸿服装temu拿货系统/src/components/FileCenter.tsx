import React from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Search, 
  Plus, 
  X, 
  File, 
  User as UserIcon, 
  Calendar,
  MoreVertical,
  Trash2,
  Send,
  Users,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { FileItem, User } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface FileCenterProps {
  user: User;
}

export default function FileCenter({ user }: FileCenterProps) {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [buyers, setBuyers] = React.useState<User[]>([]);
  const [search, setSearch] = React.useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [receiverId, setReceiverId] = React.useState<number>(user.role === 'buyer' ? -1 : 0); 
  const [note, setNote] = React.useState('');

  const isAdmin = user.role === 'super_admin' || user.role === 'supplier_admin';

  const fetchData = React.useCallback(async () => {
    const res = await fetch(`/api/files?user_id=${user.id}`);
    setFiles(await res.json());
    if (isAdmin) {
      const bRes = await fetch('/api/buyers');
      setBuyers(await bRes.json());
    }
  }, [user, isAdmin]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('sender_id', user.id.toString());
    formData.append('receiver_id', receiverId.toString());
    formData.append('note', note);

    const res = await fetch('/api/files', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setReceiverId(user.role === 'buyer' ? -1 : 0);
      setNote('');
      fetchData();
    } else {
      alert('上传失败');
    }
  };

  const filteredFiles = files.filter(f => 
    f.original_name.toLowerCase().includes(search.toLowerCase()) ||
    f.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.note?.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Search & Upload Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索文件名、发送者或备注..." 
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
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Upload size={18} />
          上传文件
        </button>
      </div>

      {/* File List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredFiles.map(file => (
          <div key={file.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 card-hover group flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-slate-100 text-slate-500 rounded-xl group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                <File size={24} />
              </div>
              <a 
                href={`/api/files/download/${file.filename}`} 
                download={file.original_name}
                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
              >
                <Download size={20} />
              </a>
            </div>
            
            <div className="flex-1 min-w-0 mb-4">
              <h4 className="font-bold text-slate-900 truncate" title={file.original_name}>
                {file.original_name}
              </h4>
              {file.note && (
                <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-emerald-500 pl-2 py-0.5 bg-slate-50 rounded-r">
                  {file.note}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">{formatSize(file.size)}</p>
            </div>

            <div className="pt-4 border-t border-slate-50 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <UserIcon size={14} className="text-slate-300" />
                <span className="font-medium text-slate-700">{file.sender_name}</span>
                {file.receiver_id === 0 && (
                  <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">公开</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar size={14} className="text-slate-300" />
                <span>{format(new Date(file.created_at), 'yyyy-MM-dd HH:mm')}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredFiles.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <FileText size={64} strokeWidth={1} />
            <p className="font-medium">暂无文件记录</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsUploadModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">上传文件</h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleUpload} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">接收者</label>
                    <div className="relative">
                      <select 
                        value={receiverId} 
                        onChange={(e) => setReceiverId(parseInt(e.target.value))}
                        disabled={!isAdmin}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none text-sm disabled:opacity-70"
                      >
                        {isAdmin ? (
                          <>
                            <option value={0}>所有人 (广播)</option>
                            {buyers.map(b => (
                              <option key={b.id} value={b.id}>{b.username}</option>
                            ))}
                          </>
                        ) : (
                          <option value={-1}>所有管理员</option>
                        )}
                      </select>
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {receiverId === 0 ? <Users size={18} /> : receiverId === -1 ? <ShieldCheck size={18} /> : <UserIcon size={18} />}
                      </div>
                      {isAdmin && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">文件备注 (可选)</label>
                    <input 
                      type="text" 
                      placeholder="例如：主图包、详情页、尺码表..." 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">选择文件</label>
                    {uploadFile ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <File className="text-emerald-500" size={24} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{uploadFile.name}</p>
                            <p className="text-xs text-emerald-600">{formatSize(uploadFile.size)}</p>
                          </div>
                        </div>
                        <button onClick={() => setUploadFile(null)} className="p-1 text-emerald-400 hover:text-emerald-600">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-40 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-all bg-slate-50/50">
                        <Upload size={32} strokeWidth={1.5} />
                        <span className="text-sm font-medium mt-3">点击或拖拽文件上传</span>
                        <span className="text-[10px] mt-1 text-slate-400">最大支持 50MB</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)} 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="submit"
                    disabled={!uploadFile}
                    className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    确认上传
                  </button>
                  <button 
                    type="button" onClick={() => setIsUploadModalOpen(false)}
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
