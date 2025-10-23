import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import RouletteGame from '@/components/RouletteGame';
import MinesGame from '@/components/MinesGame';
import Wallet from '@/components/Wallet';
import Exchange from '@/components/Exchange';
import Requests from '@/components/Requests';
import StaffPanel from '@/components/StaffPanel';

const API_URL = {
  auth: 'https://functions.poehali.dev/a30c9a14-a4f2-4b29-8110-90b50ac87dcc',
  wallet: 'https://functions.poehali.dev/33a008b8-d1d4-44f8-92f8-9160dde2666c',
  games: 'https://functions.poehali.dev/8f7dfd83-0454-4765-91c0-bd0fe96e952d',
  staff: 'https://functions.poehali.dev/55dca25b-a95c-44fd-9bef-4e3d7fa0f58a',
};

interface User {
  id: number;
  full_name: string;
  is_staff: boolean;
  balance_rub: number;
  balance_usd: number;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('casino_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuth = async () => {
    if (!fullName || pinCode.length !== 4) {
      toast({
        title: 'Ошибка',
        description: 'Введите ФИО и 4-значный PIN-код',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(API_URL.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isLogin ? 'login' : 'register',
          full_name: fullName,
          pin_code: pinCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('casino_user', JSON.stringify(data.user));
        toast({
          title: 'Успех!',
          description: data.message,
        });
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Произошла ошибка',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось подключиться к серверу',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('casino_user');
    setFullName('');
    setPinCode('');
  };

  const updateBalance = (balance_rub: number, balance_usd: number) => {
    if (user) {
      const updatedUser = { ...user, balance_rub, balance_usd };
      setUser(updatedUser);
      localStorage.setItem('casino_user', JSON.stringify(updatedUser));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-4">
        <Card className="w-full max-w-md p-8 bg-[#16213e]/80 border-[#f1c40f]/20 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#f1c40f] mb-2">СИДОР БАНК</h1>
            <p className="text-gray-300">Онлайн Казино</p>
          </div>

          <Tabs value={isLogin ? 'login' : 'register'} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#0f3460]">
              <TabsTrigger value="login" onClick={() => setIsLogin(true)} className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
                Вход
              </TabsTrigger>
              <TabsTrigger value="register" onClick={() => setIsLogin(false)} className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
                Регистрация
              </TabsTrigger>
            </TabsList>

            <TabsContent value={isLogin ? 'login' : 'register'}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-gray-200">ФИО</Label>
                  <Input
                    id="fullName"
                    placeholder="Иванов Иван Иванович"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-[#0f3460] border-[#f1c40f]/30 text-white placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="pinCode" className="text-gray-200">PIN-код (4 цифры)</Label>
                  <Input
                    id="pinCode"
                    type="password"
                    placeholder="****"
                    maxLength={4}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    className="bg-[#0f3460] border-[#f1c40f]/30 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button onClick={handleAuth} className="w-full bg-[#e94560] hover:bg-[#e94560]/90 text-white font-semibold">
                  {isLogin ? 'Войти' : 'Зарегистрироваться'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
      <header className="bg-[#16213e]/80 backdrop-blur-sm border-b border-[#f1c40f]/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#f1c40f]">СИДОР БАНК</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-300">{user.full_name}</p>
              <p className="text-lg font-bold text-[#f1c40f]">{user.balance_rub.toFixed(2)} ₽</p>
              {user.balance_usd > 0 && (
                <p className="text-sm text-gray-400">{user.balance_usd.toFixed(2)} $</p>
              )}
            </div>
            <Button onClick={handleLogout} variant="outline" className="border-[#e94560] text-[#e94560] hover:bg-[#e94560] hover:text-white">
              <Icon name="LogOut" size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-8 bg-[#16213e]/80 backdrop-blur-sm">
            <TabsTrigger value="home" className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
              <Icon name="Home" size={18} className="mr-2" />
              Главная
            </TabsTrigger>
            <TabsTrigger value="roulette" className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
              <Icon name="CircleDot" size={18} className="mr-2" />
              Рулетка
            </TabsTrigger>
            <TabsTrigger value="mines" className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
              <Icon name="Bomb" size={18} className="mr-2" />
              Мины
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
              <Icon name="Wallet" size={18} className="mr-2" />
              Кошелёк
            </TabsTrigger>
            <TabsTrigger value="exchange" className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
              <Icon name="ArrowLeftRight" size={18} className="mr-2" />
              Обмен
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
              <Icon name="FileText" size={18} className="mr-2" />
              Заявки
            </TabsTrigger>
            {user.is_staff && (
              <TabsTrigger value="staff" className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
                <Icon name="Shield" size={18} className="mr-2" />
                Персонал
              </TabsTrigger>
            )}
            <TabsTrigger value="profile" className="data-[state=active]:bg-[#f1c40f] data-[state=active]:text-black">
              <Icon name="User" size={18} className="mr-2" />
              Профиль
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6 bg-[#16213e]/80 border-[#f1c40f]/20 hover:border-[#f1c40f]/50 transition-all cursor-pointer">
                <Icon name="CircleDot" size={48} className="text-[#f1c40f] mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Рулетка</h2>
                <p className="text-gray-300">Удвойте свою ставку или проиграйте всё!</p>
              </Card>

              <Card className="p-6 bg-[#16213e]/80 border-[#f1c40f]/20 hover:border-[#f1c40f]/50 transition-all cursor-pointer">
                <Icon name="Bomb" size={48} className="text-[#e94560] mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Мины</h2>
                <p className="text-gray-300">Откройте клетки и не попадите на мину!</p>
              </Card>

              <Card className="p-6 bg-[#16213e]/80 border-[#f1c40f]/20 hover:border-[#f1c40f]/50 transition-all cursor-pointer">
                <Icon name="Wallet" size={48} className="text-[#1fc40f] mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Кошелёк</h2>
                <p className="text-gray-300">Пополнение и вывод средств</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="roulette">
            <RouletteGame userId={user.id} balance={user.balance_rub} onBalanceUpdate={updateBalance} apiUrl={API_URL.games} />
          </TabsContent>

          <TabsContent value="mines">
            <MinesGame userId={user.id} balance={user.balance_rub} onBalanceUpdate={updateBalance} apiUrl={API_URL.games} />
          </TabsContent>

          <TabsContent value="wallet">
            <Wallet userId={user.id} balanceRub={user.balance_rub} balanceUsd={user.balance_usd} apiUrl={API_URL.wallet} />
          </TabsContent>

          <TabsContent value="exchange">
            <Exchange userId={user.id} balanceRub={user.balance_rub} balanceUsd={user.balance_usd} onBalanceUpdate={updateBalance} apiUrl={API_URL.wallet} />
          </TabsContent>

          <TabsContent value="requests">
            <Requests userId={user.id} apiUrl={API_URL.wallet} />
          </TabsContent>

          {user.is_staff && (
            <TabsContent value="staff">
              <StaffPanel userId={user.id} apiUrl={API_URL.staff} />
            </TabsContent>
          )}

          <TabsContent value="profile">
            <Card className="p-8 bg-[#16213e]/80 border-[#f1c40f]/20">
              <h2 className="text-2xl font-bold text-[#f1c40f] mb-6">Личный профиль</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">ФИО</Label>
                  <p className="text-xl text-white">{user.full_name}</p>
                </div>
                <div>
                  <Label className="text-gray-300">Баланс (₽)</Label>
                  <p className="text-3xl font-bold text-[#f1c40f]">{user.balance_rub.toFixed(2)} ₽</p>
                </div>
                <div>
                  <Label className="text-gray-300">Баланс ($)</Label>
                  <p className="text-2xl font-bold text-[#1fc40f]">{user.balance_usd.toFixed(2)} $</p>
                </div>
                {user.is_staff && (
                  <div className="pt-4 border-t border-[#f1c40f]/20">
                    <p className="text-[#f1c40f] font-semibold flex items-center gap-2">
                      <Icon name="Shield" size={20} />
                      Статус: Персонал
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
