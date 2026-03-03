import React from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  Upload, 
  X, 
  ChevronDown,
  AlertCircle,
  Package,
  CheckCircle2,
  Download,
  ShoppingCart,
  Clock,
  Minus,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Product, Partition, User, SKU } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ProductListProps {
  user: User;
}

export default function ProductList({ user }: ProductListProps) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [partitions, setPartitions] = React.useState<Partition[]>([]);
  const [search, setSearch] = React.useState('');
  const [selectedPartition, setSelectedPartition] = React.useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Partial<Product> | null>(null);
  const [viewingProduct, setViewingProduct] = React.useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [cart, setCart] = React.useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const isAdmin = user.role === 'super_admin' || user.role === 'supplier_admin';

  const [quickStockEdit, setQuickStockEdit] = React.useState<{skuId: number, stock: number, restock_date: string, restock_quantity: number} | null>(null);

  const fetchData = React.useCallback(async () => {
    const [prodRes, partRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/partitions')
    ]);
    setProducts(await prodRes.json());
    setPartitions(await partRes.json());
  }, []);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.sku.toLowerCase().includes(search.toLowerCase()) || 
                         p.notes.toLowerCase().includes(search.toLowerCase());
    const matchesPartition = selectedPartition ? p.partition_id === selectedPartition : true;
    return matchesSearch && matchesPartition;
  });

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingProduct?.id ? 'PUT' : 'POST';
    const url = editingProduct?.id ? `/api/products/${editingProduct.id}` : '/api/products';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingProduct)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchData();
    } else {
      const data = await res.json();
      alert(data.message || '保存失败');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('确定删除该商品吗？')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const addToCart = (product: Product, sku: SKU) => {
    if (sku.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.sku_id === sku.id);
      if (existing) {
        return prev.map(item => item.sku_id === sku.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
        product_id: product.id, 
        sku_id: sku.id, 
        sku: product.sku, 
        size: sku.size, 
        price: product.price, 
        quantity: 1,
        color: product.color
      }];
    });
  };

  const submitOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const total = cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) * user.discount;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, items: cart, total_amount: total })
      });

      if (res.ok) {
        setCart([]);
        setIsCartOpen(false);
        setShowSuccess(true);
        fetchData();
        // Auto hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const data = await res.json();
        alert(data.message || '下单失败');
      }
    } catch (error) {
      console.error('Order submission error:', error);
      alert('网络错误，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'detail' | 'chart') => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files) as File[]) {
      if (file.size > 50 * 1024 * 1024) {
        alert('文件大小不能超过50MB');
        continue;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setEditingProduct(prev => {
          if (!prev) return prev;
          if (type === 'main') return { ...prev, main_images: [...(prev.main_images || []), base64] };
          if (type === 'detail') return { ...prev, detail_images: [...(prev.detail_images || []), base64] };
          return { ...prev, size_chart: base64 };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadImage = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickStockUpdate = async (skuId: number, newStock: number, restockDate: string, restockQuantity: number) => {
    try {
      const res = await fetch(`/api/skus/${skuId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock, restock_date: restockDate, restock_quantity: restockQuantity })
      });
      if (res.ok) {
        await fetchData();
        setQuickStockEdit(null);
      } else {
        const data = await res.json();
        alert(data.message || '更新失败');
      }
    } catch (error) {
      console.error('Stock update error:', error);
      alert('网络错误，请稍后再试');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索货号或备注..." 
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button 
            onClick={() => setSelectedPartition(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedPartition === null ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部
          </button>
          {partitions.map(p => (
            <button 
              key={p.id}
              onClick={() => setSelectedPartition(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedPartition === p.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setEditingProduct({ skus: [], main_images: [], detail_images: [] }); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus size={18} />
            上架商品
          </button>
        )}
        {!isAdmin && cart.length > 0 && (
          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors relative"
          >
            <ShoppingCart size={18} />
            购物车 ({cart.length})
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </button>
        )}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden card-hover group">
            <div 
              className="relative aspect-[3/4] overflow-hidden bg-slate-100 cursor-pointer"
              onClick={() => { setViewingProduct(product); setIsDetailModalOpen(true); }}
            >
              {product.main_images?.[0] ? (
                <img 
                  src={product.main_images[0]} 
                  alt={product.sku} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon size={48} />
                </div>
              )}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                  {product.partition_name}
                </span>
                {product.notes && (
                  <span className="bg-emerald-500/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                    {product.notes}
                  </span>
                )}
              </div>
              {isAdmin && (
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                    className="p-2 bg-white/90 backdrop-blur-md text-slate-700 rounded-lg hover:bg-white transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-lg hover:bg-white transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div 
                  className="cursor-pointer hover:text-emerald-600 transition-colors"
                  onClick={() => { setViewingProduct(product); setIsDetailModalOpen(true); }}
                >
                  <h3 className="font-bold text-slate-900">{product.sku}</h3>
                  <p className="text-xs text-slate-500">{product.color} | {product.fabric}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600">¥{product.price}</p>
                  {!isAdmin && user.discount < 1 && (
                    <p className="text-[10px] text-slate-400 line-through">¥{Math.round(product.price / user.discount)}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 mt-4">
                <div className="flex flex-wrap gap-2">
                  {product.skus.map(sku => (
                    <div key={sku.id} className="relative group/sku">
                      <button
                        onClick={() => !isAdmin && addToCart(product, sku)}
                        disabled={sku.stock <= 0 && !isAdmin}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex flex-col items-center min-w-[48px] relative ${
                          sku.stock <= 0 
                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                            : isAdmin 
                              ? 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-500'
                        }`}
                      >
                        {!isAdmin && cart.find(i => i.sku_id === sku.id) && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -left-2 bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm border border-white z-10"
                          >
                            {cart.find(i => i.sku_id === sku.id).quantity}
                          </motion.div>
                        )}
                        <span>{sku.size}</span>
                        <span className={`text-[10px] ${sku.stock < 5 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                          {sku.stock}
                        </span>
                        {sku.restock_date && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white" title={`预计 ${sku.restock_date} 到货`} />
                        )}
                      </button>
                      
                      {isAdmin && (
                        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/sku:opacity-100 transition-opacity z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickStockEdit({ 
                                skuId: sku.id, 
                                stock: sku.stock, 
                                restock_date: sku.restock_date || '',
                                restock_quantity: sku.restock_quantity || 0
                              });
                            }}
                            className="p-1 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600"
                          >
                            <Edit2 size={10} />
                          </button>
                        </div>
                      )}
                      
                      {sku.restock_date && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full bg-slate-900 text-white text-[8px] px-1 rounded opacity-0 group-hover/sku:opacity-100 transition-opacity whitespace-nowrap z-20">
                          预计 {sku.restock_date} 到货 {sku.restock_quantity > 0 ? `(${sku.restock_quantity}条)` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {product.skus.some(s => s.stock < 5 && s.stock > 0) && (
                  <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-medium">部分尺码库存不足</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Detail Modal for Buyers */}
      <AnimatePresence>
        {isDetailModalOpen && viewingProduct && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsDetailModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="text-emerald-500" size={24} />
                  <h3 className="text-xl font-bold text-slate-900">商品详情: {viewingProduct.sku}</h3>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Column: Images */}
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        商品主图
                        <span className="text-[10px] font-normal normal-case text-slate-400">点击下载按钮保存图片</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {viewingProduct.main_images?.map((img, i) => (
                          <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-100 group">
                            <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => downloadImage(img, `${viewingProduct.sku}_main_${i+1}.jpg`)}
                              className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-md text-slate-700 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-white"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {viewingProduct.size_chart && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                          尺码表
                          <button 
                            onClick={() => downloadImage(viewingProduct.size_chart, `${viewingProduct.sku}_size_chart.jpg`)}
                            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-xs font-bold"
                          >
                            <Download size={14} /> 下载尺码表
                          </button>
                        </h4>
                        <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 p-4">
                          <img src={viewingProduct.size_chart} className="w-full h-auto object-contain" referrerPolicy="no-referrer" />
                        </div>
                      </div>
                    )}

                    {viewingProduct.detail_images?.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">详情图</h4>
                        <div className="space-y-4">
                          {viewingProduct.detail_images.map((img, i) => (
                            <div key={i} className="relative rounded-2xl overflow-hidden border border-slate-100 group">
                              <img src={img} className="w-full h-auto" referrerPolicy="no-referrer" />
                              <button 
                                onClick={() => downloadImage(img, `${viewingProduct.sku}_detail_${i+1}.jpg`)}
                                className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-md text-slate-700 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-white"
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Info & Stock */}
                  <div className="space-y-10">
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-2xl font-bold text-slate-900 mb-1">{viewingProduct.sku}</h4>
                          <p className="text-slate-500">{viewingProduct.partition_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-emerald-600">¥{viewingProduct.price}</p>
                          {user.discount < 1 && (
                            <p className="text-sm text-slate-400 line-through">原价 ¥{Math.round(viewingProduct.price / user.discount)}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">颜色</p>
                          <p className="font-medium text-slate-700">{viewingProduct.color}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">面料</p>
                          <p className="font-medium text-slate-700">{viewingProduct.fabric || '未填写'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">成分</p>
                          <p className="font-medium text-slate-700">{viewingProduct.composition || '未填写'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">弹性</p>
                          <p className="font-medium text-slate-700">{viewingProduct.elasticity || '未填写'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">克重</p>
                          <p className="font-medium text-slate-700">{viewingProduct.weight ? `${viewingProduct.weight}kg` : '未填写'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">备注</p>
                          <p className="font-medium text-slate-700">{viewingProduct.notes || '无'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">库存与尺码</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {viewingProduct.skus.map(sku => (
                          <div 
                            key={sku.id} 
                            className={`p-4 rounded-2xl border transition-all ${
                              sku.stock <= 0 
                                ? 'bg-slate-50 border-slate-100 opacity-50' 
                                : 'bg-white border-slate-200 shadow-sm hover:border-emerald-500'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-lg font-bold text-slate-900">{sku.size}</span>
                              {sku.stock <= 0 ? (
                                <span className="text-[10px] font-bold text-red-500 px-2 py-0.5 bg-red-50 rounded-full">缺货</span>
                              ) : sku.stock < 5 ? (
                                <span className="text-[10px] font-bold text-amber-500 px-2 py-0.5 bg-amber-50 rounded-full">低库存</span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-50 rounded-full">有货</span>
                              )}
                            </div>
                            <div className="flex items-end justify-between">
                              <span className="text-xs text-slate-400">当前库存</span>
                              <span className={`text-xl font-bold ${sku.stock < 5 ? 'text-amber-600' : 'text-slate-700'}`}>{sku.stock}</span>
                            </div>
                            {sku.restock_date && (
                              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                <Clock size={12} />
                                <span>预计 {sku.restock_date} 到货 {sku.restock_quantity > 0 ? `(${sku.restock_quantity}条)` : ''}</span>
                              </div>
                            )}
                            {!isAdmin && sku.stock > 0 && (
                              <button 
                                onClick={() => addToCart(viewingProduct, sku)}
                                className={`w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                  cart.find(i => i.sku_id === sku.id)
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                }`}
                              >
                                {cart.find(i => i.sku_id === sku.id) ? (
                                  <>
                                    <CheckCircle2 size={14} />
                                    已加 {cart.find(i => i.sku_id === sku.id).quantity} 件
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart size={14} />
                                    加入购物车
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-4">
                      <AlertCircle className="text-blue-500 shrink-0" size={20} />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-blue-900">上架小贴士</p>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          您可以直接下载主图和详情图用于您的店铺上架。尺码表信息已为您汇总，方便您快速录入商品参数。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Stock Edit Modal */}
      <AnimatePresence>
        {quickStockEdit && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setQuickStockEdit(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">快捷库存管理</h3>
                <button onClick={() => setQuickStockEdit(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">当前库存</label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setQuickStockEdit(p => p ? ({ ...p, stock: Math.max(0, p.stock - 1) }) : p)}
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <input 
                      type="number" 
                      value={quickStockEdit.stock}
                      onChange={e => setQuickStockEdit(p => p ? ({ ...p, stock: parseInt(e.target.value) || 0 }) : p)}
                      className="flex-1 text-center text-xl font-bold text-slate-900 bg-slate-50 border border-slate-200 py-2 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button 
                      onClick={() => setQuickStockEdit(p => p ? ({ ...p, stock: p.stock + 1 }) : p)}
                      className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">预计到货时间</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="如：3月15日"
                      value={quickStockEdit.restock_date}
                      onChange={e => setQuickStockEdit(p => p ? ({ ...p, restock_date: e.target.value }) : p)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">预计到货数量</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="number" 
                      placeholder="预计到货条数"
                      value={quickStockEdit.restock_quantity}
                      onChange={e => setQuickStockEdit(p => p ? ({ ...p, restock_quantity: parseInt(e.target.value) || 0 }) : p)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleQuickStockUpdate(quickStockEdit.skuId, quickStockEdit.stock, quickStockEdit.restock_date, quickStockEdit.restock_quantity)}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-bold hover:bg-slate-800 transition-colors"
                >
                  确认更新
                </button>
                <button 
                  onClick={() => setQuickStockEdit(null)}
                  className="px-6 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Edit Modal */}
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
              className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{editingProduct?.id ? '编辑商品' : '上架新商品'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">基本信息</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">货号</label>
                        <input 
                          required value={editingProduct?.sku || ''} 
                          onChange={e => setEditingProduct(p => ({ ...p, sku: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">分区</label>
                        <select 
                          required value={editingProduct?.partition_id || ''} 
                          onChange={e => setEditingProduct(p => ({ ...p, partition_id: parseInt(e.target.value) }))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="">选择分区</option>
                          {partitions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">价格</label>
                        <input 
                          type="number" required value={editingProduct?.price || ''} 
                          onChange={e => setEditingProduct(p => ({ ...p, price: parseFloat(e.target.value) }))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">颜色</label>
                        <input 
                          required value={editingProduct?.color || ''} 
                          onChange={e => setEditingProduct(p => ({ ...p, color: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">面料</label>
                        <input 
                          value={editingProduct?.fabric || ''} 
                          onChange={e => setEditingProduct(p => ({ ...p, fabric: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">成分</label>
                        <input 
                          value={editingProduct?.composition || ''} 
                          onChange={e => setEditingProduct(p => ({ ...p, composition: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">弹性</label>
                        <input 
                          value={editingProduct?.elasticity || ''} 
                          onChange={e => setEditingProduct(p => ({ ...p, elasticity: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">克重</label>
                        <input 
                          type="number" step="0.01" value={editingProduct?.weight || ''} 
                          onChange={e => setEditingProduct(p => ({ ...p, weight: parseFloat(e.target.value) }))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">备注 (如：新款、清仓)</label>
                      <input 
                        value={editingProduct?.notes || ''} 
                        onChange={e => setEditingProduct(p => ({ ...p, notes: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Images */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">商品图片</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">主图 (可多张)</label>
                        <div className="flex flex-wrap gap-2">
                          {editingProduct?.main_images?.map((img, i) => (
                            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                              <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <button 
                                type="button"
                                onClick={() => setEditingProduct(p => ({ ...p, main_images: p.main_images?.filter((_, idx) => idx !== i) }))}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-colors">
                            <Upload size={20} />
                            <span className="text-[10px] mt-1">上传</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'main')} />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">详情图 (可多张)</label>
                        <div className="flex flex-wrap gap-2">
                          {editingProduct?.detail_images?.map((img, i) => (
                            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                              <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <button 
                                type="button"
                                onClick={() => setEditingProduct(p => ({ ...p, detail_images: p.detail_images?.filter((_, idx) => idx !== i) }))}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-colors">
                            <Upload size={20} />
                            <span className="text-[10px] mt-1">上传</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'detail')} />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">尺码表</label>
                        {editingProduct?.size_chart ? (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200">
                            <img src={editingProduct.size_chart} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setEditingProduct(p => ({ ...p, size_chart: '' }))}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <label className="w-full h-32 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-colors">
                            <Upload size={24} />
                            <span className="text-xs mt-2">上传尺码表图片</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'chart')} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SKU Management */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">尺码与库存</h4>
                    <button 
                      type="button"
                      onClick={() => setEditingProduct(p => ({ ...p, skus: [...(p.skus || []), { size: '', stock: 0 }] }))}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus size={14} /> 添加尺码
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {editingProduct?.skus?.map((sku, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative group">
                        <input 
                          placeholder="尺码" value={sku.size} 
                          onChange={e => {
                            const newSkus = [...(editingProduct.skus || [])];
                            newSkus[i].size = e.target.value;
                            setEditingProduct(p => ({ ...p, skus: newSkus }));
                          }}
                          className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none mb-1"
                        />
                        <input 
                          type="number" placeholder="库存" value={sku.stock} 
                          onChange={e => {
                            const newSkus = [...(editingProduct.skus || [])];
                            newSkus[i].stock = parseInt(e.target.value);
                            setEditingProduct(p => ({ ...p, skus: newSkus }));
                          }}
                          className="w-full bg-transparent text-xs text-slate-500 outline-none"
                        />
                        <button 
                          type="button"
                          onClick={() => setEditingProduct(p => ({ ...p, skus: p.skus?.filter((_, idx) => idx !== i) }))}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    保存商品信息
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

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">购物车</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <ShoppingCart size={64} strokeWidth={1} />
                    <p className="font-medium">购物车是空的</p>
                  </div>
                ) : (
                  cart.map((item, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{item.sku}</h4>
                        <p className="text-xs text-slate-500">尺码: {item.size} | 颜色: {item.color}</p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-2 py-1">
                            <button 
                              onClick={() => setCart(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))}
                              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900"
                            >
                              -
                            </button>
                            <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => setCart(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: it.quantity + 1 } : it))}
                              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900"
                            >
                              +
                            </button>
                          </div>
                          <p className="font-bold text-emerald-600">¥{item.price * item.quantity}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCart(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-slate-100 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>商品总计</span>
                    <span>¥{cart.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
                  </div>
                  {user.discount < 1 && (
                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                      <span>专属折扣 ({(user.discount * 10).toFixed(1)}折)</span>
                      <span>-¥{Math.round(cart.reduce((s, i) => s + i.price * i.quantity, 0) * (1 - user.discount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-50">
                    <span>应付金额</span>
                    <span>¥{Math.round(cart.reduce((s, i) => s + i.price * i.quantity, 0) * user.discount)}</span>
                  </div>
                </div>
                <button 
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={submitOrder}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      正在提交...
                    </>
                  ) : (
                    '立即下单'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Feedback Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none p-4"
          >
            <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center space-y-4 text-center max-w-xs w-full pointer-events-auto">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="text-white" size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">下单成功</h3>
                <p className="text-slate-500 mt-1">您的订单已提交，请等待管理员配货</p>
              </div>
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all"
              >
                知道了
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
