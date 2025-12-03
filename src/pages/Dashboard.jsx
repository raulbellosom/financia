import { useAuth } from '../context/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { Wallet, TrendingUp, TrendingDown, Activity, Plus, ArrowRightLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

export default function Dashboard() {
  const { user } = useAuth();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { transactions, isLoading: transactionsLoading } = useTransactions(5);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const isLoading = accountsLoading || transactionsLoading;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hello, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-zinc-400">Here's your financial overview</p>
        </div>
        <Link to="/transactions">
          <Button size="icon" className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950">
            <Plus size={24} />
          </Button>
        </Link>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-800 rounded-full text-zinc-400">
              <Wallet size={20} />
            </div>
            <span className="text-zinc-400 font-medium">Total Balance</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {isLoading ? '...' : `$${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          </p>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500">
              <TrendingUp size={20} />
            </div>
            <span className="text-zinc-400 font-medium">Income (Recent)</span>
          </div>
          <p className="text-3xl font-bold text-emerald-500">
            {isLoading ? '...' : `+$${income.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          </p>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/10 rounded-full text-rose-500">
              <TrendingDown size={20} />
            </div>
            <span className="text-zinc-400 font-medium">Expenses (Recent)</span>
          </div>
          <p className="text-3xl font-bold text-rose-500">
            {isLoading ? '...' : `-$${expenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          <Link to="/transactions">
            <Button variant="ghost" size="sm" className="text-emerald-500 hover:text-emerald-400">
              See all
            </Button>
          </Link>
        </div>
        
        <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800/50 overflow-hidden">
          {isLoading ? (
            <div className="text-zinc-500 text-center py-8">Loading activity...</div>
          ) : transactions.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">No recent transactions</div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.$id} className="flex items-center justify-between p-4 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'income' ? 'bg-blue-500/10 text-blue-500' : 
                    tx.type === 'expense' ? 'bg-red-500/10 text-red-500' : 
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {tx.type === 'income' ? <TrendingUp size={20} /> : 
                     tx.type === 'expense' ? <TrendingDown size={20} /> : 
                     <ArrowRightLeft size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-white">{tx.description || 'Untitled Transaction'}</p>
                    <p className="text-sm text-zinc-500">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-bold ${
                  tx.type === 'income' ? 'text-blue-500' : 
                  tx.type === 'expense' ? 'text-white' : 'text-zinc-400'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
