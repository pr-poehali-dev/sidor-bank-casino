import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Props {
  userId: number;
  balance: number;
  onBalanceUpdate: (rub: number, usd: number) => void;
  apiUrl: string;
}

export default function MinesGame({ userId, balance, onBalanceUpdate, apiUrl }: Props) {
  const [bet, setBet] = useState('100');
  const [minesCount, setMinesCount] = useState([3]);
  const [grid, setGrid] = useState<boolean[]>(Array(25).fill(false));
  const [mines, setMines] = useState<number[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [openedCells, setOpenedCells] = useState(0);
  const { toast } = useToast();

  const startGame = async () => {
    const betAmount = parseFloat(bet);
    if (isNaN(betAmount) || betAmount <= 0 || betAmount > balance) {
      toast({ title: 'Ошибка', description: 'Недостаточно средств', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId.toString() },
        body: JSON.stringify({ game_type: 'mines', bet_amount: betAmount, mines_count: minesCount[0], opened_cells: 0 }),
      });

      const data = await response.json();

      if (data.success) {
        setMines(data.mines);
        setGameActive(true);
        setGrid(Array(25).fill(false));
        setOpenedCells(0);
        setMultiplier(1.0);
        onBalanceUpdate(data.balance, 0);
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось начать игру', variant: 'destructive' });
    }
  };

  const openCell = (index: number) => {
    if (!gameActive || grid[index]) return;

    const newGrid = [...grid];
    newGrid[index] = true;
    setGrid(newGrid);

    if (mines.includes(index)) {
      setGameActive(false);
      toast({ title: '💥 Взрыв!', description: 'Вы попали на мину!', variant: 'destructive' });
      return;
    }

    const newOpened = openedCells + 1;
    setOpenedCells(newOpened);
    const newMultiplier = 1 + (newOpened * 0.3 * (minesCount[0] / 10));
    setMultiplier(newMultiplier);
    toast({ title: '✅ Безопасно!', description: `Множитель: x${newMultiplier.toFixed(2)}` });
  };

  const cashout = () => {
    if (!gameActive) return;
    const winAmount = parseFloat(bet) * multiplier;
    setGameActive(false);
    onBalanceUpdate(balance + winAmount, 0);
    toast({ title: '🎉 Выигрыш!', description: `Вы выиграли ${winAmount.toFixed(2)}₽` });
  };

  return (
    <Card className="p-8 bg-[#16213e]/80 border-[#f1c40f]/20 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-[#f1c40f] mb-6 text-center">Мины</h2>

      {!gameActive ? (
        <div className="space-y-6">
          <div>
            <Label className="text-gray-200">Ставка (₽)</Label>
            <Input
              type="number"
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              className="bg-[#0f3460] border-[#f1c40f]/30 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-200">Количество мин: {minesCount[0]}</Label>
            <Slider value={minesCount} onValueChange={setMinesCount} min={1} max={10} step={1} className="mt-2" />
          </div>
          <Button onClick={startGame} className="w-full bg-[#e94560] hover:bg-[#e94560]/90 text-white font-semibold text-lg py-6">
            Начать игру
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <p className="text-gray-300">Открыто клеток: <span className="text-[#f1c40f] font-bold">{openedCells}</span></p>
              <p className="text-gray-300">Множитель: <span className="text-green-400 font-bold">x{multiplier.toFixed(2)}</span></p>
            </div>
            <Button onClick={cashout} className="bg-green-600 hover:bg-green-700">
              Забрать {(parseFloat(bet) * multiplier).toFixed(2)}₽
            </Button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {grid.map((opened, index) => (
              <button
                key={index}
                onClick={() => openCell(index)}
                disabled={opened}
                className={`aspect-square rounded-lg flex items-center justify-center text-2xl font-bold transition-all ${
                  opened
                    ? mines.includes(index)
                      ? 'bg-red-600 text-white'
                      : 'bg-green-600 text-white'
                    : 'bg-[#0f3460] hover:bg-[#f1c40f]/20 border-2 border-[#f1c40f]/30'
                }`}
              >
                {opened && (mines.includes(index) ? '💣' : '💎')}
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
