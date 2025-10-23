'''
Business: Авторизация и регистрация пользователей казино
Args: event с httpMethod, body (full_name, pin_code для регистрации/входа)
Returns: HTTP response с токеном или ошибкой
'''

import json
import os
from typing import Dict, Any
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor

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
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        full_name = body.get('full_name', '').strip()
        pin_code = body.get('pin_code', '').strip()
        
        if not full_name or not pin_code or len(pin_code) != 4:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Введите ФИО и 4-значный PIN-код'})
            }
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if action == 'register':
            cur.execute("SELECT id FROM users WHERE full_name = %s", (full_name,))
            if cur.fetchone():
                cur.close()
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пользователь с таким ФИО уже существует'})
                }
            
            cur.execute(
                "INSERT INTO users (full_name, pin_code, balance_rub) VALUES (%s, %s, 1000.00) RETURNING id, full_name, is_staff, balance_rub, balance_usd",
                (full_name, pin_code)
            )
            conn.commit()
            user = cur.fetchone()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'user': dict(user),
                    'message': 'Регистрация успешна! Начальный баланс: 1000₽'
                }, default=decimal_default)
            }
        
        elif action == 'login':
            cur.execute(
                "SELECT id, full_name, is_staff, balance_rub, balance_usd FROM users WHERE full_name = %s AND pin_code = %s",
                (full_name, pin_code)
            )
            user = cur.fetchone()
            cur.close()
            conn.close()
            
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неверное ФИО или PIN-код'})
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'user': dict(user),
                    'message': 'Вход выполнен успешно'
                }, default=decimal_default)
            }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }