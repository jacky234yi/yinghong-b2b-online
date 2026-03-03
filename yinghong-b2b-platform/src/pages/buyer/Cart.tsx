import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, ArrowRight } from 'lucide-react';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart, totalAmount } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    
    try {
      const items = cart.map(item => ({
        variant_id: item.variantId,
        quantity: item.quantity
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      });

      if (!res.ok) throw new Error('Checkout failed');
      
      clearCart();
      navigate('/buyer/orders');
      alert('下单成功！');
    } catch (err) {
      console.error(err);
      alert('下单失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">购物车是空的</h2>
        <button 
          onClick={() => navigate('/buyer')}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          继续购物
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">购物车</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="divide-y divide-slate-100">
          {cart.map(item => (
            <div key={item.variantId} className="p-6 flex items-center gap-6">
              <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">无图片</div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">{item.productName}</h3>
                <p className="text-sm text-slate-500">货号: {item.sku}</p>
                <div className="flex gap-4 mt-1 text-sm text-slate-600">
                  <span>颜色: {item.color}</span>
                  <span>尺码: {item.size}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                >-</button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                >+</button>
              </div>

              <div className="text-right w-24">
                <p className="font-bold text-slate-900">¥{(item.price * item.quantity).toFixed(2)}</p>
                <p className="text-xs text-slate-400">¥{item.price.toFixed(2)} / 件</p>
              </div>

              <button 
                onClick={() => removeFromCart(item.variantId)}
                className="text-slate-400 hover:text-red-500 p-2"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end items-center gap-8 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="text-right">
          <p className="text-slate-500 mb-1">总金额</p>
          <p className="text-3xl font-bold text-indigo-600">¥{totalAmount.toFixed(2)}</p>
        </div>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? '处理中...' : '去结算'}
          <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
}
