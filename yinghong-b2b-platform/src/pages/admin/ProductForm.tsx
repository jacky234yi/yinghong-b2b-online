import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Product, Variant, ProductImage, Category } from '../../types';
import { Upload, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    category_id: '',
    fabric: '',
    weight: '',
    elasticity: '',
    composition: '',
    price: 0,
    tags: [],
    description: '',
    variants: [],
    images: []
  });

  useEffect(() => {
    fetchCategories();
    if (id) fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data);
  };

  const fetchProduct = async () => {
    const res = await fetch(`/api/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setFormData(data);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'detail' | 'size_chart') => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), { id: '', product_id: '', url: data.url, type }]
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index)
    }));
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...(prev.variants || []), { id: '', product_id: '', color: '', size: '', stock: 0, weight: 0, volume: 0 }]
    }));
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...(formData.variants || [])];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants?.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = id ? `/api/products/${id}` : '/api/products';
      const method = id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error('Failed to save product');
      navigate('/admin/products');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/products')} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{id ? '编辑商品' : '新增商品'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">基本信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">商品名称</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">货号 (SKU)</label>
              <input
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="">选择分类</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">价格 (¥)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">面料</label>
              <input name="fabric" value={formData.fabric} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">克重</label>
              <input name="weight" value={formData.weight} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">弹力</label>
              <input name="elasticity" value={formData.elasticity} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">成分</label>
              <input name="composition" value={formData.composition} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">商品描述</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Variants */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-semibold text-slate-900">库存与规格</h2>
            <button type="button" onClick={addVariant} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm font-medium">
              <Plus size={16} /> 添加规格
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.variants?.map((variant, index) => (
              <div key={index} className="grid grid-cols-6 gap-4 items-end bg-slate-50 p-4 rounded-lg">
                <div className="col-span-1">
                  <label className="text-xs text-slate-500">颜色</label>
                  <input
                    value={variant.color}
                    onChange={(e) => updateVariant(index, 'color', e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    placeholder="如：蓝色"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-slate-500">尺码</label>
                  <input
                    value={variant.size}
                    onChange={(e) => updateVariant(index, 'size', e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    placeholder="如：M"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-slate-500">库存</label>
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value))}
                    className="w-full px-2 py-1 border rounded"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-slate-500">重量 (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.weight}
                    onChange={(e) => updateVariant(index, 'weight', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 border rounded"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-slate-500">体积 (m³)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={variant.volume}
                    onChange={(e) => updateVariant(index, 'volume', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 border rounded"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button type="button" onClick={() => removeVariant(index)} className="text-red-500 hover:text-red-700 p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {formData.variants?.length === 0 && (
              <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                暂无规格，请添加。
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">商品图片</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Images */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">主图</h3>
              <div className="grid grid-cols-2 gap-2">
                {formData.images?.filter(i => i.type === 'main').map((img, idx) => (
                  <div key={idx} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    <img src={img.url} alt="Main" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(formData.images!.indexOf(img))}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                  <Upload size={24} className="text-slate-400" />
                  <span className="text-xs text-slate-500 mt-2">上传主图</span>
                  <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'main')} />
                </label>
              </div>
            </div>

            {/* Detail Images */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">详情图</h3>
              <div className="grid grid-cols-2 gap-2">
                {formData.images?.filter(i => i.type === 'detail').map((img, idx) => (
                  <div key={idx} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    <img src={img.url} alt="Detail" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(formData.images!.indexOf(img))}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                  <Upload size={24} className="text-slate-400" />
                  <span className="text-xs text-slate-500 mt-2">上传详情图</span>
                  <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'detail')} />
                </label>
              </div>
            </div>

            {/* Size Chart */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">尺码表</h3>
              <div className="grid grid-cols-2 gap-2">
                {formData.images?.filter(i => i.type === 'size_chart').map((img, idx) => (
                  <div key={idx} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    <img src={img.url} alt="Size Chart" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(formData.images!.indexOf(img))}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                  <Upload size={24} className="text-slate-400" />
                  <span className="text-xs text-slate-500 mt-2">上传尺码表</span>
                  <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'size_chart')} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="px-6 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Save size={20} />
            {loading ? '保存中...' : '保存商品'}
          </button>
        </div>
      </form>
    </div>
  );
}
