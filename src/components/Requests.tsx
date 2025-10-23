import { Card } from '@/components/ui/card';
import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface Props {
  userId: number;
  apiUrl: string;
}

export default function Requests({ userId, apiUrl }: Props) {
  const [requests] = useState([]);

  return (
    <Card className="p-8 bg-[#16213e]/80 border-[#f1c40f]/20 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-[#f1c40f] mb-6">История заявок</h2>

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="FileText" size={64} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">У вас пока нет заявок</p>
          <p className="text-gray-500 text-sm mt-2">Создайте заявку на пополнение или вывод в разделе "Кошелёк"</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <div key={request.id} className="p-4 bg-[#0f3460]/50 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-white font-semibold">{request.type === 'deposit' ? 'Пополнение' : 'Вывод'}</p>
                <p className="text-gray-400 text-sm">{new Date(request.created_at).toLocaleString('ru-RU')}</p>
              </div>
              <div className="text-right">
                <p className="text-[#f1c40f] font-bold text-lg">{request.amount} ₽</p>
                <p className={`text-sm ${request.status === 'pending' ? 'text-yellow-400' : request.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                  {request.status === 'pending' ? 'Ожидает' : request.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
