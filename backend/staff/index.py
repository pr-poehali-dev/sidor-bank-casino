'''
Business: Панель персонала для управления заявками и балансами
Args: event с httpMethod, headers (X-User-Id), body (action, request_id, user_id, amount)
Returns: HTTP response с заявками или результатом операции
'''

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

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
    
    if int(user_id) != 0:
        cur.execute("SELECT is_staff FROM users WHERE id = %s", (user_id,))
        staff_check = cur.fetchone()
        
        if not staff_check or not staff_check['is_staff']:
            cur.close()
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Доступ запрещен'})
            }
    
    if method == 'GET':
        cur.execute("""
            SELECT r.*, u.full_name 
            FROM requests r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.status = 'pending' 
            ORDER BY r.created_at DESC
        """)
        requests = cur.fetchall()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps([dict(r) for r in requests], default=str)
        }
    
    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        if action == 'process_request':
            request_id = body.get('request_id')
            decision = body.get('decision')
            
            cur.execute("SELECT * FROM requests WHERE id = %s", (request_id,))
            request = cur.fetchone()
            
            if not request:
                cur.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Заявка не найдена'})
                }
            
            currency_field = 'balance_rub' if request['currency'] == 'RUB' else 'balance_usd'
            
            if decision == 'approved':
                if request['type'] == 'withdraw':
                    cur.execute(f"SELECT {currency_field} FROM users WHERE id = %s", (request['user_id'],))
                    current_balance = cur.fetchone()
                    if not current_balance or float(current_balance[currency_field]) < float(request['amount']):
                        if int(user_id) == 0:
                            cur.execute(
                                "UPDATE requests SET status = 'rejected', processed_at = %s WHERE id = %s",
                                (datetime.now(), request_id)
                            )
                        else:
                            cur.execute(
                                "UPDATE requests SET status = 'rejected', processed_by = %s, processed_at = %s WHERE id = %s",
                                (user_id, datetime.now(), request_id)
                            )
                        conn.commit()
                        cur.close()
                        conn.close()
                        return {
                            'statusCode': 400,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({
                                'success': False,
                                'error': 'Недостаточно средств для вывода'
                            })
                        }
                
                if request['type'] == 'deposit':
                    cur.execute(
                        f"UPDATE users SET {currency_field} = {currency_field} + %s WHERE id = %s",
                        (request['amount'], request['user_id'])
                    )
                elif request['type'] == 'withdraw':
                    cur.execute(
                        f"UPDATE users SET {currency_field} = {currency_field} - %s WHERE id = %s",
                        (request['amount'], request['user_id'])
                    )
                conn.commit()
            
            if int(user_id) == 0:
                cur.execute(
                    "UPDATE requests SET status = %s, processed_at = %s WHERE id = %s",
                    (decision, datetime.now(), request_id)
                )
            else:
                cur.execute(
                    "UPDATE requests SET status = %s, processed_by = %s, processed_at = %s WHERE id = %s",
                    (decision, user_id, datetime.now(), request_id)
                )
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'message': f'Заявка {"одобрена" if decision == "approved" else "отклонена"}'
                })
            }
        
        elif action == 'manage_balance':
            full_name = body.get('full_name', '').strip()
            amount = float(body.get('amount', 0))
            operation = body.get('operation')
            currency = body.get('currency', 'RUB')
            
            if not full_name:
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': False, 'error': 'Укажите ФИО клиента'})
                }
            
            cur.execute("SELECT id, full_name FROM users WHERE LOWER(full_name) = LOWER(%s)", (full_name,))
            user = cur.fetchone()
            
            if not user:
                cur.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': False, 'error': f'Клиент "{full_name}" не найден'})
                }
            
            balance_field = 'balance_rub' if currency == 'RUB' else 'balance_usd'
            
            if operation == 'add':
                cur.execute(
                    f"UPDATE users SET {balance_field} = {balance_field} + %s WHERE id = %s RETURNING {balance_field}",
                    (amount, user['id'])
                )
            elif operation == 'subtract':
                cur.execute(
                    f"UPDATE users SET {balance_field} = {balance_field} - %s WHERE id = %s RETURNING {balance_field}",
                    (amount, user['id'])
                )
            
            conn.commit()
            new_balance = cur.fetchone()
            cur.close()
            conn.close()
            
            currency_symbol = '₽' if currency == 'RUB' else '$'
            operation_text = 'зачислено' if operation == 'add' else 'списано'
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'balance': float(new_balance[balance_field]) if new_balance else 0,
                    'message': f'{user["full_name"]}: {operation_text} {amount}{currency_symbol}'
                })
            }
    
    cur.close()
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }