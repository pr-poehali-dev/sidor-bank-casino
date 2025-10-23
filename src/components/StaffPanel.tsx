import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Props {
  userId: number;
  apiUrl: string;
}

interface Request {
  id: number;
  full_name: string;
  type: string;
  amount: number;
  currency: string;
  created_at: string;
  status: string;
}

export default function StaffPanel({ userId, apiUrl }: Props) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [targetFullName, setTargetFullName] = useState('');
  const [manageAmount, setManageAmount] = useState('');
  const [manageCurrency, setManageCurrency] = useState('RUB');
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRequests = async () => {
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'X-User-Id': userId.toString() },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setRequests(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
    }
  };

  const processRequest = async (requestId: number, decision: string) => {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId.toString() },
        body: JSON.stringify({ action: 'process_request', request_id: requestId, decision }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Успех!', description: data.message });
        loadRequests();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обработать заявку', variant: 'destructive' });
    }
  };

  const manageBalance = async (operation: string) => {
    const amount = parseFloat(manageAmount);

    if (!targetFullName.trim() || isNaN(amount) || amount <= 0) {
      toast({ title: 'Ошибка', description: 'Введите ФИО и корректную сумму', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId.toString() },
        body: JSON.stringify({ action: 'manage_balance', full_name: targetFullName, amount, operation, currency: manageCurrency }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({ title: 'Успех!', description: data.message });
        setTargetFullName('');
        setManageAmount('');
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Неизвестная ошибка', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Ошибка управления балансом:', error);
      toast({ title: 'Ошибка', description: 'Не удалось изменить баланс', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card className="p-8 bg-[#16213e]/80 border-[#f1c40f]/20">
        <h2 className="text-3xl font-bold text-[#f1c40f] mb-6">Панель персонала</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <h3 className="text-xl font-semibold text-white mb-4">Управление балансом клиента</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label className="text-gray-200">ФИО клиента</Label>
                <Input
                  type="text"
                  value={targetFullName}
                  onChange={(e) => setTargetFullName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  className="bg-[#0f3460] border-[#f1c40f]/30 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-200">Сумма</Label>
                <Input
                  type="number"
                  value={manageAmount}
                  onChange={(e) => setManageAmount(e.target.value)}
                  placeholder="1000"
                  className="bg-[#0f3460] border-[#f1c40f]/30 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-200">Валюта</Label>
                <select
                  value={manageCurrency}
                  onChange={(e) => setManageCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-[#0f3460] border border-[#f1c40f]/30 text-white"
                >
                  <option value="RUB">Рубли (₽)</option>
                  <option value="USD">Доллары ($)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => manageBalance('add')} className="flex-1 bg-green-600 hover:bg-green-700">
                <Icon name="Plus" size={20} className="mr-2" />
                Зачислить
              </Button>
              <Button onClick={() => manageBalance('subtract')} className="flex-1 bg-red-600 hover:bg-red-700">
                <Icon name="Minus" size={20} className="mr-2" />
                Списать
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-8 bg-[#16213e]/80 border-[#f1c40f]/20">
        <h3 className="text-2xl font-bold text-[#f1c40f] mb-6">Заявки на обработку ({requests.length})</h3>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="CheckCircle" size={64} className="text-green-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Нет активных заявок</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="p-6 bg-[#0f3460]/50 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-white font-semibold text-lg">{request.full_name}</p>
                    <p className="text-gray-400 text-sm">{new Date(request.created_at).toLocaleString('ru-RU')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${request.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                      {request.type === 'deposit' ? '+' : '-'}{request.amount} ₽
                    </p>
                    <p className="text-gray-400 text-sm">{request.type === 'deposit' ? 'Пополнение' : 'Вывод'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => processRequest(request.id, 'approved')} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Icon name="Check" size={20} className="mr-2" />
                    Одобрить
                  </Button>
                  <Button onClick={() => processRequest(request.id, 'rejected')} variant="outline" className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
                    <Icon name="X" size={20} className="mr-2" />
                    Отклонить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}