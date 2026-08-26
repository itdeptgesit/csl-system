-- Cek semua tabel CSL di semua schema
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'csl%' 
ORDER BY table_schema, table_name;
