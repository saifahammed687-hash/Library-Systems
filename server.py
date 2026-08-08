"""
Library Management System - Backend Server
Flask + SQLite দিয়ে তৈরি একটি সাধারণ লাইব্রেরি ম্যানেজমেন্ট সিস্টেম।

চালানোর নিয়ম:
    pip install flask
    python server.py

তারপর ব্রাউজারে যান: http://127.0.0.1:5000
"""

from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import os
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "library.db")
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")

app = Flask(__name__, static_folder=STATIC_DIR, template_folder=TEMPLATE_DIR)

LOAN_DAYS = 14  # কত দিনের জন্য বই ইস্যু করা হবে


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            isbn TEXT UNIQUE,
            category TEXT,
            total_copies INTEGER NOT NULL DEFAULT 1,
            available_copies INTEGER NOT NULL DEFAULT 1,
            added_on TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT,
            joined_on TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            member_id INTEGER NOT NULL,
            issue_date TEXT NOT NULL,
            due_date TEXT NOT NULL,
            return_date TEXT,
            FOREIGN KEY (book_id) REFERENCES books (id),
            FOREIGN KEY (member_id) REFERENCES members (id)
        )
    """)

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Static / frontend routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/styles.css")
def styles():
    return send_from_directory(BASE_DIR, "styles.css")


@app.route("/app.js")
def app_js():
    return send_from_directory(BASE_DIR, "app.js")


# ---------------------------------------------------------------------------
# Books API
# ---------------------------------------------------------------------------
@app.route("/api/books", methods=["GET"])
def get_books():
    q = request.args.get("q", "").strip()
    conn = get_db()
    if q:
        like = f"%{q}%"
        rows = conn.execute(
            """SELECT * FROM books
               WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ?
               ORDER BY id DESC""",
            (like, like, like, like),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM books ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/books", methods=["POST"])
def add_book():
    data = request.get_json(force=True)
    title = data.get("title", "").strip()
    author = data.get("author", "").strip()
    isbn = data.get("isbn", "").strip() or None
    category = data.get("category", "").strip()
    copies = int(data.get("total_copies", 1) or 1)

    if not title or not author:
        return jsonify({"error": "বইয়ের নাম এবং লেখকের নাম আবশ্যক"}), 400

    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO books (title, author, isbn, category, total_copies, available_copies, added_on)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (title, author, isbn, category, copies, copies, datetime.now().isoformat()),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "এই ISBN ইতিমধ্যে আছে"}), 400
    conn.close()
    return jsonify({"message": "বই যোগ করা হয়েছে"}), 201


@app.route("/api/books/<int:book_id>", methods=["PUT"])
def update_book(book_id):
    data = request.get_json(force=True)
    conn = get_db()
    book = conn.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
    if not book:
        conn.close()
        return jsonify({"error": "বই পাওয়া যায়নি"}), 404

    title = data.get("title", book["title"])
    author = data.get("author", book["author"])
    isbn = data.get("isbn", book["isbn"])
    category = data.get("category", book["category"])
    new_total = int(data.get("total_copies", book["total_copies"]))

    diff = new_total - book["total_copies"]
    new_available = book["available_copies"] + diff
    if new_available < 0:
        conn.close()
        return jsonify({"error": "কপি সংখ্যা বর্তমান ইস্যু করা বইয়ের চেয়ে কম হতে পারবে না"}), 400

    conn.execute(
        """UPDATE books SET title=?, author=?, isbn=?, category=?, total_copies=?, available_copies=?
           WHERE id=?""",
        (title, author, isbn, category, new_total, new_available, book_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "বই আপডেট হয়েছে"})


@app.route("/api/books/<int:book_id>", methods=["DELETE"])
def delete_book(book_id):
    conn = get_db()
    active = conn.execute(
        "SELECT COUNT(*) c FROM loans WHERE book_id=? AND return_date IS NULL", (book_id,)
    ).fetchone()["c"]
    if active > 0:
        conn.close()
        return jsonify({"error": "এই বই এখনো কারো কাছে ইস্যু করা আছে, ডিলিট করা যাবে না"}), 400

    conn.execute("DELETE FROM books WHERE id=?", (book_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "বই ডিলিট করা হয়েছে"})


# ---------------------------------------------------------------------------
# Members API
# ---------------------------------------------------------------------------
@app.route("/api/members", methods=["GET"])
def get_members():
    conn = get_db()
    rows = conn.execute("SELECT * FROM members ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/members", methods=["POST"])
def add_member():
    data = request.get_json(force=True)
    name = data.get("name", "").strip()
    email = data.get("email", "").strip() or None
    phone = data.get("phone", "").strip()

    if not name:
        return jsonify({"error": "সদস্যের নাম আবশ্যক"}), 400

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO members (name, email, phone, joined_on) VALUES (?, ?, ?, ?)",
            (name, email, phone, datetime.now().isoformat()),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "এই ইমেইল দিয়ে ইতিমধ্যে সদস্য আছে"}), 400
    conn.close()
    return jsonify({"message": "সদস্য যোগ করা হয়েছে"}), 201


@app.route("/api/members/<int:member_id>", methods=["DELETE"])
def delete_member(member_id):
    conn = get_db()
    active = conn.execute(
        "SELECT COUNT(*) c FROM loans WHERE member_id=? AND return_date IS NULL", (member_id,)
    ).fetchone()["c"]
    if active > 0:
        conn.close()
        return jsonify({"error": "এই সদস্যের কাছে এখনো বই আছে, ডিলিট করা যাবে না"}), 400

    conn.execute("DELETE FROM members WHERE id=?", (member_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "সদস্য ডিলিট করা হয়েছে"})


# ---------------------------------------------------------------------------
# Loans (Issue / Return) API
# ---------------------------------------------------------------------------
@app.route("/api/loans", methods=["GET"])
def get_loans():
    status = request.args.get("status")  # "active" | "returned" | None
    conn = get_db()
    query = """
        SELECT loans.*, books.title AS book_title, members.name AS member_name
        FROM loans
        JOIN books ON books.id = loans.book_id
        JOIN members ON members.id = loans.member_id
    """
    if status == "active":
        query += " WHERE loans.return_date IS NULL"
    elif status == "returned":
        query += " WHERE loans.return_date IS NOT NULL"
    query += " ORDER BY loans.id DESC"

    rows = conn.execute(query).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/loans/issue", methods=["POST"])
def issue_book():
    data = request.get_json(force=True)
    book_id = data.get("book_id")
    member_id = data.get("member_id")

    conn = get_db()
    book = conn.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
    member = conn.execute("SELECT * FROM members WHERE id=?", (member_id,)).fetchone()

    if not book or not member:
        conn.close()
        return jsonify({"error": "বই বা সদস্য পাওয়া যায়নি"}), 404
    if book["available_copies"] < 1:
        conn.close()
        return jsonify({"error": "এই বইয়ের কোনো কপি এখন উপলব্ধ নেই"}), 400

    issue_date = datetime.now()
    due_date = issue_date + timedelta(days=LOAN_DAYS)

    conn.execute(
        "INSERT INTO loans (book_id, member_id, issue_date, due_date) VALUES (?, ?, ?, ?)",
        (book_id, member_id, issue_date.isoformat(), due_date.isoformat()),
    )
    conn.execute(
        "UPDATE books SET available_copies = available_copies - 1 WHERE id=?", (book_id,)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "বই ইস্যু করা হয়েছে", "due_date": due_date.isoformat()}), 201


@app.route("/api/loans/<int:loan_id>/return", methods=["POST"])
def return_book(loan_id):
    conn = get_db()
    loan = conn.execute("SELECT * FROM loans WHERE id=?", (loan_id,)).fetchone()
    if not loan:
        conn.close()
        return jsonify({"error": "লোন পাওয়া যায়নি"}), 404
    if loan["return_date"]:
        conn.close()
        return jsonify({"error": "এই বই ইতিমধ্যে ফেরত দেওয়া হয়েছে"}), 400

    conn.execute(
        "UPDATE loans SET return_date=? WHERE id=?", (datetime.now().isoformat(), loan_id)
    )
    conn.execute(
        "UPDATE books SET available_copies = available_copies + 1 WHERE id=?",
        (loan["book_id"],),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "বই ফেরত নেওয়া হয়েছে"})


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------
@app.route("/api/stats", methods=["GET"])
def get_stats():
    conn = get_db()
    total_books = conn.execute("SELECT COALESCE(SUM(total_copies),0) c FROM books").fetchone()["c"]
    available_books = conn.execute("SELECT COALESCE(SUM(available_copies),0) c FROM books").fetchone()["c"]
    total_members = conn.execute("SELECT COUNT(*) c FROM members").fetchone()["c"]
    active_loans = conn.execute("SELECT COUNT(*) c FROM loans WHERE return_date IS NULL").fetchone()["c"]
    overdue = conn.execute(
        "SELECT COUNT(*) c FROM loans WHERE return_date IS NULL AND due_date < ?",
        (datetime.now().isoformat(),),
    ).fetchone()["c"]
    conn.close()
    return jsonify({
        "total_books": total_books,
        "available_books": available_books,
        "total_members": total_members,
        "active_loans": active_loans,
        "overdue": overdue,
    })


if __name__ == "__main__":
    init_db()
    print("Library Management System চালু হচ্ছে... http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
