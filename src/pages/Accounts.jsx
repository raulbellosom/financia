import { useState } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Plus, Wallet, CreditCard, Banknote, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Accounts() {
  const { accounts, isLoading, createAccount } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'cash',
    initialBalance: '',
    currency: 'MXN'
  });

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await createAccount({
        name: newAccount.name,
        type: newAccount.type,
        initialBalance: parseFloat(newAccount.initialBalance) || 0,
        currency: newAccount.currency,
      });
      toast.success('Account created successfully');
      setIsModalOpen(false);
      setNewAccount({ name: '', type: 'cash', initialBalance: '', currency: 'MXN' });
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create account');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'cash': return <Banknote size={24} />;
      case 'debit':
      case 'credit': return <CreditCard size={24} />;
      default: return <Wallet size={24} />;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-zinc-400">Manage your bank accounts and wallets</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950">
          <Plus size={20} className="mr-2" />
          Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="text-zinc-400">Loading accounts...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div key={account.$id} className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 hover:border-emerald-500/50 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-zinc-800 rounded-2xl text-zinc-400 group-hover:text-emerald-500 transition-colors">
                  {getIcon(account.type)}
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 capitalize">
                  {account.type}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{account.name}</h3>
              <p className="text-2xl font-bold text-white">
                ${account.currentBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
          
          {accounts.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              No accounts found. Create one to get started!
            </div>
          )}
        </div>
      )}

      {/* Add Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Add New Account</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Account Name</label>
                <Input
                  required
                  placeholder="e.g. Main Wallet"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="debit">Debit Card</option>
                  <option value="credit">Credit Card</option>
                  <option value="savings">Savings</option>
                  <option value="wallet">Wallet</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Initial Balance</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={newAccount.initialBalance}
                  onChange={(e) => setNewAccount({ ...newAccount, initialBalance: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold">
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
