import os
import sqlite3
from backend import create_app
from backend.database import init_db

app = create_app()
init_db(app)

print('ROUTES:')
for rule in sorted(app.url_map.iter_rules(), key=lambda r: str(r)):
    methods = ','.join(sorted(m for m in rule.methods if m not in {'HEAD', 'OPTIONS'}))
    print(f'{methods:12} {rule.rule}')

print('\nDB_URI=' + app.config['SQLALCHEMY_DATABASE_URI'])
db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
print('DB_EXISTS=' + str(os.path.exists(db_path)))
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
print('\nTABLES=' + str(cur.fetchall()))
conn.close()
