import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Product, Variant } from '../../types';
import { ArrowLeft, ShoppingCart, Info } from 'lucide-react';
import clsx from 'clsx';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    const res = await fetch(`/api/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setProduct(data);
    if (data.images.length > 0) setSelectedImage(data.images.find((i: any) => i.type === 'main')?.url || data.images[0].url);
    if (data.variants.length > 0) setSelectedColor(data.variants[0].color);
  };

  if (!product) return <div>Loading...</div>;

  const colors = Array.from(new Set(product.variants.map(v => v.color)));
  const sizes = Array.from(new Set(product.variants.filter(v => v.color === selectedColor).map(v => v.size)));
  
  const currentVariant = product.variants.find(v => v.color === selectedColor && v.size === selectedSize);
  const maxStock = currentVariant ? currentVariant.stock : 0;

  const handleAddToCart = () => {
    if (!currentVariant) return;
    addToCart(product, currentVariant, quantity);
    alert('已添加到购物车！');
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <button onClick={() => navigate('/buyer')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft size={20} /> 返回列表
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden">
            <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {product.images.map((img, idx) => (
              <button 
                key={idx} 
                onClick={() => setSelectedImage(img.url)}
                className={clsx(
                  "w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0",
                  selectedImage === img.url ? "border-indigo-600" : "border-transparent"
                )}
              >
                <img src={img.url} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
            <p className="text-slate-500 mt-1">货号: {product.sku}</p>
            <p className="text-2xl font-bold text-indigo-600 mt-4">¥{product.price.toFixed(2)}</p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-2">颜色</h3>
              <div className="flex flex-wrap gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => { setSelectedColor(color); setSelectedSize(''); }}
                    className={clsx(
                      "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                      selectedColor === color 
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-2">尺码</h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => {
                  const variant = product.variants.find(v => v.color === selectedColor && v.size === size);
                  const stock = variant?.stock || 0;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={stock === 0}
                      className={clsx(
                        "px-4 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[3rem]",
                        selectedSize === size 
                          ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                          : stock === 0 
                            ? "border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedColor && selectedSize && (
              <div className="p-4 bg-slate-50 rounded-lg flex items-start gap-3">
                <Info size={20} className="text-indigo-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">当前库存: {maxStock}</p>
                  {maxStock < 10 && <p className="text-xs text-red-500 mt-1">库存紧张，请尽快下单！</p>}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-slate-200 rounded-lg">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-50"
                >-</button>
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(Math.max(1, Math.min(parseInt(e.target.value) || 1, maxStock)))}
                  className="w-16 text-center outline-none"
                />
                <button 
                  onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-50"
                >+</button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || maxStock === 0}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                <ShoppingCart size={20} />
                加入购物车
              </button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-medium text-slate-900 mb-2">商品详情</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-4">
              <p>面料: {product.fabric}</p>
              <p>克重: {product.weight}</p>
              <p>弹力: {product.elasticity}</p>
              <p>成分: {product.composition}</p>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
