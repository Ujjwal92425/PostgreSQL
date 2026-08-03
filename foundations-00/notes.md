# Phase 0: Foundations — PostgreSQL & Database Basics

Notes on core database foundations before diving into SQL syntax. Covers DBMS types, client-server architecture, the relational model, keys, ACID, CAP theorem, OLTP vs OLAP, and getting started with PostgreSQL.

---

## 1. What is a Database?

**Definition:** A database is an organized collection of data that is stored electronically, so it can be easily accessed, managed, and updated by a computer program.

**Simple explanation:** Think of a database like a digital filing cabinet. Instead of loose papers thrown everywhere, everything is sorted into labeled folders, so you can find anything quickly.

**Example:** Instagram stores every user's name, password, and photos in a database. When you log in, Instagram checks the database to confirm your password is correct.

**Use case:** Bank balances, online orders, chat messages — almost every app you use is backed by a database.

---

## 2. DBMS vs RDBMS vs NoSQL

**DBMS (Database Management System)** — Definition: Software that lets you create, read, update, and delete data in a database. It's the general category.

**RDBMS (Relational Database Management System)** — Definition: A type of DBMS where data is stored in **tables** (rows and columns), and tables can be **related** to each other through keys.

**NoSQL (Not Only SQL)** — Definition: A type of database that stores data in flexible formats (like documents or key-value pairs) instead of strict tables.

| Type | Structure | Example Software | Best For |
|---|---|---|---|
| RDBMS | Fixed tables with strict relationships | PostgreSQL, MySQL, Oracle | Banking, e-commerce orders, anything needing strict accuracy |
| NoSQL | Flexible, document/key-value based | MongoDB, Redis, Cassandra | Fast-changing data, large-scale unstructured content |

**Use case:** A bank uses an RDBMS because account balances must always be exact and consistent. A social media app might use NoSQL for storing chat logs, because the structure of messages can vary and speed matters more than strict rules.

---

## 3. Client-Server Architecture

**Definition:** A system design where a **client** (the app you use) sends requests over a network to a **server** (where the database actually lives), and the server processes the request and sends back a response.

**Simple explanation:** Imagine ordering food at a restaurant. You (the client) tell the waiter what you want. The waiter goes to the kitchen (the server), where the food is actually prepared, and brings it back to you. You never go into the kitchen yourself.

**Example:** When your phone app asks "show me my orders," it sends this request to the PostgreSQL server, the server looks up the data, and sends the result back to your app.

**Use case:** Every online application — websites, mobile apps — works this way. Your app is the client, and the database sits on a server, often in the cloud (like AWS).

---

## 4. The Relational Model — Tables, Rows, Columns

**Definition:** In a relational database, data is organized into **tables**. Each table has **columns** (fields/attributes) and **rows** (individual records).

**Simple explanation:** Think of a table like a spreadsheet. Each column is a category of information (like "Name" or "Age"). Each row is one complete entry (like one student's full information).

**Example table — `students`:**

| id | name | age | class |
|---|---|---|---|
| 1 | Aarav | 10 | 5th |
| 2 | Priya | 11 | 6th |
| 3 | Rohan | 10 | 5th |

- **Table** = the whole grid (`students`)
- **Column** = a category (`name`, `age`)
- **Row** = one full record (one student)

**Use case:** Every table in a real system represents something meaningful — a `users` table, a `products` table, an `orders` table.

---

## 5. Keys — Definitions, Types, and When to Use Each

**Definition:** A key is one or more columns used to uniquely identify a row, or to link one table to another.

### Primary Key (PK)
- **Definition:** A column (or set of columns) that uniquely identifies each row in a table. It cannot be empty (NULL) and cannot repeat.
- **Example:** `id` in the `students` table — no two students share the same `id`.
- **When to use:** Every table should have exactly one primary key. Use it to guarantee every row is unique and identifiable.

### Candidate Key
- **Definition:** Any column (or combination) that *could* have been chosen as the primary key, because it's unique on its own.
- **Example:** In a `students` table, both `id` and `aadhar_number` are unique — both are candidate keys, but only one gets chosen as the actual primary key.
- **When to use:** You don't "use" a candidate key directly — it's a concept for identifying all valid unique options before deciding on the primary key.

### Composite Key
- **Definition:** A primary key made up of **two or more columns together**, because no single column alone is unique.
- **Example:** In a table tracking classroom seating, `(class_id, seat_number)` together are unique, even if `seat_number` alone repeats across classes.
- **When to use:** Use this when a single column can't guarantee uniqueness, but a combination of columns can — common in join/bridge tables (e.g., `enrollments` table with `student_id` + `course_id`).

### Surrogate Key
- **Definition:** An artificial, system-generated ID that has no real-world meaning — just a number or UUID created purely to identify a row.
- **Example:** `id = 1, 2, 3...` auto-generated by the database.
- **When to use:** Use surrogate keys when you want a simple, stable identifier that never changes — even if real-world data (like a name or email) changes later.

### Natural Key
- **Definition:** A key based on real-world data that is naturally unique.
- **Example:** `aadhar_number` or `email` — these exist independently of the database and are naturally unique.
- **When to use:** Use natural keys when the real-world value is guaranteed stable and unique. Be careful — natural keys can sometimes change (e.g., email addresses), which makes them risky as a permanent primary key. Most systems prefer surrogate keys for this reason.

### Foreign Key (FK)
- **Definition:** A column in one table that refers to the Primary Key of another table, creating a relationship between the two tables.
- **Example:** `orders.customer_id` refers to `customers.id` — this links each order to the customer who placed it.
- **When to use:** Use a foreign key any time one table's data logically depends on or references another table's row. This is what makes a database "relational."

**Quick summary table:**

| Key Type | Purpose | Use When |
|---|---|---|
| Primary Key | Uniquely identify each row | Always — every table needs one |
| Candidate Key | Identify all unique-column options | During schema design, before choosing PK |
| Composite Key | Uniqueness needs multiple columns | Single column isn't enough on its own |
| Surrogate Key | Stable, artificial ID | You want an ID that never changes |
| Natural Key | Real-world unique value as ID | The real value is guaranteed stable |
| Foreign Key | Link two tables together | One table's row depends on another table's row |

---

## 6. ACID Properties — Full Definitions with Example

Imagine you are sending ₹500 to a friend using a banking app. This single action is called a **transaction**. ACID describes four guarantees the database makes about this transaction.

### Atomicity
- **Definition:** A transaction is treated as a single, indivisible unit — either everything in it happens, or nothing happens at all.
- **Example:** Money is deducted from your account **and** added to your friend's account together. If the app crashes halfway, neither change is saved — no money disappears.

### Consistency
- **Definition:** A transaction must move the database from one valid state to another valid state, without breaking any rules (like constraints).
- **Example:** If there's a rule that balance can never go negative, the database will not allow a transaction that would violate this rule.

### Isolation
- **Definition:** Multiple transactions happening at the same time should not interfere with each other — each one should behave as if it's running alone.
- **Example:** If you and your friend are both sending money at the exact same second, the database makes sure both transactions are processed correctly without corrupting each other's data.

### Durability
- **Definition:** Once a transaction is confirmed as successful (committed), the result is permanently saved — even if the system crashes right after.
- **Example:** Once your payment app shows "Success," that money transfer is saved permanently, even if the server loses power one second later.

**Use case:** ACID properties are critical anywhere money, inventory, or important records are involved — banking, e-commerce checkout, ticket booking.

---

## 7. CAP Theorem

**Definition:** In a distributed database system (one spread across multiple servers), you can only fully guarantee **two out of three** properties at the same time:

- **Consistency (C):** Every server shows the exact same data at the same time.
- **Availability (A):** The system always responds to requests, even if some servers are down.
- **Partition Tolerance (P):** The system keeps working even if the network connection between servers breaks.

**Simple explanation:** Imagine two shops in different cities selling the same product, but the phone line between them breaks. If a customer walks in, does the shop (1) answer immediately using possibly outdated stock info (**Availability**), or (2) wait until it can confirm the exact real-time stock with the other shop (**Consistency**)? You can't have both perfectly at the same time during the network break.

**Use case:** Banking systems usually prioritize Consistency (accuracy matters more than instant response). Social media "like counts" usually prioritize Availability (a slightly outdated number is fine, but the app should never hang).

---

## 8. OLTP vs OLAP

**OLTP (Online Transaction Processing)** — Definition: A system designed for fast, small, everyday operations like inserting or updating a single record.

**OLAP (Online Analytical Processing)** — Definition: A system designed for complex analysis over large amounts of data, usually for reporting.

| | OLTP | OLAP |
|---|---|---|
| Purpose | Daily operations | Analysis and reporting |
| Example | Placing an order, withdrawing cash | "Show total sales for the last 3 months" |
| Speed | Very fast, small queries | Slower, but handles huge/complex queries |
| Common Tool | PostgreSQL (as the main app database) | Data warehouses like Snowflake, Redshift |

**Use case:** When you place an order on an e-commerce site, that's OLTP. When the company later analyzes "which product category sold best last quarter," that's OLAP.

---

## 9. Installing PostgreSQL & `psql` Basics

**Definition:** `psql` is PostgreSQL's official command-line tool that lets you connect to a database and run SQL commands directly.

**Installing with Docker (recommended for learning):**
```bash
docker run --name pg-learning -e POSTGRES_PASSWORD=mypassword -p 5432:5432 -d postgres
```

**Connecting with psql:**
```bash
psql -h localhost -U postgres -d postgres
```

**Common `psql` commands:**

| Command | What it does |
|---|---|
| `\l` | List all databases |
| `\c dbname` | Connect to a specific database |
| `\dt` | List all tables in the current database |
| `\d tablename` | Show the structure of a table |
| `\q` | Quit psql |

---

## 10. GUI Tools

**Definition:** Graphical tools that let you view and manage a database visually, without typing every command.

- **pgAdmin** — the official PostgreSQL GUI tool, beginner-friendly
- **DBeaver** — free, supports many database types
- **TablePlus** — clean interface, free tier available

**Use case:** Useful when you want to browse table data, click through relationships, or run queries without memorizing every command.

---

## Quick Recap — Definitions in One Line Each

| Term | One-line definition |
|---|---|
| Database | Organized, electronically stored collection of data |
| DBMS | Software that manages a database |
| RDBMS | A DBMS that uses related tables |
| NoSQL | A DBMS that uses flexible, non-table formats |
| Client-Server | Client sends requests, server processes and responds |
| Table | A structured grid of rows and columns |
| Primary Key | Unique identifier for each row |
| Foreign Key | A column linking to another table's primary key |
| Atomicity | All-or-nothing transaction execution |
| Consistency (ACID) | Transactions never break database rules |
| Isolation | Concurrent transactions don't interfere |
| Durability | Committed data survives crashes |
| CAP Theorem | Pick 2 of Consistency, Availability, Partition tolerance |
| OLTP | Fast, everyday transactional operations |
| OLAP | Complex analysis over large data |

---

## Practice Questions

1. What's the difference between DBMS and RDBMS? Give an example of when you'd use RDBMS vs NoSQL.
2. In an `orders` table with columns `order_id`, `customer_phone`, `customer_email`, `product_name` — which would you make the Primary Key, and why? Which columns could be Candidate Keys?
3. What does a Foreign Key do? What happens if you try to delete a customer who still has a pending order (without a `CASCADE` rule)?
4. Which ACID property ensures your money isn't "half deducted" if the power goes out mid-transaction?
5. Is "placing an order" on Zomato OLTP or OLAP? Is "calculating last year's total revenue" OLTP or OLAP?

---

**Next:** [Phase 1 — Core SQL](../01-core-sql/notes.md)