import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Package, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LowStockItem {
  sku: string;
  size: string;
  stock: number;
}

export default function LowStockAlert() {
  const [lowStockItems, setLowStockItems] = React.useState<LowStockItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const checkLowStock = async () => {
      try {
        const res = await fetch('/api/skus/low-stock');
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setLowStockItems(data);
            setIsOpen(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch low stock items:', error);
      }
    };

    checkLowStock();
  }, []);

  if (!isOpen || lowStockItems.length === 0) return null;

  const criticalItems = lowStockItems.filter(item => item.stock <= 5);
  const warningItems = lowStockItems.filter(item => item.stock > 5 && item.stock <= 10);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
        >
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-amber-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">库存预警</h3>
                <p className="text-sm text-amber-700 font-medium">发现 {lowStockItems.length} 个商品库存不足</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
            {criticalItems.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  紧急补货 (≤5件)
                </h4>
                <div className="grid gap-2">
                  {criticalItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                      <div className="flex items-center gap-3">
                        <Package size={18} className="text-red-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.sku}</p>
                          <p className="text-[10px] text-red-600 font-medium">尺码: {item.size}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-red-600">{item.stock}</p>
                        <p className="text-[10px] text-red-400 uppercase font-bold">剩余件数</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {warningItems.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  库存偏低 (≤10件)
                </h4>
                <div className="grid gap-2">
                  {warningItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Package size={18} className="text-slate-400" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.sku}</p>
                          <p className="text-[10px] text-slate-500 font-medium">尺码: {item.size}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-700">{item.stock}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">剩余件数</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/products');
              }}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-slate-900/10"
            >
              前往库存管理
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
