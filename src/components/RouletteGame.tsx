import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Props {
  userId: number;
  balance: number;
  onBalanceUpdate: (rub: number, usd: number) => void;
  apiUrl: string;
}

export default function RouletteGame({ userId, balance, onBalanceUpdate, apiUrl }: Props) {
  const [bet, setBet] = useState('100');
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<'win' | 'loss' | null>(null);
  const { toast } = useToast();

  const handleSpin = async () => {
    const betAmount = parseFloat(bet);
    if (isNaN(betAmount) || betAmount <= 0 || betAmount > balance) {
      toast({ title: 'Ошибка', description: 'Недостаточно средств', variant: 'destructive' });
      return;
    }

    setIsSpinning(true);
    setResult(null);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId.toString() },
        body: JSON.stringify({ game_type: 'roulette', bet_amount: betAmount }),
      });

      const data = await response.json();

      setTimeout(() => {
        setIsSpinning(false);
        if (data.success) {
          setResult(data.result);
          onBalanceUpdate(data.balance, 0);
          toast({
            title: data.result === 'win' ? '🎉 Выигрыш!' : '😢 Проигрыш',
            description: data.message,
          });
        }
      }, 2000);
    } catch (error) {
      setIsSpinning(false);
      toast({ title: 'Ошибка', description: 'Не удалось подключиться', variant: 'destructive' });
    }
  };

  return (
    <Card className="p-8 bg-[#16213e]/80 border-[#f1c40f]/20 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-[#f1c40f] mb-6 text-center">Рулетка</h2>

      <div className="flex justify-center mb-8">
        <div className={`w-48 h-48 rounded-full border-8 border-[#f1c40f] flex items-center justify-center ${isSpinning ? 'animate-spin' : ''}`}>
          {!isSpinning && result && (
            <Icon name={result === 'win' ? 'Trophy' : 'X'} size={80} className={result === 'win' ? 'text-green-400' : 'text-red-400'} />
          )}
          {!result && !isSpinning && <Icon name="CircleDot" size={80} className="text-[#f1c40f]" />}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-gray-200">Ставка (₽)</Label>
          <Input
            type="number"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            disabled={isSpinning}
            className="bg-[#0f3460] border-[#f1c40f]/30 text-white"
          />
        </div>
        <div className="flex gap-2">
          {[100, 500, 1000, 5000].map((amount) => (
            <Button
              key={amount}
              onClick={() => setBet(amount.toString())}
              variant="outline"
              size="sm"
              disabled={isSpinning}
              className="flex-1 border-[#f1c40f]/30 text-[#f1c40f] hover:bg-[#f1c40f]/20"
            >
              {amount}₽
            </Button>
          ))}
        </div>
        <Button
          onClick={handleSpin}
          disabled={isSpinning}
          className="w-full bg-[#e94560] hover:bg-[#e94560]/90 text-white font-semibold text-lg py-6"
        >
          {isSpinning ? 'Крутится...' : 'Крутить!'}
        </Button>
      </div>

      <div className="mt-6 p-4 bg-[#0f3460]/50 rounded-lg text-center">
        <p className="text-gray-300 text-sm">Выигрыш: x2 ставки | Проигрыш: потеря ставки</p>
      </div>
    </Card>
  );
}
