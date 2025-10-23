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
            
            if decision == 'approved':
                if request['type'] == 'deposit':
                    cur.execute(
                        "UPDATE users SET balance_rub = balance_rub + %s WHERE id = %s",
                        (request['amount'], request['user_id'])
                    )
                elif request['type'] == 'withdraw':
                    cur.execute(
                        "UPDATE users SET balance_rub = balance_rub - %s WHERE id = %s",
                        (request['amount'], request['user_id'])
                    )
            
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
            target_user_id = body.get('user_id')
            amount = float(body.get('amount', 0))
            operation = body.get('operation')
            
            if operation == 'add':
                cur.execute(
                    "UPDATE users SET balance_rub = balance_rub + %s WHERE id = %s RETURNING balance_rub",
                    (amount, target_user_id)
                )
            elif operation == 'subtract':
                cur.execute(
                    "UPDATE users SET balance_rub = balance_rub - %s WHERE id = %s RETURNING balance_rub",
                    (amount, target_user_id)
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
                    'balance': new_balance['balance_rub'] if new_balance else 0,
                    'message': 'Баланс изменен'
                })
            }
    
    cur.close()
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
