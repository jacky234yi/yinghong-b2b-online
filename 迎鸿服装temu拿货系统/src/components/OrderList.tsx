import React from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Package,
  FileText,
  Printer,
  MoreHorizontal,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  X
} from 'lucide-react';
import { Order, OrderItem, User } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface OrderListProps {
  user: User;
}

export default function OrderList({ user }: OrderListProps) {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelItems, setCancelItems] = React.useState<number[]>([]);
  const [cancelReason, setCancelReason] = React.useState('');
  const [isPrintMode, setIsPrintMode] = React.useState(false);

  const isAdmin = user.role === 'super_admin' || user.role === 'supplier_admin';

  const fetchData = React.useCallback(async () => {
    const res = await fetch(`/api/orders?role=${user.role}&user_id=${user.id}`);
    setOrders(await res.json());
  }, [user]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                         o.buyer_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = async (orderId: string, status: string, tracking?: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, tracking_number: tracking })
    });
    fetchData();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: status as any, tracking_number: tracking } : null);
    }
  };

  const handleCancelRequest = async () => {
    if (cancelItems.length === 0) return;
    const res = await fetch(`/api/orders/${selectedOrder?.id}/cancel-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: cancelItems, reason: cancelReason })
    });
    if (res.ok) {
      alert('取消申请已提交，请等待审核');
      setIsCancelModalOpen(false);
      setCancelItems([]);
      setCancelReason('');
      fetchData();
      setSelectedOrder(null);
    }
  };

  const handleCancelApprove = async (orderId: string, itemId: number, approve: boolean) => {
    await fetch(`/api/orders/${orderId}/cancel-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, approve })
    });
    fetchData();
    // Refresh selected order if open
    const res = await fetch(`/api/orders?role=${user.role}&user_id=${user.id}`);
    const allOrders = await res.json();
    const updated = allOrders.find((o: any) => o.id === orderId);
    if (updated) setSelectedOrder(updated);
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    const labels: any = {
      pending: '待处理',
      processing: '配货中',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (isPrintMode && selectedOrder) {
    return (
      <div className="bg-white min-h-screen p-12 text-slate-900 font-mono">
        <div className="max-w-3xl mx-auto border-2 border-slate-900 p-8 space-y-8">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tighter">迎鸿服装配货单</h1>
              <p className="text-sm mt-1">YINGHONG CLOTHING PACKING LIST</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">订单号: {selectedOrder.id}</p>
              <p className="text-sm">日期: {format(new Date(selectedOrder.created_at), 'yyyy/MM/dd HH:mm')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">拿货商信息</p>
              <p className="font-bold text-lg">{selectedOrder.buyer_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">物流信息</p>
              <p className="font-bold">{selectedOrder.tracking_number || '暂无单号'}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 text-xs font-bold uppercase">
                <th className="py-2">货号</th>
                <th className="py-2">颜色</th>
                <th className="py-2">尺码</th>
                <th className="py-2 text-right">数量</th>
                <th className="py-2 text-right">单价</th>
                <th className="py-2 text-right">小计</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {selectedOrder.items.filter(i => i.status !== 'cancelled').map((item, i) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="py-3 font-bold">{item.sku}</td>
                  <td className="py-3">{item.color}</td>
                  <td className="py-3">{item.size}</td>
                  <td className="py-3 text-right font-bold">{item.quantity}</td>
                  <td className="py-3 text-right">¥{item.price}</td>
                  <td className="py-3 text-right font-bold">¥{item.price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-4">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>商品总数</span>
                <span className="font-bold">{selectedOrder.items.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.quantity, 0)} 件</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t-2 border-slate-900 pt-2">
                <span>合计金额</span>
                <span>¥{selectedOrder.total_amount}</span>
              </div>
            </div>
          </div>

          <div className="pt-12 flex justify-between text-xs text-slate-400">
            <p>制单人: {user.username}</p>
            <p>广州迎鸿服装有限公司 - 供应链数字化管理系统</p>
          </div>
        </div>
        <div className="fixed bottom-8 right-8 flex gap-4 no-print">
          <button 
            onClick={() => window.print()}
            className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"
          >
            <Printer size={20} /> 打印
          </button>
          <button 
            onClick={() => setIsPrintMode(false)}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索订单号或拿货商..." 
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
        <div className="flex items-center gap-2">
          {['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled'].map(s => (
            <button 
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? '全部' : s === 'pending' ? '待处理' : s === 'processing' ? '配货中' : s === 'shipped' ? '已发货' : s === 'completed' ? '已完成' : '已取消'}
            </button>
          ))}
        </div>
      </div>

      {/* Order List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-4">订单编号</th>
              <th className="px-6 py-4">拿货商</th>
              <th className="px-6 py-4">下单时间</th>
              <th className="px-6 py-4">总金额</th>
              <th className="px-6 py-4">状态</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="font-bold text-slate-900">{order.id}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                      {order.buyer_name?.[0]}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{order.buyer_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-500">{format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-emerald-600">¥{order.total_amount.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Package size={64} strokeWidth={1} />
            <p className="font-medium">暂无订单数据</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedOrder(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold text-slate-900">订单详情: {selectedOrder.id}</h3>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsPrintMode(true)}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Printer size={20} />
                  </button>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Status Stepper */}
                <div className="flex items-center justify-between max-w-2xl mx-auto mb-12">
                  {[
                    { key: 'pending', label: '待处理', icon: Clock },
                    { key: 'processing', label: '配货中', icon: Package },
                    { key: 'shipped', label: '已发货', icon: Truck },
                    { key: 'completed', label: '已完成', icon: CheckCircle2 }
                  ].map((step, i, arr) => {
                    const isActive = selectedOrder.status === step.key;
                    const isPast = arr.findIndex(s => s.key === selectedOrder.status) >= i;
                    return (
                      <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-2 relative z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isActive ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                            isPast ? 'bg-emerald-100 border-emerald-500 text-emerald-500' : 'bg-white border-slate-200 text-slate-300'
                          }`}>
                            <step.icon size={20} />
                          </div>
                          <span className={`text-xs font-bold ${isPast ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-2 ${arr.findIndex(s => s.key === selectedOrder.status) > i ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">商品明细</h4>
                    <div className="space-y-4">
                      {selectedOrder.items.map((item, i) => (
                        <div key={i} className={`flex gap-4 p-4 rounded-2xl border transition-all ${
                          item.status === 'cancelled' ? 'bg-slate-50 border-slate-100 opacity-60' : 
                          item.status === 'cancel_pending' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'
                        }`}>
                          <div className="w-16 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                            <Package size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h5 className="font-bold text-slate-900">{item.sku}</h5>
                              <p className="font-bold text-slate-900">¥{item.price * item.quantity}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">颜色: {item.color} | 尺码: {item.size} | 数量: {item.quantity}</p>
                            
                            {item.status === 'cancel_pending' && (
                              <div className="mt-3 p-3 bg-amber-100/50 rounded-xl border border-amber-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-amber-700">
                                    <AlertCircle size={14} />
                                    <span className="text-xs font-bold">取消申请中: {item.cancel_reason}</span>
                                  </div>
                                  {isAdmin && (
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => handleCancelApprove(selectedOrder.id, item.id, true)}
                                        className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-600"
                                      >
                                        同意
                                      </button>
                                      <button 
                                        onClick={() => handleCancelApprove(selectedOrder.id, item.id, false)}
                                        className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600"
                                      >
                                        拒绝
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {item.status === 'cancelled' && (
                              <div className="mt-2 text-xs font-bold text-red-500 flex items-center gap-1">
                                <XCircle size={12} /> 已取消
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-sm font-bold text-slate-900">订单汇总</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-500">
                          <span>商品总数</span>
                          <span className="font-bold text-slate-900">{selectedOrder.items.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.quantity, 0)} 件</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>商品原价</span>
                          <span className="font-bold text-slate-900">¥{selectedOrder.items.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.price * i.quantity, 0)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-emerald-600 pt-4 border-t border-slate-200">
                          <span>实付金额</span>
                          <span>¥{selectedOrder.total_amount}</span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">管理操作</h4>
                        <div className="space-y-3">
                          {selectedOrder.status === 'pending' && (
                            <button 
                              onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                              className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors"
                            >
                              开始配货
                            </button>
                          )}
                          {selectedOrder.status === 'processing' && (
                            <div className="space-y-3">
                              <input 
                                placeholder="输入物流单号..."
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') updateOrderStatus(selectedOrder.id, 'shipped', (e.target as HTMLInputElement).value);
                                }}
                              />
                              <button 
                                onClick={() => {
                                  const input = document.querySelector('input[placeholder="输入物流单号..."]') as HTMLInputElement;
                                  updateOrderStatus(selectedOrder.id, 'shipped', input.value);
                                }}
                                className="w-full bg-indigo-500 text-white py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors"
                              >
                                确认发货
                              </button>
                            </div>
                          )}
                          {selectedOrder.status === 'shipped' && (
                            <button 
                              onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                              className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors"
                            >
                              完成订单
                            </button>
                          )}
                          {['pending', 'processing'].includes(selectedOrder.status) && (
                            <button 
                              onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                              className="w-full bg-slate-100 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors"
                            >
                              取消整个订单
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {!isAdmin && ['pending', 'processing'].includes(selectedOrder.status) && (
                      <button 
                        onClick={() => {
                          setCancelItems([]);
                          setIsCancelModalOpen(true);
                        }}
                        className="w-full bg-amber-50 text-amber-600 py-3 rounded-xl font-bold border border-amber-100 hover:bg-amber-100 transition-colors"
                      >
                        申请部分取消
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Partial Cancel Modal */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsCancelModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">申请部分取消</h3>
                <button onClick={() => setIsCancelModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-sm text-slate-500">请选择要取消的商品项，并填写理由：</p>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {selectedOrder?.items.filter(i => i.status === 'active').map(item => (
                    <label key={item.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={cancelItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) setCancelItems([...cancelItems, item.id]);
                          else setCancelItems(cancelItems.filter(id => id !== item.id));
                        }}
                        className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{item.sku}</p>
                        <p className="text-xs text-slate-500">尺码: {item.size} | 数量: {item.quantity}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">取消理由</label>
                  <textarea 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="请输入取消理由..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleCancelRequest}
                    disabled={cancelItems.length === 0 || !cancelReason}
                    className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    提交申请
                  </button>
                  <button 
                    onClick={() => setIsCancelModalOpen(false)}
                    className="px-6 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
