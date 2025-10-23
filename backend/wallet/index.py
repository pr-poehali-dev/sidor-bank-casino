'''
Business: Управление кошельком, обмен валют, пополнение/вывод
Args: event с httpMethod, headers (X-User-Id), body (action, amount, currency)
Returns: HTTP response с балансом или результатом операции
'''

import json
import os
from typing import Dict, Any
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor

EXCHANGE_RATE = 95.0

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Не авторизован'})
        }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if method == 'GET':
        cur.execute("SELECT balance_rub, balance_usd FROM users WHERE id = %s", (user_id,))
        balance = cur.fetchone()
        cur.close()
        conn.close()
        
        if not balance:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Пользователь не найден'})
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(dict(balance), default=decimal_default)
        }
    
    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        amount = float(body.get('amount', 0))
        currency = body.get('currency', 'RUB')
        
        if action == 'exchange':
            from_currency = body.get('from_currency')
            to_currency = body.get('to_currency')
            
            cur.execute("SELECT balance_rub, balance_usd FROM users WHERE id = %s", (user_id,))
            balance = cur.fetchone()
            
            if from_currency == 'RUB' and to_currency == 'USD':
                if balance['balance_rub'] < amount:
                    cur.close()
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Недостаточно рублей'})
                    }
                
                usd_amount = amount / EXCHANGE_RATE
                cur.execute(
                    "UPDATE users SET balance_rub = balance_rub - %s, balance_usd = balance_usd + %s WHERE id = %s RETURNING balance_rub, balance_usd",
                    (amount, usd_amount, user_id)
                )
            
            elif from_currency == 'USD' and to_currency == 'RUB':
                if balance['balance_usd'] < amount:
                    cur.close()
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Недостаточно долларов'})
                    }
                
                rub_amount = amount * EXCHANGE_RATE
                cur.execute(
                    "UPDATE users SET balance_usd = balance_usd - %s, balance_rub = balance_rub + %s WHERE id = %s RETURNING balance_rub, balance_usd",
                    (amount, rub_amount, user_id)
                )
            
            conn.commit()
            new_balance = cur.fetchone()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'balance': dict(new_balance),
                    'message': 'Обмен выполнен успешно'
                }, default=decimal_default)
            }
        
        elif action == 'request':
            request_type = body.get('type')
            
            cur.execute(
                "INSERT INTO requests (user_id, type, amount, currency) VALUES (%s, %s, %s, %s) RETURNING id",
                (user_id, request_type, amount, currency)
            )
            conn.commit()
            request_id = cur.fetchone()['id']
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'request_id': request_id,
                    'message': 'Заявка создана'
                })
            }
    
    cur.close()
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }