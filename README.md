# warehouse_app

Simple SQLite starter files for a sports warehouse inventory project.

Files:
- `db/schema.sql`: table definitions and indexes
- `db/seed.sql`: sample sports inventory data
- `db/warehouse.db`: generated SQLite database

The database uses a single `products` table with an auto-incrementing `id` and these core columns:
- `sports`
- `category`
- `quantity`

Rebuild the database:

```bash
sqlite3 db/warehouse.db < db/schema.sql
sqlite3 db/warehouse.db < db/seed.sql
```