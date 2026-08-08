// Library Management System - Frontend Logic
const API = "/api";

// ---------- Navigation ----------
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`page-${btn.dataset.page}`).classList.add("active");
    if (btn.dataset.page === "dashboard") loadStats();
    if (btn.dataset.page === "books") loadBooks();
    if (btn.dataset.page === "members") loadMembers();
    if (btn.dataset.page === "loans") loadLoans();
  });
});

// ---------- Toast ----------
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.toggle("error", isError);
  setTimeout(() => toast.classList.add("hidden"), 2500);
}

// ---------- Modal helper ----------
const overlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalConfirm = document.getElementById("modal-confirm");
const modalCancel = document.getElementById("modal-cancel");

function openModal(title, bodyHtml, onConfirm) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  overlay.classList.remove("hidden");
  modalConfirm.onclick = async () => {
    const ok = await onConfirm();
    if (ok !== false) closeModal();
  };
}

function closeModal() {
  overlay.classList.add("hidden");
}

modalCancel.addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});

// ---------- API helper ----------
async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "কিছু একটা সমস্যা হয়েছে");
  }
  return data;
}

// ---------- Dashboard ----------
async function loadStats() {
  try {
    const s = await api("/stats");
    document.getElementById("stat-total-books").textContent = s.total_books;
    document.getElementById("stat-available-books").textContent = s.available_books;
    document.getElementById("stat-total-members").textContent = s.total_members;
    document.getElementById("stat-active-loans").textContent = s.active_loans;
    document.getElementById("stat-overdue").textContent = s.overdue;
  } catch (e) {
    showToast(e.message, true);
  }
}

// ---------- Books ----------
async function loadBooks(query = "") {
  try {
    const books = await api(`/books${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    const tbody = document.getElementById("books-tbody");
    tbody.innerHTML = books.map((b) => `
      <tr>
        <td>${escapeHtml(b.title)}</td>
        <td>${escapeHtml(b.author)}</td>
        <td>${escapeHtml(b.isbn || "-")}</td>
        <td>${escapeHtml(b.category || "-")}</td>
        <td>${b.total_copies}</td>
        <td>${b.available_copies}</td>
        <td>
          <button class="btn small" onclick="editBook(${b.id})">✏️</button>
          <button class="btn small danger" onclick="deleteBook(${b.id})">🗑️</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="7" style="text-align:center;color:#9ca3af">কোনো বই নেই</td></tr>`;
  } catch (e) {
    showToast(e.message, true);
  }
}

document.getElementById("book-search").addEventListener("input", (e) => {
  loadBooks(e.target.value);
});

function bookFormHtml(book = {}) {
  return `
    <label>বইয়ের নাম</label>
    <input id="f-title" value="${escapeHtml(book.title || "")}">
    <label>লেখক</label>
    <input id="f-author" value="${escapeHtml(book.author || "")}">
    <label>ISBN</label>
    <input id="f-isbn" value="${escapeHtml(book.isbn || "")}">
    <label>ক্যাটাগরি</label>
    <input id="f-category" value="${escapeHtml(book.category || "")}">
    <label>মোট কপি সংখ্যা</label>
    <input id="f-copies" type="number" min="1" value="${book.total_copies || 1}">
  `;
}

document.getElementById("btn-add-book").addEventListener("click", () => {
  openModal("নতুন বই যোগ করুন", bookFormHtml(), async () => {
    try {
      await api("/books", {
        method: "POST",
        body: JSON.stringify({
          title: document.getElementById("f-title").value,
          author: document.getElementById("f-author").value,
          isbn: document.getElementById("f-isbn").value,
          category: document.getElementById("f-category").value,
          total_copies: document.getElementById("f-copies").value,
        }),
      });
      showToast("বই যোগ করা হয়েছে");
      loadBooks();
    } catch (e) {
      showToast(e.message, true);
      return false;
    }
  });
});

async function editBook(id) {
  const books = await api("/books");
  const book = books.find((b) => b.id === id);
  openModal("বই সম্পাদনা করুন", bookFormHtml(book), async () => {
    try {
      await api(`/books/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: document.getElementById("f-title").value,
          author: document.getElementById("f-author").value,
          isbn: document.getElementById("f-isbn").value,
          category: document.getElementById("f-category").value,
          total_copies: document.getElementById("f-copies").value,
        }),
      });
      showToast("বই আপডেট হয়েছে");
      loadBooks();
    } catch (e) {
      showToast(e.message, true);
      return false;
    }
  });
}

async function deleteBook(id) {
  if (!confirm("আপনি কি নিশ্চিত এই বইটি ডিলিট করতে চান?")) return;
  try {
    await api(`/books/${id}`, { method: "DELETE" });
    showToast("বই ডিলিট করা হয়েছে");
    loadBooks();
  } catch (e) {
    showToast(e.message, true);
  }
}

// ---------- Members ----------
async function loadMembers() {
  try {
    const members = await api("/members");
    const tbody = document.getElementById("members-tbody");
    tbody.innerHTML = members.map((m) => `
      <tr>
        <td>${escapeHtml(m.name)}</td>
        <td>${escapeHtml(m.email || "-")}</td>
        <td>${escapeHtml(m.phone || "-")}</td>
        <td>${formatDate(m.joined_on)}</td>
        <td><button class="btn small danger" onclick="deleteMember(${m.id})">🗑️</button></td>
      </tr>
    `).join("") || `<tr><td colspan="5" style="text-align:center;color:#9ca3af">কোনো সদস্য নেই</td></tr>`;
  } catch (e) {
    showToast(e.message, true);
  }
}

document.getElementById("btn-add-member").addEventListener("click", () => {
  openModal("নতুন সদস্য যোগ করুন", `
    <label>নাম</label>
    <input id="f-name">
    <label>ইমেইল</label>
    <input id="f-email">
    <label>ফোন</label>
    <input id="f-phone">
  `, async () => {
    try {
      await api("/members", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("f-name").value,
          email: document.getElementById("f-email").value,
          phone: document.getElementById("f-phone").value,
        }),
      });
      showToast("সদস্য যোগ করা হয়েছে");
      loadMembers();
    } catch (e) {
      showToast(e.message, true);
      return false;
    }
  });
});

async function deleteMember(id) {
  if (!confirm("আপনি কি নিশ্চিত এই সদস্যকে ডিলিট করতে চান?")) return;
  try {
    await api(`/members/${id}`, { method: "DELETE" });
    showToast("সদস্য ডিলিট করা হয়েছে");
    loadMembers();
  } catch (e) {
    showToast(e.message, true);
  }
}

// ---------- Loans ----------
async function loadLoans() {
  try {
    const loans = await api("/loans");
    const tbody = document.getElementById("loans-tbody");
    const now = new Date();
    tbody.innerHTML = loans.map((l) => {
      let statusHtml;
      if (l.return_date) {
        statusHtml = `<span class="badge returned">ফেরত দেওয়া হয়েছে</span>`;
      } else if (new Date(l.due_date) < now) {
        statusHtml = `<span class="badge overdue">মেয়াদোত্তীর্ণ</span>`;
      } else {
        statusHtml = `<span class="badge active">চলমান</span>`;
      }
      return `
        <tr>
          <td>${escapeHtml(l.book_title)}</td>
          <td>${escapeHtml(l.member_name)}</td>
          <td>${formatDate(l.issue_date)}</td>
          <td>${formatDate(l.due_date)}</td>
          <td>${statusHtml}</td>
          <td>${l.return_date ? "-" : `<button class="btn small" onclick="returnLoan(${l.id})">রিটার্ন</button>`}</td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="6" style="text-align:center;color:#9ca3af">কোনো রেকর্ড নেই</td></tr>`;
  } catch (e) {
    showToast(e.message, true);
  }
}

document.getElementById("btn-issue-book").addEventListener("click", async () => {
  try {
    const [books, members] = await Promise.all([api("/books"), api("/members")]);
    const availableBooks = books.filter((b) => b.available_copies > 0);
    openModal("বই ইস্যু করুন", `
      <label>বই</label>
      <select id="f-book">
        ${availableBooks.map((b) => `<option value="${b.id}">${escapeHtml(b.title)} (${b.available_copies} উপলব্ধ)</option>`).join("") || `<option disabled>কোনো বই উপলব্ধ নেই</option>`}
      </select>
      <label>সদস্য</label>
      <select id="f-member">
        ${members.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("") || `<option disabled>কোনো সদস্য নেই</option>`}
      </select>
    `, async () => {
      try {
        await api("/loans/issue", {
          method: "POST",
          body: JSON.stringify({
            book_id: document.getElementById("f-book").value,
            member_id: document.getElementById("f-member").value,
          }),
        });
        showToast("বই ইস্যু করা হয়েছে");
        loadLoans();
      } catch (e) {
        showToast(e.message, true);
        return false;
      }
    });
  } catch (e) {
    showToast(e.message, true);
  }
});

async function returnLoan(id) {
  try {
    await api(`/loans/${id}/return`, { method: "POST" });
    showToast("বই ফেরত নেওয়া হয়েছে");
    loadLoans();
  } catch (e) {
    showToast(e.message, true);
  }
}

// ---------- Utils ----------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric" });
}

// ---------- Init ----------
loadStats();
