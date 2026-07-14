import json
import os
import secrets
from pathlib import Path

from flask import Flask, jsonify, make_response, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO

DIST_DIR = Path(__file__).resolve().parent.parent / 'dist'

app = Flask(__name__, static_folder=str(DIST_DIR), static_url_path='')
app.secret_key = os.getenv('SESSION_SECRET', secrets.token_hex(32))

CORS(app, supports_credentials=True, origins=[os.getenv('FRONTEND_URL', '*')])
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')


def get_public_config():
    return {
        'VITE_DISCORD_CLIENT_ID': os.getenv('VITE_DISCORD_CLIENT_ID', ''),
        'VITE_DISCORD_REDIRECT_URI': os.getenv('VITE_DISCORD_REDIRECT_URI', ''),
        'VITE_BOT_API_URL': os.getenv('VITE_BOT_API_URL', ''),
        'VITE_ADMIN_IDS': os.getenv('VITE_ADMIN_IDS', ''),
    }


def render_index():
    index_path = DIST_DIR / 'index.html'
    html = index_path.read_text(encoding='utf-8')
    config_script = (
        '<script>'
        f'window.__TTFD_CONFIG__ = {json.dumps(get_public_config(), ensure_ascii=False)};'
        '</script>'
    )
    html = html.replace('</head>', f'{config_script}</head>', 1)
    response = make_response(html)
    response.headers['Content-Type'] = 'text/html; charset=utf-8'
    return response


@app.route('/api/health')
def health_check():
    return jsonify({'status': 'ok'})


@app.route('/')
def index():
    return render_index()


@app.route('/<path:path>')
def static_files(path: str):
    file_path = DIST_DIR / path
    if file_path.exists() and file_path.is_file():
        return send_from_directory(DIST_DIR, path)
    return render_index()


@app.errorhandler(404)
def spa_fallback(_error):
    return render_index()


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port)
