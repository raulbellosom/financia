import { ArrowRightLeft } from 'lucide-react';

export default function Transactions() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
          <ArrowRightLeft size={24} />
        </div>
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
          <ArrowRightLeft size={32} />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">No transactions yet</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Your transaction history will appear here. Start by adding a transaction.
        </p>
      </div>
    </div>
  );
}
