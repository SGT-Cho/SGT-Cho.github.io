#!/usr/bin/env python3
"""간단한 테스트 앱"""

from flask import Flask

app = Flask(__name__)

@app.route('/')
def index():
    return "Hello from Docker!"

@app.route('/health')
def health():
    return "OK"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001)