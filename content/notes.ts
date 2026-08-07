import { schemaSql } from '@/lib/schema';

export type NoteSection =
  | { type: 'paragraph'; title?: string; body: string[] }
  | { type: 'list'; title: string; items: string[] }
  | { type: 'code'; title: string; language: 'sql' | 'bash' | 'text'; code: string }
  | { type: 'table'; title: string; headers: string[]; rows: string[][] }
  | { type: 'callout'; title: string; body: string }
  | { type: 'interactive'; title: string; visual: 'seat-locking' | 'btree-index' | 'schema-map' };

export type NotePage = {
  topicId: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  readingTime: string;
  sections: NoteSection[];
};

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: 'Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const notePages: NotePage[] = [
  {
    topicId: '00-foundations',
    slug: 'database-mental-model',
    title: 'Database Mental Model',
    description: 'Understand what a database does before thinking about SQL syntax.',
    level: 'Beginner',
    readingTime: '12 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'A database is a durable, organized place where applications store facts they need to read later. PostgreSQL is the software that protects those facts while many users and services are reading and changing them at the same time.',
          'Think of it as a shared notebook with strict rules: every page has a shape, every edit can be checked, and important edits survive crashes.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Most backend bugs become database bugs once real users arrive: duplicated payments, oversold seats, missing audit trails, slow dashboards, or leaked user data.',
          'A good engineer does not only know how to write SELECT. They know what guarantee the database is providing and what cost they are paying for it.'
        ]
      },
      {
        type: 'list',
        title: '3. Core concept breakdown',
        items: [
          'Table: a named collection of rows with a known shape.',
          'Row: one stored fact, such as one user or one order.',
          'Column: one attribute on the row, such as email, amount, status, or created_at.',
          'Constraint: a rule PostgreSQL enforces, such as unique email or non-negative price.',
          'Transaction: a group of changes that succeeds or fails as one unit.',
          'Index: an extra data structure that makes specific lookups faster.'
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '4. First useful query',
        language: 'sql',
        code: `select
  u.email,
  count(o.id) as order_count,
  coalesce(sum(o.total), 0) as lifetime_value
from users u
left join orders o on o.user_id = u.id
where u.deleted_at is null
group by u.id, u.email
order by lifetime_value desc
limit 10;`
      },
      {
        type: 'table',
        title: '5. Example output',
        headers: ['email', 'order_count', 'lifetime_value'],
        rows: [
          ['maya@example.com', '18', '4219.70'],
          ['sam@example.com', '7', '839.20'],
          ['lee@example.com', '0', '0.00']
        ]
      },
      {
        type: 'callout',
        title: 'Production note',
        body: 'The left join keeps users who have not ordered yet. In analytics and support tools, accidentally using an inner join often hides important zero-state records.'
      }
    ]
  },
  {
    topicId: '00-foundations',
    slug: 'dbms-rdbms-nosql',
    title: 'DBMS vs RDBMS vs NoSQL',
    description: 'Choose the right data model by understanding the tradeoff, not the hype.',
    level: 'Beginner',
    readingTime: '15 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'A DBMS is software for storing and managing data. An RDBMS is a DBMS that stores data in related tables. NoSQL is a broad family of databases that use other models such as documents, key-value pairs, wide columns, or graphs.',
          'PostgreSQL is an RDBMS, but it also supports document-like JSONB, full-text search, network types, range types, and extensions.'
        ]
      },
      {
        type: 'table',
        title: '2. Comparison table',
        headers: ['Type', 'Shape', 'Best fit', 'Risk'],
        rows: [
          ['RDBMS', 'Tables with relationships', 'orders, payments, tickets, ledgers', 'schema changes require discipline'],
          ['Document DB', 'Flexible JSON documents', 'fast-changing profile data or content', 'relationships can become app-managed joins'],
          ['Key-value', 'key -> value', 'sessions, cache, rate limits', 'weak ad hoc query ability'],
          ['Graph', 'nodes and edges', 'deep relationship traversal', 'not ideal for normal OLTP checkout']
        ]
      },
      {
        type: 'list',
        title: '3. When PostgreSQL is the right default',
        items: [
          'You need transactions around multiple tables.',
          'You need foreign keys and constraints to protect correctness.',
          'You need strong query power for operational workflows.',
          'Your team benefits from one durable source of truth.'
        ]
      },
      {
        type: 'code',
        title: '4. Relational example: orders and payments',
        language: 'sql',
        code: `select
  o.id as order_id,
  o.status as order_status,
  p.status as payment_status,
  p.amount
from orders o
join payments p on p.order_id = o.id
where o.created_at >= now() - interval '7 days';`
      },
      {
        type: 'callout',
        title: 'Why not store everything in one JSON document?',
        body: 'You could store an order, payment, shipment, and ledger in one document, but it becomes difficult to enforce independent lifecycles, query failures, retry payments, and audit money movements safely.'
      }
    ]
  },
  {
    topicId: '00-foundations',
    slug: 'acid-cap-oltp-olap',
    title: 'ACID, CAP, OLTP, and OLAP',
    description: 'The vocabulary behind correctness, scale, and workload design.',
    level: 'Intermediate',
    readingTime: '18 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'ACID explains the safety guarantees of a transaction. CAP explains tradeoffs during network partitions in distributed systems. OLTP describes day-to-day writes and reads. OLAP describes analytical queries over lots of data.',
          'A PostgreSQL-backed checkout path is usually OLTP. A dashboard that scans millions of order rows by month is OLAP-like, even if it still runs in PostgreSQL.'
        ]
      },
      {
        type: 'list',
        title: '2. ACID breakdown',
        items: [
          'Atomicity: create order, reserve inventory, and insert payment attempt all happen or all roll back.',
          'Consistency: total cannot be negative, email stays unique, and reservation cannot point to a missing seat.',
          'Isolation: two buyers cannot both safely claim the same final seat if the transaction is designed correctly.',
          'Durability: once COMMIT returns, PostgreSQL has made the result crash-safe through WAL.'
        ]
      },
      {
        type: 'code',
        title: '3. Checkout as one transaction',
        language: 'sql',
        code: `begin;

insert into orders (id, user_id, status, subtotal, tax, total)
values (:order_id, :user_id, 'pending_payment', 99.00, 8.91, 107.91);

update inventory_items
set available_qty = available_qty - 1,
    reserved_qty = reserved_qty + 1,
    updated_at = now()
where variant_id = :variant_id
  and available_qty >= 1;

insert into payment_attempts (id, payment_id, idempotency_key, status)
values (:attempt_id, :payment_id, :idempotency_key, 'created');

commit;`
      },
      {
        type: 'table',
        title: '4. Workload comparison',
        headers: ['Workload', 'Example', 'Optimization goal'],
        rows: [
          ['OLTP', 'book one seat', 'low latency and correctness'],
          ['OLAP', 'monthly revenue by category', 'scan efficiency and aggregation speed'],
          ['Hybrid', 'support dashboard for recent failed payments', 'fresh data with bounded query cost']
        ]
      }
    ]
  },
  {
    topicId: '00-foundations',
    slug: 'keys-and-relationships',
    title: 'Keys and Relationships',
    description: 'Primary, foreign, natural, surrogate, composite, and candidate keys using real tables.',
    level: 'Intermediate',
    readingTime: '16 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'A key is how the database identifies a row or connects rows across tables. Good keys make data stable. Bad keys make updates painful and relationships unreliable.'
        ]
      },
      {
        type: 'table',
        title: '2. Key types',
        headers: ['Key', 'Example', 'Use'],
        rows: [
          ['Primary key', 'users.id', 'stable row identity'],
          ['Foreign key', 'orders.user_id -> users.id', 'relationship enforcement'],
          ['Natural key', 'users.email', 'real-world uniqueness, but can change'],
          ['Surrogate key', 'orders.id', 'generated stable identity'],
          ['Composite key', 'unique(event_id, seat_id)', 'one seat can be reserved once per event'],
          ['Candidate key', 'products.sku', 'could identify a product if business rules allow it']
        ]
      },
      {
        type: 'code',
        title: '3. Seat uniqueness with a composite key',
        language: 'sql',
        code: `alter table seat_reservations
add constraint seat_reservations_one_seat_per_event
unique (event_id, seat_id);`
      },
      {
        type: 'callout',
        title: 'Production note',
        body: 'For race-prone workflows, a unique constraint is a final line of defense. Application checks are useful, but the database must enforce the invariant.'
      }
    ]
  },
  {
    topicId: '01-core-sql',
    slug: 'ddl-dml-dql-dcl-tcl',
    title: 'SQL Command Families',
    description: 'DDL, DML, DQL, DCL, and TCL explained through real PostgreSQL tables, writes, reads, permissions, and transactions.',
    level: 'Beginner',
    readingTime: '28 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'SQL commands are grouped by what kind of work they do. Some commands define the shape of the database, some change data, some read data, some manage permissions, and some control transactions.',
          'This matters because production database work is not just SELECT queries. A backend engineer must know how schema changes, writes, permissions, and transaction boundaries affect correctness and uptime.'
        ]
      },
      {
        type: 'table',
        title: '2. Command family overview',
        headers: ['Family', 'Full form', 'Purpose', 'Common commands'],
        rows: [
          ['DDL', 'Data Definition Language', 'defines or changes database structure', 'CREATE, ALTER, DROP, TRUNCATE'],
          ['DML', 'Data Manipulation Language', 'changes rows inside tables', 'INSERT, UPDATE, DELETE, MERGE'],
          ['DQL', 'Data Query Language', 'reads rows from tables', 'SELECT'],
          ['DCL', 'Data Control Language', 'controls permissions', 'GRANT, REVOKE'],
          ['TCL', 'Transaction Control Language', 'controls commit/rollback boundaries', 'BEGIN, COMMIT, ROLLBACK, SAVEPOINT']
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'Imagine PostgreSQL as a well-run warehouse. DDL builds shelves and labels them. DML puts items on shelves or moves them. DQL searches the shelves. DCL decides who may enter each room. TCL decides whether a batch of changes becomes permanent or gets undone.',
          'In real systems these families often work together. A checkout flow uses DQL to read prices, DML to create orders and payments, TCL to make the writes atomic, and DDL/DCL to enforce the structure and access rules behind the scenes.'
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '4. DDL: create structure',
        language: 'sql',
        code: `create table coupons (
  id uuid primary key,
  code text not null unique,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  check (ends_at > starts_at)
);

alter table orders
add column coupon_id uuid references coupons(id);

create index orders_user_created_at_idx
on orders (user_id, created_at desc);`
      },
      {
        type: 'list',
        title: '5. DDL breakdown',
        items: [
          'CREATE TABLE defines a new table and its columns.',
          'PRIMARY KEY gives every coupon a stable identity.',
          'UNIQUE prevents duplicate coupon codes.',
          'CHECK keeps invalid discounts and invalid time ranges out of the table.',
          'ALTER TABLE evolves an existing table.',
          'CREATE INDEX prepares the database for common lookups.'
        ]
      },
      {
        type: 'code',
        title: '6. DML: insert and update rows',
        language: 'sql',
        code: `insert into coupons (id, code, discount_percent, starts_at, ends_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'WELCOME10',
  10.00,
  now(),
  now() + interval '30 days'
);

update orders
set coupon_id = '11111111-1111-1111-1111-111111111111',
    total = round(total * 0.90, 2)
where id = :order_id
  and status = 'draft'
returning id, status, total, coupon_id;`
      },
      {
        type: 'table',
        title: '7. Example DML result',
        headers: ['id', 'status', 'total', 'coupon_id'],
        rows: [
          ['ord_7f3...', 'draft', '97.12', '11111111-1111-1111-1111-111111111111']
        ]
      },
      {
        type: 'code',
        title: '8. DQL: read data',
        language: 'sql',
        code: `select
  o.id,
  u.email,
  o.status,
  o.total,
  c.code as coupon_code,
  o.created_at
from orders o
join users u on u.id = o.user_id
left join coupons c on c.id = o.coupon_id
where o.created_at >= now() - interval '7 days'
order by o.created_at desc
limit 20;`
      },
      {
        type: 'table',
        title: '9. Example DQL output',
        headers: ['id', 'email', 'status', 'total', 'coupon_code'],
        rows: [
          ['ord_7f3...', 'maya@example.com', 'paid', '97.12', 'WELCOME10'],
          ['ord_8a1...', 'sam@example.com', 'pending_payment', '219.00', ''],
          ['ord_9bc...', 'lee@example.com', 'cancelled', '44.50', '']
        ]
      },
      {
        type: 'code',
        title: '10. DCL: grant least privilege',
        language: 'sql',
        code: `create role app_readonly;
create role app_writer;

grant usage on schema public to app_readonly, app_writer;
grant select on users, products, product_variants, product_prices, orders, order_items to app_readonly;
grant select, insert, update on orders, order_items, payments, payment_attempts to app_writer;

revoke delete on orders from app_writer;`
      },
      {
        type: 'callout',
        title: 'Production note',
        body: 'Application roles should not be superusers. A reporting job rarely needs write access, and an app writer usually should not be able to drop tables or delete historical orders.'
      },
      {
        type: 'code',
        title: '11. TCL: make a checkout atomic',
        language: 'sql',
        code: `begin;

insert into orders (id, user_id, status, subtotal, tax, total, created_at)
values (:order_id, :user_id, 'pending_payment', 120.00, 10.80, 130.80, now());

insert into order_items (id, order_id, variant_id, quantity, unit_price)
values (:item_id, :order_id, :variant_id, 1, 120.00);

update inventory_items
set available_qty = available_qty - 1,
    reserved_qty = reserved_qty + 1,
    updated_at = now()
where variant_id = :variant_id
  and warehouse_code = 'BLR-01'
  and available_qty >= 1;

insert into payment_attempts (id, payment_id, idempotency_key, status)
values (:attempt_id, :payment_id, :idempotency_key, 'created');

commit;`
      },
      {
        type: 'paragraph',
        title: '12. How PostgreSQL handles this internally',
        body: [
          'DDL updates PostgreSQL system catalogs. For example, CREATE TABLE records table metadata, columns, constraints, and indexes in internal catalog tables. Many DDL commands also take strong locks, so migrations must be planned carefully.',
          'DML creates new row versions instead of overwriting rows in place. PostgreSQL uses MVCC, so readers can keep seeing a consistent snapshot while writers create newer versions.',
          'TCL decides when those row versions become visible to other transactions. COMMIT makes the transaction durable through WAL, while ROLLBACK marks the changes as aborted.'
        ]
      },
      {
        type: 'table',
        title: '13. Common mistakes and anti-patterns',
        headers: ['Mistake', 'Why it hurts', 'Better approach'],
        rows: [
          ['Running ALTER TABLE casually on huge tables', 'may lock writes and cause outage', 'test lock behavior and use expand/contract migrations'],
          ['Using DELETE for audit-sensitive data', 'history disappears and debugging gets harder', 'use status columns, soft delete, or append-only audit logs'],
          ['Forgetting WHERE in UPDATE/DELETE', 'can modify every row', 'run SELECT first and use transactions'],
          ['Giving app users owner privileges', 'app bug can damage schema or data', 'least-privilege roles'],
          ['Doing multiple writes without a transaction', 'partial checkout or payment state can leak', 'wrap related changes in BEGIN/COMMIT']
        ]
      },
      {
        type: 'code',
        title: '14. Safer update pattern',
        language: 'sql',
        code: `begin;

select id, status, total
from orders
where id = :order_id
for update;

update orders
set status = 'cancelled'
where id = :order_id
  and status in ('draft', 'pending_payment')
returning id, status, total;

rollback; -- use commit only after verifying the returned row during manual work`
      },
      {
        type: 'table',
        title: '15. Trade-offs table',
        headers: ['Decision', 'Pros', 'Cons'],
        rows: [
          ['Strict constraints in DDL', 'protects correctness centrally', 'requires careful migrations'],
          ['RETURNING on writes', 'avoids extra SELECT round trip', 'can expose too much data if used loosely'],
          ['Transactions around workflows', 'prevents partial state', 'locks may be held longer'],
          ['Least-privilege DCL', 'limits blast radius', 'more roles to manage'],
          ['Indexes for common DQL', 'faster reads', 'slower writes and more storage']
        ]
      },
      {
        type: 'list',
        title: '16. Interview angle',
        items: [
          'Question: What is the difference between DDL and DML? Answer: DDL changes schema structure; DML changes table rows.',
          'Question: Why use RETURNING in PostgreSQL? Answer: It lets a write return the affected rows without a second query.',
          'Question: Why should checkout use a transaction? Answer: order, inventory, and payment state must not partially commit.',
          'Question: What is dangerous about ALTER TABLE in production? Answer: some forms take locks that can block reads or writes on large tables.',
          'Question: What is least privilege? Answer: give each role only the permissions required for its job.'
        ]
      },
      {
        type: 'list',
        title: '17. Try it yourself',
        items: [
          'Create the coupons table with the constraints shown above.',
          'Insert one valid coupon and one invalid coupon with discount_percent = 120. Observe the CHECK failure.',
          'Run the DQL query and explain why coupons uses a LEFT JOIN.',
          'Wrap an order status update in BEGIN and ROLLBACK to prove the change is undone.',
          'Create a readonly role and verify it cannot insert into orders.'
        ]
      },
      {
        type: 'list',
        title: '18. Further reading',
        items: [
          'PostgreSQL documentation: SQL Commands',
          'PostgreSQL documentation: Data Definition',
          'PostgreSQL documentation: MVCC',
          'PostgreSQL documentation: Privileges',
          'PostgreSQL documentation: Transactions'
        ]
      }
    ]
  },
  {
    topicId: '02-data-types',
    slug: 'numeric-money-decimal',
    title: 'Numeric, Money, and Decimal Values',
    description: 'Model money without floating point surprises.',
    level: 'Intermediate',
    readingTime: '14 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'Use numeric or integer minor units for money. Do not use real or double precision for balances, prices, refunds, tax, or ledgers because floating point types trade exactness for speed.'
        ]
      },
      {
        type: 'code',
        title: '2. Price history table',
        language: 'sql',
        code: `create table product_prices (
  id uuid primary key,
  variant_id uuid not null references product_variants(id),
  currency_code char(3) not null,
  amount numeric(12,2) not null check (amount >= 0),
  valid_from timestamptz not null,
  valid_to timestamptz,
  check (valid_to is null or valid_to > valid_from)
);`
      },
      {
        type: 'table',
        title: '3. Trade-offs table',
        headers: ['Choice', 'Pros', 'Cons'],
        rows: [
          ['numeric(12,2)', 'exact decimal math', 'slower and bigger than integers'],
          ['integer cents', 'fast and exact', 'must handle currency precision outside SQL'],
          ['money', 'built-in money type', 'locale-sensitive output and less portable'],
          ['double precision', 'fast', 'unsafe for financial correctness']
        ]
      }
    ]
  },
  {
    topicId: '06-indexing',
    slug: 'btree-indexes',
    title: 'B-tree Indexes',
    description: 'How PostgreSQL finds a row without scanning every row.',
    level: 'Advanced',
    readingTime: '22 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'A B-tree index is a sorted lookup structure. Instead of checking every user row to find one email, PostgreSQL walks from a root page to a leaf page and jumps to the matching heap row.'
        ]
      },
      {
        type: 'interactive',
        title: '2. Animated example: email lookup',
        visual: 'btree-index'
      },
      {
        type: 'code',
        title: '3. Index for login lookup',
        language: 'sql',
        code: `create unique index users_email_active_idx
on users (lower(email))
where deleted_at is null;

explain analyze
select id, email, full_name
from users
where lower(email) = lower('maya@example.com')
  and deleted_at is null;`
      },
      {
        type: 'list',
        title: '4. When this index helps',
        items: [
          'Login by email.',
          'Password reset by email.',
          'Support lookup by exact email.',
          'Uniqueness among non-deleted accounts.'
        ]
      },
      {
        type: 'callout',
        title: 'Production note',
        body: 'The query must match the expression and predicate. An index on lower(email) where deleted_at is null is not useful if the query forgets deleted_at is null or searches plain email with case-sensitive comparison.'
      }
    ]
  },
  {
    topicId: '08-transactions-locking',
    slug: 'seat-locking',
    title: 'Seat Locking Race Condition',
    description: 'Prevent two users from booking the same seat during high-concurrency checkout.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'A race condition happens when two transactions read the same available seat and both try to reserve it. Locking is how PostgreSQL makes one transaction wait or fail instead of silently corrupting the business rule.'
        ]
      },
      {
        type: 'interactive',
        title: '2. Animated example: two buyers, one seat',
        visual: 'seat-locking'
      },
      {
        type: 'code',
        title: '3. Safe reservation transaction',
        language: 'sql',
        code: `begin;

select id
from seats
where id = :seat_id
for update;

insert into seat_reservations (id, event_id, seat_id, user_id, hold_id)
values (:reservation_id, :event_id, :seat_id, :user_id, :hold_id);

update seat_holds
set status = 'converted'
where id = :hold_id
  and status = 'active'
  and expires_at > now();

commit;`
      },
      {
        type: 'code',
        title: '4. Final invariant',
        language: 'sql',
        code: `create unique index seat_reservations_event_seat_uidx
on seat_reservations (event_id, seat_id);`
      },
      {
        type: 'table',
        title: '5. Trade-offs table',
        headers: ['Approach', 'Pros', 'Cons'],
        rows: [
          ['SELECT FOR UPDATE', 'simple and explicit row lock', 'waits under contention'],
          ['unique(event_id, seat_id)', 'hard correctness guarantee', 'second buyer gets constraint error'],
          ['advisory locks', 'can lock business keys before row exists', 'easy to misuse without strict conventions'],
          ['serializable isolation', 'strong anomaly protection', 'may require retry logic']
        ]
      },
      {
        type: 'callout',
        title: 'Production note',
        body: 'Use database constraints as the final protection and treat lock waits, deadlocks, and unique violations as normal production states your application handles cleanly.'
      }
    ]
  },
  {
    topicId: '09-schema-design-normalization',
    slug: 'normalization',
    title: 'Normalization 1NF to BCNF',
    description: 'Design tables that reduce duplication without making the product impossible to query.',
    level: 'Advanced',
    readingTime: '24 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'Normalization is the practice of arranging data so each fact lives in the right place. It prevents update bugs like changing a product category in one row but forgetting another row.'
        ]
      },
      {
        type: 'table',
        title: '2. Normal forms',
        headers: ['Form', 'Plain-English rule', 'Example fix'],
        rows: [
          ['1NF', 'one value per cell', 'move comma-separated product IDs into order_items'],
          ['2NF', 'non-key columns depend on the whole key', 'move seat row label to seats, not seat_reservations'],
          ['3NF', 'non-key columns do not depend on other non-key columns', 'store category name in categories, not every product row'],
          ['BCNF', 'every determinant is a candidate key', 'enforce business identifiers with unique constraints']
        ]
      },
      {
        type: 'code',
        title: '3. Before: duplicated order item data',
        language: 'sql',
        code: `-- Problem shape: product facts repeat in every order row.
create table bad_orders (
  order_id uuid,
  user_email text,
  product_sku text,
  product_name text,
  category_name text,
  quantity integer,
  unit_price numeric(12,2)
);`
      },
      {
        type: 'code',
        title: '4. After: normalized relationship',
        language: 'sql',
        code: `create table orders (
  id uuid primary key,
  user_id uuid not null references users(id),
  status text not null,
  total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key,
  order_id uuid not null references orders(id),
  variant_id uuid not null references product_variants(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null
);`
      }
    ]
  }
];

export function getNotePage(topicId: string, slug: string) {
  return notePages.find((page) => page.topicId === topicId && page.slug === slug);
}
