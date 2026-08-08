#!/bin/bash
cd "$(dirname "$0")"
echo "Library Management System চালু করা হচ্ছে..."
pip3 install flask >/dev/null 2>&1
python3 server.py
