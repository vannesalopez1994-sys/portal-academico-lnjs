-- Consultar estructura de tablas y sus relaciones para el UML
SELECT 
    cols.table_name, 
    cols.column_name, 
    cols.data_type, 
    cols.is_nullable,
    kcu.table_name AS foreign_table,
    kcu.column_name AS foreign_column
FROM 
    information_schema.columns cols
LEFT JOIN 
    information_schema.key_column_usage kcu 
    ON cols.table_name = kcu.table_name 
    AND cols.column_name = kcu.column_name
    AND cols.table_schema = kcu.table_schema
WHERE 
    cols.table_schema = 'public'
ORDER BY 
    cols.table_name, cols.ordinal_position;
    