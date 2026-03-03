import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Order } from '../../types';
import { Package, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { token } = useAuth();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const res = await fetch('/api/orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setOrders(data);
  };

  const handleCancelItem = async (itemId: string) => {
    const reason = prompt('请输入取消原因:');
    if (!reason) return;

    await fetch('/api/orders/cancel-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ order_item_id: itemId, reason })
    });
    fetchOrders();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">我的订单</h1>

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">订单号 #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">{format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                  order.status === 'pending' && "bg-yellow-100 text-yellow-800",
                  order.status === 'processing' && "bg-blue-100 text-blue-800",
                  order.status === 'shipped' && "bg-indigo-100 text-indigo-800",
                  order.status === 'completed' && "bg-green-100 text-green-800",
                  order.status === 'cancelled' && "bg-red-100 text-red-800",
                )}>
                  {order.status === 'pending' && '待处理'}
                  {order.status === 'processing' && '处理中'}
                  {order.status === 'shipped' && '已发货'}
                  {order.status === 'completed' && '已完成'}
                  {order.status === 'cancelled' && '已取消'}
                </span>

                <button 
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {expandedOrder === order.id ? '收起详情' : '查看详情'}
                </button>
              </div>
            </div>

            {expandedOrder === order.id && (
              <div className="p-6">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500 border-b">
                    <tr>
                      <th className="pb-2">商品</th>
                      <th className="pb-2">规格</th>
                      <th className="pb-2">数量</th>
                      <th className="pb-2">单价</th>
                      <th className="pb-2">状态</th>
                      <th className="pb-2">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {order.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-3 font-medium">{item.product_name}</td>
                        <td className="py-3 text-slate-500">{item.color} / {item.size}</td>
                        <td className="py-3">{item.quantity}</td>
                        <td className="py-3">¥{item.price_at_time.toFixed(2)}</td>
                        <td className="py-3">
                          {item.status === 'normal' && <span className="text-slate-500">正常</span>}
                          {item.status === 'cancellation_requested' && <span className="text-orange-600">申请取消中</span>}
                          {item.status === 'cancelled' && <span className="text-red-500 line-through">已取消</span>}
                        </td>
                        <td className="py-3">
                          {item.status === 'normal' && (order.status === 'pending' || order.status === 'processing') && (
                            <button 
                              onClick={() => handleCancelItem(item.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                            >
                              申请取消
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-right">
                  <p className="text-slate-500">总计: <span className="text-xl font-bold text-slate-900">¥{order.total_amount.toFixed(2)}</span></p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
