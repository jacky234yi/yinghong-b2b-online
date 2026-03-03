import React from 'react';
import { 
  Plus, 
  Trash2, 
  Layers,
  X,
  Search,
  AlertCircle
} from 'lucide-react';
import { Partition, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface PartitionManagementProps {
  user: User;
}

export default function PartitionManagement({ user }: PartitionManagementProps) {
  const [partitions, setPartitions] = React.useState<Partition[]>([]);
  const [newPartitionName, setNewPartitionName] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    const res = await fetch('/api/partitions');
    setPartitions(await res.json());
  }, []);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddPartition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartitionName.trim()) return;

    setIsLoading(true);
    const res = await fetch('/api/partitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPartitionName })
    });

    if (res.ok) {
      setNewPartitionName('');
      setIsModalOpen(false);
      fetchData();
    } else {
      alert('添加失败');
    }
    setIsLoading(false);
  };

  const handleDeletePartition = async (id: number) => {
    if (!confirm('确定删除该分区吗？删除分区不会删除商品，但商品将失去分区归类。')) return;
    
    const res = await fetch(`/api/partitions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
    } else {
      alert('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">商品分区管理</h3>
            <p className="text-xs text-slate-500">管理全站商品的分类区域</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus size={18} />
          新建分区
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partitions.map(partition => (
          <div key={partition.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 card-hover group flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                <Layers size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{partition.name}</h4>
                <p className="text-xs text-slate-400">ID: {partition.id}</p>
              </div>
            </div>
            <button 
              onClick={() => handleDeletePartition(partition.id)}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {partitions.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Layers size={64} strokeWidth={1} />
            <p className="font-medium">暂无分区数据</p>
          </div>
        )}
      </div>

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
                <h3 className="text-xl font-bold text-slate-900">新建商品分区</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddPartition} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">分区名称</label>
                  <input 
                    required 
                    autoFocus
                    value={newPartitionName} 
                    onChange={e => setNewPartitionName(e.target.value)}
                    placeholder="例如：长裤区、大码区..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    分区名称将直接展示在拿货商前台，请确保名称简洁明了，方便拿货商快速定位商品。
                  </p>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="submit"
                    disabled={isLoading || !newPartitionName.trim()}
                    className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isLoading ? '正在保存...' : '确认创建'}
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
