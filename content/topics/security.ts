import { schemaSql } from '@/lib/schema';
import { NotePage, NoteSection } from '../notes';

const sharedSchemaSection: NoteSection = {
  type: 'code',
  title: '5. Schema used in this page',
  language: 'sql',
  code: schemaSql
};

export const securityNotes: NotePage[] = [
  {
    topicId: '12-security',
    slug: 'roles-grants',
    title: 'Roles and Grants',
    description: 'What roles and grants are, the exact GRANT/REVOKE syntax, and how to build least-privilege RBAC in production.',
    level: 'Intermediate',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what roles and grants are',
        body: [
          'In PostgreSQL, users and groups are unified into Roles (CREATE ROLE). Roles can be assigned granular permissions (GRANT/REVOKE) on schemas, tables, sequences, functions, and columns.',
          'What they do: every connection authenticates as a role, and every statement is checked against that role\'s privileges — the foundation of least-privilege access control.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'The app should connect with an app-specific role, never postgres. Least privilege limits blast radius: a SQL injection in a read-only endpoint cannot delete orders; a compromised analyst cannot revoke grants. Roles + grants are also the standard audit boundary (who could have done what).'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'A role is a badge; a grant is a door key. The public corridor (PUBLIC) has some default keys — remove them. A group role is a master badge that copies its keys to members. SECURITY DEFINER functions are a VIP pass: the holder temporarily wears the badge of a higher role just for one door, and must hand back exactly the keys (search_path) so the pass cannot be cloned.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: privilege syntax reference',
        headers: ['Privilege', 'Syntax', 'Applies to'],
        rows: [
          ['SELECT / INSERT / UPDATE / DELETE', 'GRANT SELECT ON orders TO app_read;', 'tables, views, sequences'],
          ['USAGE', 'GRANT USAGE ON SCHEMA public TO app;', 'schemas, sequences, types'],
          ['CREATE', 'GRANT CREATE ON SCHEMA public TO migrator;', 'schemas, databases'],
          ['EXECUTE', 'GRANT EXECUTE ON FUNCTION f() TO app;', 'functions, procedures'],
          ['ALL', 'GRANT ALL PRIVILEGES ON ALL TABLES ...;', 'bulk grants'],
          ['REVOKE', 'REVOKE DELETE ON orders FROM app_writer;', 'any privilege']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: create roles and grant read/write',
        language: 'sql',
        code: `create role app_read_only login password '...';
create role app_read_write login password '...';

grant usage on schema public to app_read_only, app_read_write;
grant select on all tables in schema public to app_read_only;
grant select, insert, update on orders, order_items, payments to app_read_write;
grant usage, select on all sequences in schema public to app_read_write;
revoke delete on orders from app_read_write;   -- writers cannot delete orders

-- Default privileges: FUTURE tables get the same grants automatically
alter default privileges in schema public
  grant select on tables to app_read_only;`
      },
      {
        type: 'code',
        title: '7. Medium example: group roles (membership) for teams',
        language: 'sql',
        code: `-- Group roles compose privileges:
create role analytics_group;
grant select on all tables in schema public to analytics_group;

create role analyst_1 login password '...';
create role analyst_2 login password '...';
grant analytics_group to analyst_1, analyst_2;   -- members inherit grants

-- A role hierarchy: app role inherits from a base role
create role app_base nologin;
grant usage on schema public to app_base;
create role checkout_service login password '...' in role app_base;
-- checkout_service now has everything app_base has

-- Connection limits per role:
alter role checkout_service connection limit 20;`
      },
      {
        type: 'code',
        title: '8. Complex example: SECURITY DEFINER with locked-down search_path',
        language: 'sql',
        code: `-- A function that safely performs an action the caller cannot do directly
create or replace function cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer          -- runs with the OWNER's privileges
set search_path = public, pg_temp   -- freeze search_path: no hijacking!
as $$
begin
  update orders set status = 'cancelled'
  where id = p_order_id
    and status not in ('shipped', 'refunded');

  if not found then
    raise exception 'order % cannot be cancelled', p_order_id
      using errcode = 'P0001';
  end if;
end;
$$;

-- Only callable by app_read_write (revoke PUBLIC default first):
revoke all on function cancel_order(uuid) from public;
grant execute on function cancel_order(uuid) to app_read_write;

-- Caller never needs UPDATE privileges on orders directly:
select cancel_order('ord_9001');`
      },
      {
        type: 'callout',
        title: 'SECURITY DEFINER is a privilege-escalation tool',
        body: 'A SECURITY DEFINER function runs with the privileges of its OWNER. Anyone who can EXECUTE it can do what the owner can do — so: revoke PUBLIC EXECUTE, freeze search_path, keep the owner role low-privilege, and audit who can create functions (a role that can CREATE FUNCTION can define its own security definer!).'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how privilege checks execute',
        body: [
          'Permissions are stored in catalog tables (pg_authid, pg_auth_members, pg_class.relacl, pg_namespace.nspacl) as ACL arrays. On every access, the executor calls aclcheck() walking: role memberships (recursively through pg_auth_members), then object ACLs, then PUBLIC defaults. The search_path is a role-level GUC that also drives which schema objects resolve — which is why untrusted search_path plus SECURITY DEFINER is the classic hijack vector.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['App connecting as postgres/superuser', 'One compromised query = full database', 'Dedicated least-privilege app role'],
          ['Default PUBLIC privileges left on', 'Functions/tables exposed to every role', 'REVOKE ... FROM PUBLIC; explicit grants'],
          ['GRANT ALL to everything', 'Analysts can drop tables', 'Grant the exact verbs needed'],
          ['SECURITY DEFINER without search_path fix', 'Hijackable by malicious function names', 'set search_path = public, pg_temp'],
          ['Passwords in code/config repos', 'Credentials leak with the repo', 'pgpass, vault, external secret managers']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Use one role per application tier (api_read, api_write, admin, etl, report).',
          'Rotate app role passwords; use SCRAM-SHA-256 auth and ssl in pg_hba.',
          'Audit membership: SELECT rolname, memberof FROM pg_roles;',
          'Default privileges are the difference between "granted today" and "granted forever" — set them at schema creation.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: Roles vs users in PostgreSQL? Answer: They are the same entity (CREATE ROLE); a role with LOGIN is a user, without it a group. Memberships inherit privileges.',
          'Question: How do you implement least privilege for an app? Answer: Dedicated role per tier, explicit GRANTs on the exact verbs, REVOKE PUBLIC, default privileges for new tables, SECURITY DEFINER only with frozen search_path.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Build the app_read_only/app_read_write pair and verify a denied DELETE.',
          '2. Compose the analytics group and confirm inheritance.',
          '3. Write the SECURITY DEFINER cancel_order and try calling it as a role without EXECUTE.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Roles", "Privileges", "Grant"',
          'Next: Row-Level Security'
        ]
      }
    ]
  },
  {
    topicId: '12-security',
    slug: 'row-level-security',
    title: 'Row-Level Security',
    description: 'What RLS is, how policies are evaluated, and how to enforce tenant isolation at the database layer.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what RLS is',
        body: [
          'Row-Level Security (RLS) restricts which rows can be returned by queries or modified by DML commands based on security policies evaluated per user role or current session setting (e.g. app.current_tenant_id).',
          'What it does: even a query with no WHERE clause cannot see rows the policy forbids — the policy becomes part of every plan, so tenants are isolated no matter what the application code does.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Multi-tenant apps routinely suffer tenant-crossing bugs: a missing app-level filter exposes user A\'s orders to user B. RLS moves the invariant into the database, where it cannot be forgotten by a future developer. It is also the enforcement layer behind row-level audit and GDPR-style access.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'The table is a building; RLS is the security guard at every door who checks your badge against EACH ROOM (row) you try to enter. The guard\'s rulebook is the policy: USING tells the guard which rooms you may enter (read), WITH CHECK tells the guard which rooms you may build (write). App code sets your badge (current_setting) at the start of the request.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: policy anatomy',
        headers: ['Clause', 'Applies to', 'Evaluated on', 'Blocks'],
        rows: [
          ['USING', 'SELECT, UPDATE, DELETE', 'Existing rows', 'Seeing/reading/modifying rows'],
          ['WITH CHECK', 'INSERT, UPDATE', 'New rows being written', 'Creating rows you could not read'],
          ['FOR ALL / FOR SELECT / FOR UPDATE / FOR INSERT / FOR DELETE', 'Command scope', 'Per command', 'Tailoring per command type'],
          ['TO role(s)', 'Policy scope', 'Role match', 'Applies only to listed roles']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: tenant isolation with a session variable',
        language: 'sql',
        code: `-- Each request sets the caller's tenant/user:
select set_config('app.current_user_id', 'usr_9021a', false);

alter table orders enable row level security;

create policy orders_user_scope on orders
for all
to app_read_write
using (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)
with check (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);

-- Now, regardless of the query:
select * from orders;
-- Only usr_9021a's rows are returned — the policy is added to the plan.`
      },
      {
        type: 'code',
        title: '7. Medium example: combining RLS with FORCE + read-only paths',
        language: 'sql',
        code: `-- Blocked attempts to insert for another tenant:
set_config('app.current_user_id', 'usr_9021a', false);
insert into orders (id, user_id, status, total)
values (gen_random_uuid(), 'usr_8192b', 'paid', 99.00);
-- ERROR: new row violates row-level security policy "orders_user_scope"

-- FORCE RLS even for the table owner (who would bypass by default):
alter table orders force row level security;

-- A separate policy for admins (roles can bypass):
create role support_role;
grant select on orders to support_role;

create policy orders_support_read on orders
for select
to support_role
using (true);   -- support can read all (with audit trail), never write`
      },
      {
        type: 'code',
        title: '8. Complex example: multi-policy + per-command granularity',
        language: 'sql',
        code: `-- Defense in depth: users see their own, support sees all read-only
alter table orders enable row level security;
alter table orders force row level security;

create policy orders_self_all on orders
for all
to app_read_write
using (user_id = current_user_id())
with check (user_id = current_user_id());

create policy orders_support_read on orders
for select
to support_role
using (true);

-- Simpler helper instead of repeated nullif(current_setting(...)):
create function current_user_id() returns uuid
language sql stable
as $$ select nullif(current_setting('app.current_user_id', true), '')::uuid $$;

-- How it composes: multiple applicable policies are OR'd together —
-- a user in BOTH roles sees the union of both policies' rows.`
      },
      {
        type: 'callout',
        title: 'Policy composition is OR, not AND',
        body: 'When several policies apply to a role, the row is visible if ANY policy permits it (OR). To layer restrictions you must write them into ONE policy\'s USING expression. This is the most common RLS misunderstanding in reviews.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how RLS is enforced',
        body: [
          'RLS injects the policy expression into the query plan as an implicit filter on the table scan (a RowSecurityPolicy node in the plan tree). The plan includes a check for the caller\'s role to decide which policies apply. Because the filter is part of the plan, indexed filters still work — an index on (user_id) makes RLS filtering cheap. The session variable route (set_config) is advisory: anyone who can SET the variable can impersonate, so protect it (SECURITY DEFINER setter, or use real roles with membership).'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['Forgetting FORCE row level security', 'Table owner bypasses RLS entirely', 'ALTER TABLE ... FORCE RLS on tenant tables'],
          ['Tenant id from client input', 'Caller sets app.current_tenant_id = victim', 'Server sets the variable; never trust client values'],
          ['Multiple OR-composed policies', 'Union of rows leaks between roles', 'One policy per rule; understand OR semantics'],
          ['No index on policy column', 'Every query becomes a full scan', 'Index (user_id) etc. on RLS-filtered columns'],
          ['RLS on huge analytics tables', 'Per-row function calls in every scan', 'Use roles/views for analytics instead']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Set the session variable at connection acquisition (pooler: DISCARD ALL wipes it — set it per transaction!).',
          'With transaction pooling, set_config must happen on every transaction, not once per connection.',
          'Audit: log set_config changes or use a dedicated auth role per tenant.',
          'Test RLS with EXPLAIN: confirm the filter is in the plan and uses the index.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: How does RLS differ from views? Answer: RLS is row-level and applied automatically to every statement by policy, including future ad-hoc queries; views must be used deliberately and can be bypassed by direct table access.',
          'Question: Why FORCE RLS? Answer: The table owner bypasses policies unless the table is forced; in shared-SaaS setups the app usually owns the tables, so FORCE is required for real isolation.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Enable RLS and verify a cross-tenant INSERT is rejected.',
          '2. Add FORCE RLS and verify the owner no longer bypasses.',
          '3. Check the plan includes the RLS filter and uses an index on user_id.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "Row Security Policies"',
          'Next: Encryption'
        ]
      }
    ]
  },
  {
    topicId: '12-security',
    slug: 'encryption',
    title: 'Encryption',
    description: 'Implement TLS wire encryption, pgcrypto column encryption, transparent data encryption, and secret management.',
    level: 'Production',
    readingTime: '26 min',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition: what the encryption layers are',
        body: [
          'Database security requires defense-in-depth: Encryption-in-Transit (TLS/SSL for every client connection), Encryption-at-Rest (KMS disk volume encryption for the data files), and Field-Level Column Encryption (pgcrypto for sensitive PII in specific columns).',
          'What they do: each layer protects against a different threat — wire eavesdroppers, stolen disks/backups, and database-level data leaks.'
        ]
      },
      {
        type: 'paragraph',
        title: '2. Why it matters',
        body: [
          'Regulations (GDPR, PCI-DSS, HIPAA) and breach postmortems all converge on the same minimum: encrypted transport, encrypted storage, and hashed/encrypted secrets. A disk stolen from a datacenter is worthless if at-rest encryption is on; a password dump is useless if bcrypt-hashed.'
        ]
      },
      {
        type: 'paragraph',
        title: '3. Mental model',
        body: [
          'TLS is the sealed envelope on the courier\'s bike (protects in transit). At-rest encryption is the locked safe the ledger sleeps in (protects the stored book). Column encryption is the coded shorthand inside the book for the most sensitive figures (protects the values themselves). pgcrypto is the coder\'s toolbox; the keys are the only thing you must never lose.'
        ]
      },
      {
        type: 'table',
        title: '4. Core concept breakdown: the encryption layers',
        headers: ['Layer', 'Tool', 'Protects against', 'Configuration point'],
        rows: [
          ['In transit', 'TLS (ssl=on, certs, pg_hba hostssl)', 'Eavesdropping, MITM', 'postgresql.conf + pg_hba.conf'],
          ['At rest', 'LUKS / AWS EBS KMS / TDE', 'Stolen disks, lost backup media', 'OS/cloud layer'],
          ['Column', 'pgcrypto (pgp_sym_encrypt, pgp_pub_encrypt)', 'DB-level leaks, backups with data', 'Application queries'],
          ['Passwords', 'pgcrypto crypt() with bcrypt', 'Credential dumps', 'App code + storage']
        ]
      },
      sharedSchemaSection,
      {
        type: 'code',
        title: '6. Basic example: enforcing TLS for all connections',
        language: 'sql',
        code: `-- postgresql.conf:
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_min_protocol_version = 'TLSv1.3'

-- pg_hba.conf: only encrypted connections for remote clients:
# hostssl  all  all  0.0.0.0/0  scram-sha-256
# (drop any host lines for remote access — plaintext is refused)

-- Verify on the server:
select ssl, version, cipher from pg_stat_ssl join pg_stat_activity using (pid);`
      },
      {
        type: 'code',
        title: '7. Medium example: column-level encryption with pgcrypto',
        language: 'sql',
        code: `create extension if not exists pgcrypto;

-- Symmetric encryption (one shared key, stored in the DB)
-- NEVER store the key in the table itself; put it in a secrets vault:
alter table users add column card_encrypted bytea;

update users
set card_encrypted = pgp_sym_encrypt('4111-1111-1111-1111', current_setting('app.card_key'))
where id = 'usr_9021a';

-- Decrypt ONLY at the boundary service:
select pgp_sym_decrypt(card_encrypted, current_setting('app.card_key'))
from users where id = 'usr_9021a';

-- Searchable? NO — encrypted columns cannot be indexed for equality.
-- Compromise: add a SHA-256 hash column for lookups:
alter table users add column card_hash text;
update users set card_hash = encode(digest('4111-1111-1111-1111', 'sha256'), 'hex');`
      },
      {
        type: 'code',
        title: '8. Complex example: password hashing with bcrypt + timing-safe checks',
        language: 'sql',
        code: `-- NEVER store passwords in plaintext or MD5/SHA1.
-- bcrypt is the baseline: built-in cost, salt, resistant to GPU cracking.
create extension if not exists pgcrypto;

-- Registration:
insert into users (id, email, password_hash)
values (gen_random_uuid(), 'maya@example.com',
        crypt('correct-horse-battery-staple', gen_salt('bf', 10)));

-- Login (crypt() is constant-time — no timing side channel):
select id, email
from users
where email = 'maya@example.com'
  and password_hash = crypt('supplied-password', password_hash);

-- Rotate cost factor periodically (bf, 12) — rehash on login.

-- Key management checklist:
-- 1. Key in an external vault (AWS KMS, HashiCorp Vault), injected per request.
-- 2. Never log ciphertext keys; never commit them.
-- 3. Rotate keys; re-encrypt data on rotation (or use envelope encryption).`
      },
      {
        type: 'callout',
        title: 'Encryption is not the whole story',
        body: 'Encrypted columns block simple searches and joins — design the search strategy (hash column, tokenization) before you encrypt. Also remember: whoever holds the key can decrypt; key management and access control around the key is where encryption succeeds or fails. And TLS protects transport, never the data at rest.'
      },
      {
        type: 'paragraph',
        title: '9. PostgreSQL internals: how pgcrypto works',
        body: [
          'pgcrypto is a loadable extension wrapping OpenSSL (or built-in crypto): pgp_sym_encrypt uses AES-128/256 with OpenPGP framing (salted, optionally compressed, with a message checksum); crypt() implements bcrypt (Blowfish with adaptive cost), md5, and others via the crypt_* functions. digests are computed server-side with the hash algorithm of choice. Note: data is encrypted/decrypted in the server process memory — a DBA with superuser can still read the plaintext at query time if they have the key; true end-to-end security requires app-side encryption.'
        ]
      },
      {
        type: 'table',
        title: '10. Common mistakes',
        headers: ['Mistake', 'Why it hurts', 'Correct approach'],
        rows: [
          ['No TLS / mixed plaintext connections', 'Passwords and data fly in cleartext', 'hostssl only; refuse ssl=off'],
          ['Storing keys in the database', 'Encryption is theater — the key ships with the data', 'External vault, injected per query'],
          ['Plain md5 password hashing', 'Trivially cracked', 'crypt() with bcrypt cost 10-12'],
          ['Encrypting everything blindly', 'Indexes break, queries slow, no one decrypts', 'Encrypt only genuinely sensitive PII'],
          ['Encryption at rest disabled on backups', 'Backup media is the common leak', 'Encrypt volumes AND backup targets']
        ]
      },
      {
        type: 'list',
        title: '11. Production considerations',
        items: [
          'Choose the layer by threat: TLS for wire, volume encryption for disk/backup, pgcrypto for PII values.',
          'For cloud, use KMS-backed EBS encryption + managed certs (ACM/RDS ssl).',
          'Test key rotation with a drill — losing the key IS losing the data.',
          'Compliance: prove encryption config in audits; log access to decrypted columns.'
        ]
      },
      {
        type: 'list',
        title: '12. Interview angle',
        items: [
          'Question: How do you encrypt passwords in PostgreSQL? Answer: pgcrypto crypt(password, gen_salt(\'bf\', 10)) — bcrypt with adaptive cost and per-password salt; verify with crypt(input, stored_hash), which is timing-safe.',
          'Question: Column encryption vs at-rest encryption? Answer: At-rest (KMS/TDE) protects the files against disk theft; column encryption (pgcrypto) protects specific values against DB-level leaks — you need both, and app-side encryption for end-to-end security.'
        ]
      },
      {
        type: 'list',
        title: '13. Practice tasks',
        items: [
          '1. Enable TLS and confirm pg_stat_ssl shows cipher for your session.',
          '2. Encrypt a column with pgcrypto, then try an equality search — note the failure.',
          '3. Hash a password, crack the hash, and re-hash with bcrypt cost 12.'
        ]
      },
      {
        type: 'list',
        title: '14. Further reading',
        items: [
          'PostgreSQL docs: "SSL Support", "pgcrypto"',
          'Next: pg_stat_statements'
        ]
      }
    ]
  }
];
