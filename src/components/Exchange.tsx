import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Props {
  userId: number;
  balanceRub: number;
  balanceUsd: number;
  onBalanceUpdate: (rub: number, usd: number) => void;
  apiUrl: string;
}

const EXCHANGE_RATE = 95;

export default function Exchange({ userId, balanceRub, balanceUsd, onBalanceUpdate, apiUrl }: Props) {
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState<'RUB' | 'USD'>('RUB');
  const { toast } = useToast();

  const toCurrency = fromCurrency === 'RUB' ? 'USD' : 'RUB';
  const convertedAmount = parseFloat(amount) 
    ? fromCurrency === 'RUB' 
      ? (parseFloat(amount) / EXCHANGE_RATE).toFixed(2)
      : (parseFloat(amount) * EXCHANGE_RATE).toFixed(2)
    : '0';

  const handleExchange = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast({ title: 'Ошибка', description: 'Введите корректную сумму', variant: 'destructive' });
      return;
    }

    if (fromCurrency === 'RUB' && value > balanceRub) {
      toast({ title: 'Ошибка', description: 'Недостаточно рублей', variant: 'destructive' });
      return;
    }

    if (fromCurrency === 'USD' && value > balanceUsd) {
      toast({ title: 'Ошибка', description: 'Недостаточно долларов', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId.toString() },
        body: JSON.stringify({
          action: 'exchange',
          amount: value,
          from_currency: fromCurrency,
          to_currency: toCurrency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onBalanceUpdate(data.balance.balance_rub, data.balance.balance_usd);
        toast({ title: 'Успех!', description: data.message });
        setAmount('');
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить обмен', variant: 'destructive' });
    }
  };

  const swapCurrency = () => {
    setFromCurrency(fromCurrency === 'RUB' ? 'USD' : 'RUB');
    setAmount('');
  };

  return (
    <Card className="p-8 bg-[#16213e]/80 border-[#f1c40f]/20 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-[#f1c40f] mb-6">Обмен валют</h2>

      <div className="mb-6 p-4 bg-[#0f3460]/50 rounded-lg text-center">
        <p className="text-gray-300">Курс обмена: <span className="text-[#f1c40f] font-bold">1 USD = {EXCHANGE_RATE} RUB</span></p>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-gray-200">Отдаёте</Label>
          <div className="flex gap-2 mt-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              className="flex-1 bg-[#0f3460] border-[#f1c40f]/30 text-white text-xl"
            />
            <div className="px-6 py-2 bg-[#0f3460] border border-[#f1c40f]/30 rounded-md flex items-center">
              <span className="text-[#f1c40f] font-bold text-xl">{fromCurrency}</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Доступно: {fromCurrency === 'RUB' ? balanceRub.toFixed(2) : balanceUsd.toFixed(2)} {fromCurrency}
          </p>
        </div>

        <div className="flex justify-center">
          <Button onClick={swapCurrency} variant="outline" size="icon" className="rounded-full border-[#f1c40f] text-[#f1c40f] hover:bg-[#f1c40f]/20">
            <Icon name="ArrowDownUp" size={24} />
          </Button>
        </div>

        <div>
          <Label className="text-gray-200">Получаете</Label>
          <div className="flex gap-2 mt-2">
            <Input
              type="text"
              value={convertedAmount}
              readOnly
              className="flex-1 bg-[#0f3460] border-[#f1c40f]/30 text-white text-xl"
            />
            <div className="px-6 py-2 bg-[#0f3460] border border-[#f1c40f]/30 rounded-md flex items-center">
              <span className="text-green-400 font-bold text-xl">{toCurrency}</span>
            </div>
          </div>
        </div>

        <Button onClick={handleExchange} className="w-full bg-[#e94560] hover:bg-[#e94560]/90 text-white font-semibold text-lg py-6">
          Обменять
        </Button>
      </div>
    </Card>
  );
}
