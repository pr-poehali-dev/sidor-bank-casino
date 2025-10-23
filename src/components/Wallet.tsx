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
  apiUrl: string;
}

export default function Wallet({ userId, balanceRub, balanceUsd, apiUrl }: Props) {
  const [amount, setAmount] = useState('');
  const [requestType, setRequestType] = useState<'deposit' | 'withdraw'>('deposit');
  const { toast } = useToast();

  const handleRequest = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast({ title: 'Ошибка', description: 'Введите корректную сумму', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId.toString() },
        body: JSON.stringify({ action: 'request', type: requestType, amount: value, currency: 'RUB' }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Успех!', description: 'Заявка создана и отправлена персоналу' });
        setAmount('');
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать заявку', variant: 'destructive' });
    }
  };

  return (
    <Card className="p-8 bg-[#16213e]/80 border-[#f1c40f]/20 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-[#f1c40f] mb-6">Кошелёк</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-[#0f3460]/50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="Wallet" size={24} className="text-[#f1c40f]" />
            <p className="text-gray-300">Баланс (Рубли)</p>
          </div>
          <p className="text-4xl font-bold text-[#f1c40f]">{balanceRub.toFixed(2)} ₽</p>
        </div>

        <div className="p-6 bg-[#0f3460]/50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="DollarSign" size={24} className="text-green-400" />
            <p className="text-gray-300">Баланс (Доллары)</p>
          </div>
          <p className="text-4xl font-bold text-green-400">{balanceUsd.toFixed(2)} $</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => setRequestType('deposit')}
            variant={requestType === 'deposit' ? 'default' : 'outline'}
            className={requestType === 'deposit' ? 'flex-1 bg-green-600 hover:bg-green-700' : 'flex-1 border-green-600 text-green-600'}
          >
            <Icon name="Plus" size={20} className="mr-2" />
            Пополнение
          </Button>
          <Button
            onClick={() => setRequestType('withdraw')}
            variant={requestType === 'withdraw' ? 'default' : 'outline'}
            className={requestType === 'withdraw' ? 'flex-1 bg-red-600 hover:bg-red-700' : 'flex-1 border-red-600 text-red-600'}
          >
            <Icon name="Minus" size={20} className="mr-2" />
            Вывод
          </Button>
        </div>

        <div>
          <Label className="text-gray-200">Сумма (₽)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            className="bg-[#0f3460] border-[#f1c40f]/30 text-white"
          />
        </div>

        <Button onClick={handleRequest} className="w-full bg-[#e94560] hover:bg-[#e94560]/90 text-white font-semibold text-lg py-6">
          Создать заявку
        </Button>
      </div>

      <div className="mt-6 p-4 bg-[#0f3460]/50 rounded-lg">
        <p className="text-gray-300 text-sm text-center">
          Заявка будет обработана персоналом в течение 24 часов
        </p>
      </div>
    </Card>
  );
}
