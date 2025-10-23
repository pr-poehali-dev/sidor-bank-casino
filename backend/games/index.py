'''
Business: Игры казино (рулетка и мины)
Args: event с httpMethod, headers (X-User-Id), body (game_type, bet_amount, mines_count для мин, cells для мин)
Returns: HTTP response с результатом игры
'''

import json
import os
import random
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
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    
    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        game_type = body.get('game_type')
        bet_amount = float(body.get('bet_amount', 0))
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT balance_rub FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Пользователь не найден'})
            }
        
        if float(user['balance_rub']) < bet_amount:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Недостаточно средств'})
            }
        
        if game_type == 'roulette':
            win = random.choice([True, False])
            win_amount = bet_amount * 2 if win else 0
            result = 'win' if win else 'loss'
            
            balance_change = win_amount - bet_amount
            cur.execute(
                "UPDATE users SET balance_rub = balance_rub + %s WHERE id = %s RETURNING balance_rub",
                (balance_change, user_id)
            )
            conn.commit()
            new_balance = cur.fetchone()['balance_rub']
            
            cur.execute(
                "INSERT INTO game_history (user_id, game_type, bet_amount, result, win_amount) VALUES (%s, %s, %s, %s, %s)",
                (user_id, game_type, bet_amount, result, win_amount)
            )
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'result': result,
                    'win_amount': win_amount,
                    'balance': float(new_balance),
                    'message': f'Вы {"выиграли" if win else "проиграли"}!'
                })
            }
        
        elif game_type == 'mines':
            mines_count = int(body.get('mines_count', 3))
            opened_cells = int(body.get('opened_cells', 0))
            
            grid_size = 25
            mines_positions = set(random.sample(range(grid_size), mines_count))
            
            multiplier = 1 + (opened_cells * 0.3 * (mines_count / 10))
            win_amount = bet_amount * multiplier
            
            cur.execute(
                "UPDATE users SET balance_rub = balance_rub - %s WHERE id = %s RETURNING balance_rub",
                (bet_amount, user_id)
            )
            conn.commit()
            new_balance = cur.fetchone()['balance_rub']
            
            cur.execute(
                "INSERT INTO game_history (user_id, game_type, bet_amount, result, win_amount, details) VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, game_type, bet_amount, 'win', 0, json.dumps({'mines_count': mines_count, 'mines': list(mines_positions)}))
            )
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'mines': list(mines_positions),
                    'multiplier': round(multiplier, 2),
                    'potential_win': round(win_amount, 2),
                    'balance': float(new_balance)
                })
            }
        
        cur.close()
        conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }