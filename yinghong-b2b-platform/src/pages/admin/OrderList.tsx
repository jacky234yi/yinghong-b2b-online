import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Order, OrderItem } from '../../types';
import { Package, Truck, CheckCircle, XCircle, AlertTriangle, Printer } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function OrderList() {
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

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    fetchOrders();
  };

  const handleCancelItem = async (itemId: string) => {
    if (!confirm('确定要批准取消该商品吗？库存将自动恢复。')) return;
    await fetch('/api/orders/cancel-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ order_item_id: itemId })
    });
    fetchOrders();
  };

  const printOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>订单 ${order.id}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>配货单</h1>
            <p><strong>订单号:</strong> ${order.id}</p>
            <p><strong>买家:</strong> ${order.user_name} (${order.user_phone})</p>
            <p><strong>日期:</strong> ${format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>商品</th>
                <th>货号</th>
                <th>颜色</th>
                <th>尺码</th>
                <th>数量</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.sku}</td>
                  <td>${item.color}</td>
                  <td>${item.size}</td>
                  <td>${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">订单管理</h1>

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-slate-900">{order.user_name}</h3>
                  <span className="text-sm text-slate-500">{order.user_phone}</span>
                </div>
                <p className="text-xs text-slate-400">ID: {order.id} • {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <select 
                  value={order.status}
                  onChange={(e) => updateStatus(order.id, e.target.value)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium border outline-none",
                    order.status === 'pending' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                    order.status === 'processing' && "bg-blue-50 text-blue-700 border-blue-200",
                    order.status === 'shipped' && "bg-indigo-50 text-indigo-700 border-indigo-200",
                    order.status === 'completed' && "bg-green-50 text-green-700 border-green-200",
                    order.status === 'cancelled' && "bg-red-50 text-red-700 border-red-200",
                  )}
                >
                  <option value="pending">待处理</option>
                  <option value="processing">处理中</option>
                  <option value="shipped">已发货</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
                </select>
                
                <button 
                  onClick={() => printOrder(order)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg"
                  title="打印配货单"
                >
                  <Printer size={20} />
                </button>

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
                      <th className="pb-2">货号</th>
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
                        <td className="py-3 text-slate-500">{item.sku}</td>
                        <td className="py-3 text-slate-500">{item.color} / {item.size}</td>
                        <td className="py-3">{item.quantity}</td>
                        <td className="py-3">¥{item.price_at_time.toFixed(2)}</td>
                        <td className="py-3">
                          {item.status === 'normal' && <span className="text-slate-500">正常</span>}
                          {item.status === 'cancellation_requested' && (
                            <span className="text-orange-600 flex items-center gap-1">
                              <AlertTriangle size={14} /> 申请取消: {item.cancellation_reason}
                            </span>
                          )}
                          {item.status === 'cancelled' && <span className="text-red-500 line-through">已取消</span>}
                        </td>
                        <td className="py-3">
                          {item.status === 'cancellation_requested' && (
                            <button 
                              onClick={() => handleCancelItem(item.id)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                            >
                              批准取消
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
