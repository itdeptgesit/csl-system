-- Migration: Menambahkan kolom group_company ke tabel companies
-- Kategori resmi: Holding, GNR, Property, Trading, Manufacture, Offshore, Public, Personal, Foundation

ALTER TABLE IF EXISTS public.companies 
ADD COLUMN IF NOT EXISTS group_company VARCHAR(100) DEFAULT 'Holding';

-- Perbarui kategori grup untuk data yang sudah ada berdasarkan 9 kategori resmi
UPDATE public.companies SET group_company = 'Public' 
WHERE name ILIKE '%tbk%' OR name ILIKE '%alakasa industrindo%';

UPDATE public.companies SET group_company = 'Offshore' 
WHERE name ILIKE '%limited%' OR name ILIKE '%investment one%' OR name ILIKE '%das development%' OR code ILIKE '%OFFSHORE%';

UPDATE public.companies SET group_company = 'Foundation' 
WHERE name ILIKE '%peduli bangsa%' OR name ILIKE '%yayasan%';

UPDATE public.companies SET group_company = 'Manufacture' 
WHERE name ILIKE '%extrusindo%' OR name ILIKE '%alumas%' OR name ILIKE '%grafika jaya%' OR name ILIKE '%industri terpadu%';

UPDATE public.companies SET group_company = 'Trading' 
WHERE name ILIKE '%intrade%' OR name ILIKE '%niaga%' OR name ILIKE '%perdagangan%' OR name ILIKE '%trading%';

UPDATE public.companies SET group_company = 'Property' 
WHERE name ILIKE '%graha%' OR name ILIKE '%propert%' OR name ILIKE '%sudirman perkasa%' OR name ILIKE '%sudirman mandiri%' OR name ILIKE '%bahana cipta%';

UPDATE public.companies SET group_company = 'GNR' 
WHERE name ILIKE '%energi%' OR name ILIKE '%mineral%' OR name ILIKE '%alumina%' OR name ILIKE '%bauksit%' OR name ILIKE '%batu mulia%' OR name ILIKE '%sejahtera mandiri%' OR name ILIKE '%gnr%';

UPDATE public.companies SET group_company = 'Holding' 
WHERE group_company IS NULL OR name ILIKE '%holding%' OR name ILIKE '%bumi persada%' OR name ILIKE '%gesit%';
