# Query Template Guide — for Admins

This is the reference for building a query inside Query Master. Read it once, then use it
as a lookup while you're filling in the **Create Query** form.

> **One rule to remember:** a Sub Module *is* a query. There's no separate "queries list"
> inside a sub module — when you create a sub module, you're creating its one query at the
> same time, in the same form.

---

## 1. The four query types

STORED_PROCEDURE, DDL and UTILITY were removed — Query Master only supports the four types
support engineers actually reuse day to day:

| Type | Use it for |
|---|---|
| **INSERT** | Adding a new row |
| **UPDATE** | Editing specific columns on existing rows |
| **DELETE** | Removing rows |
| **SELECT** | Reading/filtering rows |

---

## 2. The three ingredients of a query

Every query is built from up to three ingredients. You don't need all three for every
query — use whichever fit.

### a) Variable Placeholders — fill-in-the-blank values

Write `{{tokenName}}` anywhere in your SQL Template, then define that token as a
placeholder. The user filling out the query sees a labeled input for it.

```
SELECT * FROM Employee WHERE department_id = {{DepartmentId}};
```
Placeholder row: name `DepartmentId`, label `Department`, type `INTEGER`, required ✅

### b) Updatable / Insertable Fields — a checklist of columns

Used for INSERT and UPDATE. You define **every column that could be inserted/updated**;
the user checks only the ones they need. Your SQL Template has one reserved token showing
where the generated list goes:

- INSERT → `{{INSERT_COLUMNS}}` and `{{INSERT_VALUES}}`
- UPDATE → `{{SET_CLAUSE}}`

### c) WHERE Clause Fields — a checklist of conditions

Same idea, for filtering. Your template has one reserved token: `{{WHERE_CLAUSE}}`. You
also choose whether checked conditions combine with **AND** or **OR**.

---

## 3. Data types — what the user sees

This is the part that trips people up, so here's exactly what each data type renders as
on the generator screen, for **both** placeholders and column checklists:

| Data type | What the user sees | What you (admin) configure |
|---|---|---|
| `STRING`, `DATE`, `DATETIME`, `CUSTOM` | A plain text box | Nothing extra |
| `INTEGER`, `DECIMAL` | A plain text box. The value must be a real number — anything else (`abc`, `1; DROP …`) is rejected with an error naming the field | Nothing extra |
| `JSON` | A plain text box | Nothing extra |
| `NULL` | Nothing to fill — always renders `NULL` | Nothing extra |
| **`BOOLEAN`** | A **True / False dropdown** — nothing else, automatically | Optionally set a default: True or False |
| **`ARRAY`** | A **single-select dropdown** of your custom option list | You type the option list, comma-separated (e.g. `Active, Inactive, Pending`), and can pick which one is pre-selected |

### Adding a Boolean column

1. In the field/placeholder row, set **Type** = `BOOLEAN`.
2. That's it — no options to type. The generator screen automatically shows a True/False
   dropdown for it.
3. Optionally pick a default (True, False, or no default) using the small dropdown next to it.

```
Field label: IsActive   Column: is_active   Type: BOOLEAN   Default: True
```
Generates `is_active = 1` (True) or `is_active = 0` (False) depending on what the user picks.

### Adding an Array column (a fixed list of choices, pick one)

1. Set **Type** = `ARRAY`.
2. An **Options** box appears — type every allowed value, comma-separated:
   `HR, Finance, IT, Operations`
3. The default dropdown now offers those same options, so you can pre-select one.
4. On the generator screen, the user gets a single-select dropdown built from exactly
   those options — they cannot type a value that isn't on your list.

```
Field label: Department   Column: department   Type: ARRAY   Options: HR, Finance, IT
```
Generates `department = 'HR'` (or whichever option the user picked) — quoted like any
text value.

### Multiple values — `IN (…)` lists

Support work constantly needs "all of these IDs", not one. Tick **Multiple values** on a
field and the user can enter any number of values instead of one. It works in two places:

| Where | Checkbox label | What it generates |
|---|---|---|
| A **WHERE field** | *Multiple values (IN)* | `column IN ('a', 'b', 'c')` instead of `column = 'a'` |
| A **placeholder** | *Multiple values* | `{{Token}}` becomes the whole list — `'a', 'b', 'c'` — so you write the `IN ( … )` yourself: `WHERE id IN ({{Ids}})` |

What the user sees on the generator screen:

| Data type (with *Multiple values* ticked) | Control |
|---|---|
| `STRING`, `INTEGER`, `DECIMAL`, `DATE`, `DATETIME`, `CUSTOM` | A **chip input** — type a value and press Enter (or a comma) to add it; the value becomes a removable chip |
| `ARRAY` | **Toggle pills** of your option list — pick any number of them |
| `BOOLEAN`, `NULL`, `JSON` | Not available — the checkbox is hidden (a list of these makes no sense) |

Tips for users, worth telling them: you can **paste a whole column from Excel or Sheets**
and every line becomes a chip (newlines, tabs, commas and semicolons all separate values).
Duplicates are dropped, order is kept, **Backspace** on an empty box removes the last
chip, and **Clear all** empties the list. Text typed but not yet added is kept when they
click away, so it isn't lost when they press *Generate SQL*.

**Worked example.** `SELECT * FROM Employee WHERE {{WHERE_CLAUSE}};` with two WHERE fields,
both ticked *Multiple values (IN)*: `EmployeeId` (`STRING`) and `Level` (`INTEGER`).
Entering `E101, E102, E103` and `1, 2` generates:

```sql
SELECT * FROM Employee WHERE employee_id IN ('E101', 'E102', 'E103') AND level IN (1, 2);
```

**Defaults.** For a *Multiple values* field the default is typed as comma-separated text
(`HR, IT`) and shows up as pre-filled chips.

**Rules worth knowing**
- A single value still generates `IN ('x')` — it's always an `IN` list once ticked.
- A ticked WHERE condition with **no values** is refused with *"Add at least one value for
  …"* — it never generates the invalid `IN ()`.
- An **optional** multi-value placeholder left empty renders `NULL`, so
  `IN ({{Ids}})` stays valid SQL (it just matches nothing). A **required** one must be filled.
- Numbers are checked per value: a stray header cell in a pasted column (`id`) is rejected
  with a message naming the field, rather than producing broken SQL.
- Multiple values aren't offered for Insertable/Updatable columns — a column can't be set to
  several values at once. Only WHERE fields and placeholders can be lists.
- Because commas and semicolons separate values, a single value that itself contains one
  can't be entered as one chip.
- Some databases cap an `IN` list (Oracle: 1,000 values). The generator shows a heads-up
  above 1,000; it doesn't block you.

---

## 4. Worked example: UPDATE with a Boolean and an Array field

**SQL Template**
```sql
UPDATE Employee
SET
{{SET_CLAUSE}}
WHERE
{{WHERE_CLAUSE}};
```

**Updatable Fields**
| Field label | Column | Type | Options | Default |
|---|---|---|---|---|
| Name | name | STRING | — | — |
| Is Active | is_active | BOOLEAN | — | True |
| Department | department | ARRAY | HR, Finance, IT | HR |

**WHERE Fields**
| Field label | Column | Type |
|---|---|---|
| Employee ID | employee_id | STRING |

**What the user sees:** a Name text box, an Is Active True/False dropdown (pre-set to
True), a Department dropdown with HR/Finance/IT (pre-set to HR), and an Employee ID box
for the WHERE condition. They check Is Active and Department, leave Name unchecked, type
`EMP1001` for Employee ID.

**Generated SQL:**
```sql
UPDATE Employee
SET
is_active = 1,
department = 'Finance'
WHERE
employee_id = 'EMP1001';
```

---

## 5. Step-by-step: creating a query

1. **Admin Panel → Queries → Create Query** (Admins only — *Admin Panel* is in the sidebar).
2. Fill in **Name** (this is both the sub module's name and the query's title),
   **Description**, **Category**, **Module**, **Query Type**, **Table Name**, **Tags**.
3. Write the **SQL Template**. Leave blanks as `{{tokens}}`, and drop in the reserved
   tokens (`{{SET_CLAUSE}}`, `{{WHERE_CLAUSE}}`, `{{INSERT_COLUMNS}}`, `{{INSERT_VALUES}}`)
   wherever dynamic content belongs.
4. Add rows to **Variable Placeholders** for any `{{tokens}}` you used.
5. Add rows to **Insertable/Updatable Fields** if this is an INSERT or UPDATE with a
   column checklist.
6. Add rows to **WHERE Clause Fields** if you used `{{WHERE_CLAUSE}}`, and pick AND/OR. Tick
   **Multiple values (IN)** on any field that should accept a list.
7. Save. The query is immediately live for anyone with **View** access on this sub module.
8. Grant access from **Permissions** → pick a user → check the actions
   (View/Create/Update/Delete/Manage) for this sub module.

---

## 6. Quick formulas by query type

**INSERT**
```sql
INSERT INTO {table} ({{INSERT_COLUMNS}})
VALUES ({{INSERT_VALUES}});
```

**UPDATE**
```sql
UPDATE {table}
SET
{{SET_CLAUSE}}
WHERE
{{WHERE_CLAUSE}};
```

**DELETE**
```sql
DELETE FROM {table}
WHERE
{{WHERE_CLAUSE}};
```

**SELECT** (fixed conditions via placeholders)
```sql
SELECT {columns}
FROM {table}
WHERE {column} = {{SomePlaceholder}};
```

**SELECT** (checklist-driven conditions, same as UPDATE/DELETE)
```sql
SELECT {columns}
FROM {table}
WHERE
{{WHERE_CLAUSE}};
```

**SELECT** (a list of values via a placeholder marked *Multiple values*)
```sql
SELECT {columns}
FROM {table}
WHERE {column} IN ({{Ids}});
```

---

## 7. Things to avoid

- **Don't** make a table name or column name itself a `{{placeholder}}` — every
  placeholder value gets escaped/quoted for safety, which breaks raw SQL identifiers.
  Keep column and table names as literal text in the template; only use placeholders for
  *values*.
- **Don't** forget the reserved token that matches your field checklist — if you add
  Updatable Fields but the template has no `{{SET_CLAUSE}}`, nothing will be injected.
- **Don't** re-use a placeholder/field name twice in the same query — the first match wins
  and the rest are ignored.
- **Don't** put a *Multiple values* placeholder anywhere except inside `IN ( … )`. It renders
  as `'a', 'b', 'c'`, so `WHERE id = {{Ids}}` would be invalid SQL as soon as two values are
  entered. For a plain `=` comparison keep the placeholder single-valued.

---

## 8. Notes (optional, per query)

Some queries benefit from a scratchpad — "run after 6pm", a ticket number, the list of IDs from
today's cleanup. In the query editor, switch on **Enable notes for this query** (it's off by
default; switch it on only where it's useful).

Users who can open that query then see a **Notes** panel under the generator where they can add,
edit, delete and **copy** notes (Ctrl+Enter saves, Escape cancels). Notes are **private to each
user**, limited to 20 per query and 2,000 characters each. Switching notes off later hides the
panel and stops new notes, but doesn't delete what people already wrote.

