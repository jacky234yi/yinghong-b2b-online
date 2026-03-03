import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell 
} from 'recharts';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Users, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Package,
  ClipboardList
} from 'lucide-react';
import { User, DailyReport } from '../types';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { io } from 'socket.io-client';

interface FulfillmentStat {
  sku: string;
  size: string;
  color: string;
  total_quantity: number;
  buyers: string;
}

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [reportData, setReportData] = React.useState<DailyReport[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [buyers, setBuyers] = React.useState<User[]>([]);
  const [fulfillmentStats, setFulfillmentStats] = React.useState<FulfillmentStat[]>([]);
  const [selectedBuyer, setSelectedBuyer] = React.useState<string>('');
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [dateRange, setDateRange] = React.useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchData = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (user.role === 'buyer') {
        const res = await fetch(`/api/reports/buyer/${user.id}`);
        const data = await res.json();
        setReportData(data.daily);
        setStats(data.stats);
      } else {
        const query = new URLSearchParams({
          buyer_id: selectedBuyer,
          start_date: dateRange.start,
          end_date: dateRange.end
        }).toString();
        
        const [reportRes, fulfillmentRes] = await Promise.all([
          fetch(`/api/reports/admin?${query}`),
          fetch(`/api/reports/fulfillment?date=${dateRange.end}`)
        ]);

        const data = await reportRes.json();
        const fStats = await fulfillmentRes.json();
        
        setReportData(data);
        setFulfillmentStats(fStats);
        
        // Calculate overall stats from data
        const totalSales = data.reduce((sum: number, d: any) => sum + d.total_sales, 0);
        const totalOrders = data.reduce((sum: number, d: any) => sum + d.order_count, 0);
        const totalItems = data.reduce((sum: number, d: any) => sum + d.total_items, 0);
        setStats({ total_sales: totalSales, total_orders: totalOrders, total_items: totalItems });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [user, selectedBuyer, dateRange]);

  React.useEffect(() => {
    fetchData();
    if (user.role !== 'buyer') {
      fetch('/api/buyers').then(res => res.json()).then(setBuyers);
    }

    // Socket.io for real-time updates
    const socket = io();
    socket.on('order:created', () => {
      console.log('New order created, refreshing dashboard...');
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData, user.role]);

  const exportToCSV = () => {
    const headers = ['日期', '销售额', '订单数', '件数'];
    const rows = reportData.map(d => [d.date, d.total_sales || (d as any).sales, d.order_count || (d as any).orders, d.total_items || 0]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const exportDetailedCSV = async () => {
    const query = new URLSearchParams({
      buyer_id: selectedBuyer,
      start_date: dateRange.start,
      end_date: dateRange.end
    }).toString();

    const res = await fetch(`/api/reports/detailed?${query}`);
    const data = await res.json();

    if (data.length === 0) {
      alert('所选范围内无订单数据');
      return;
    }

    const headers = ['日期', '拿货商', '货号 (SKU)', '颜色', '尺码', '件数', '单价', '总价'];
    const rows = data.map((d: any) => [
      d.date,
      d.buyer_name,
      d.sku,
      d.color,
      d.size,
      d.total_quantity,
      d.unit_price,
      d.total_cost
    ]);

    // Calculate monthly total
    const monthlyTotal = data.reduce((sum: number, d: any) => sum + d.total_cost, 0);
    rows.push([]);
    rows.push(['月度总计', '', '', '', '', '', '', monthlyTotal]);

    const csvContent = '\ufeff' + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `详细对账单_${dateRange.start}_${dateRange.end}.csv`;
    link.click();
  };

  const cards = [
    { 
      label: '总销售额', 
      value: `¥${(stats?.total_sales || 0).toLocaleString()}`, 
      icon: DollarSign, 
      color: 'bg-emerald-500' 
    },
    { 
      label: '总订单数', 
      value: stats?.total_orders || 0, 
      icon: ShoppingBag, 
      color: 'bg-blue-500' 
    },
    { 
      label: user.role === 'buyer' ? '平均客单价' : '总件数', 
      value: user.role === 'buyer' 
        ? `¥${Math.round(stats?.avg_order_value || 0).toLocaleString()}` 
        : (stats?.total_items || 0).toLocaleString(), 
      icon: user.role === 'buyer' ? TrendingUp : Users, 
      color: 'bg-violet-500' 
    },
    { 
      label: '最高日营收', 
      value: `¥${Math.max(...reportData.map(d => d.total_sales || (d as any).sales || 0), 0).toLocaleString()}`, 
      icon: Calendar, 
      color: 'bg-amber-500' 
    },
  ];

  const exportFulfillmentStats = () => {
    if (fulfillmentStats.length === 0) return;
    
    const headers = ['货号 (SKU)', '颜色', '尺码', '总件数', '拿货商'];
    const rows = fulfillmentStats.map(stat => [
      stat.sku,
      stat.color,
      stat.size,
      stat.total_quantity,
      stat.buyers
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `配货统计_${dateRange.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      {user.role !== 'buyer' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">筛选:</span>
          </div>
          <select 
            value={selectedBuyer} 
            onChange={(e) => setSelectedBuyer(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">所有拿货商</option>
            {buyers.map(b => (
              <option key={b.id} value={b.id}>{b.username}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <span className="text-slate-400">至</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={fetchData}
              disabled={isRefreshing}
              className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              title="刷新数据"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <Download size={16} />
              导出概览
            </button>
            <button 
              onClick={exportDetailedCSV}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              <ClipboardList size={16} />
              导出详细对账单
            </button>
          </div>
        </div>
      )}

      {user.role === 'buyer' && (
        <div className="flex justify-end mb-4">
          <button 
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            刷新数据
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.color} text-white`}>
                <card.icon size={24} />
              </div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-900">销售趋势 (近30天)</h4>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              销售额
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => `¥${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`¥${val.toLocaleString()}`, '销售额']}
                />
                <Line 
                  type="monotone" 
                  dataKey={user.role === 'buyer' ? 'sales' : 'total_sales'} 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-900">订单量统计</h4>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              订单数
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [val, '订单数']}
                />
                <Bar dataKey={user.role === 'buyer' ? 'orders' : 'order_count'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fulfillment Stats - Admin Only */}
      {user.role !== 'buyer' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-lg">
                <ClipboardList size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">当日配货统计 ({dateRange.end})</h4>
                <p className="text-xs text-slate-500">自动汇总今日所有订单的款式、尺码和件数</p>
              </div>
            </div>
            {fulfillmentStats.length > 0 && (
              <button 
                onClick={exportFulfillmentStats}
                className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Download size={18} />
                导出表格
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">货号 (SKU)</th>
                  <th className="px-6 py-4">颜色</th>
                  <th className="px-6 py-4">尺码</th>
                  <th className="px-6 py-4 text-center">总件数</th>
                  <th className="px-6 py-4">拿货商</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fulfillmentStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Package size={32} strokeWidth={1} />
                        <p className="text-sm">今日暂无订单数据</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  fulfillmentStats.map((stat, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{stat.sku}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{stat.color}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                          {stat.size}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                          {stat.total_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {stat.buyers.split(',').map((buyer, bi) => (
                            <span key={bi} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                              {buyer}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
