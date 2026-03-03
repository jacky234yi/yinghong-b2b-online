import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download } from 'lucide-react';

export default function Reports() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const downloadReport = async (type: 'daily' | 'monthly') => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Convert to CSV
      const headers = ['Order ID', 'Date', 'Buyer', 'Status', 'Total Amount', 'Items'];
      const rows = data.map((order: any) => [
        order.id,
        new Date(order.created_at).toLocaleDateString(),
        order.user_name,
        order.status,
        order.total_amount,
        order.items.map((i: any) => `${i.product_name} (${i.quantity})`).join('; ')
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `orders_report_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">数据报表</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4">订单导出</h2>
          <p className="text-slate-500 mb-6">下载所有订单数据（CSV格式），用于Excel分析。</p>
          <button 
            onClick={() => downloadReport('daily')}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Download size={20} />
            导出所有订单
          </button>
        </div>
      </div>
    </div>
  );
}
