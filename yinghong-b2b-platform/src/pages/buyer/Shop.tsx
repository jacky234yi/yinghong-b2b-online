import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ShoppingCart } from 'lucide-react';
import { Product, Category } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { token } = useAuth();
  const { totalItems } = useCart();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('/api/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setProducts(data);
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">商品列表</h1>
        <Link to="/buyer/cart" className="relative p-2 bg-white rounded-full shadow-sm hover:bg-slate-50">
          <ShoppingCart size={24} className="text-slate-700" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="搜索商品..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">所有分类</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map(product => {
          const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
          return (
            <Link key={product.id} to={`/buyer/products/${product.id}`} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                {product.images.find(i => i.type === 'main') ? (
                  <img 
                    src={product.images.find(i => i.type === 'main')?.url} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">暂无图片</div>
                )}
                {totalStock < 5 && totalStock > 0 && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    库存紧张
                  </div>
                )}
                {totalStock === 0 && (
                  <div className="absolute top-2 right-2 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded">
                    已售罄
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-slate-900 truncate">{product.name}</h3>
                <p className="text-sm text-slate-500 mb-2">{product.sku}</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">¥{product.price.toFixed(2)}</span>
                  <span className="text-xs text-slate-500">库存: {totalStock}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
