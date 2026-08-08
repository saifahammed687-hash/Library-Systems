CREATE DATABASE IF NOT EXISTS library_system;
USE library_system;

CREATE TABLE IF NOT EXISTS users(
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('student','teacher','librarian','admin') NOT NULL DEFAULT 'student',
 status ENUM('active','blocked') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books(
 id INT AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(255) NOT NULL,
 author VARCHAR(180) NOT NULL,
 category VARCHAR(100),
 isbn VARCHAR(50),
 publisher VARCHAR(180),
 total_copies INT NOT NULL DEFAULT 1,
 available_copies INT NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX(title), INDEX(author), INDEX(category)
);

CREATE TABLE IF NOT EXISTS loans(
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 book_id INT NOT NULL,
 borrow_date DATE NOT NULL,
 due_date DATE NOT NULL,
 return_date DATE NULL,
 status ENUM('borrowed','returned') NOT NULL DEFAULT 'borrowed',
 renew_count INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_requests(
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 title VARCHAR(255) NOT NULL,
 author VARCHAR(180) NOT NULL,
 reason TEXT,
 status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 reviewed_at DATETIME NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO books(title,author,category,publisher,total_copies,available_copies)
SELECT 'Clean Code','Robert C. Martin','Programming','Prentice Hall',5,5
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Clean Code');

INSERT INTO books(title,author,category,publisher,total_copies,available_copies)
SELECT 'The Pragmatic Programmer','Andrew Hunt','Programming','Addison-Wesley',5,5
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='The Pragmatic Programmer');

INSERT INTO books(title,author,category,publisher,total_copies,available_copies)
SELECT 'Database System Concepts','Abraham Silberschatz','Database','McGraw-Hill',5,5
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title='Database System Concepts');
