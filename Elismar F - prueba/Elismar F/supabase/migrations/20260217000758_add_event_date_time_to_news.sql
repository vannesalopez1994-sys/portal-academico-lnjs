/*
  # Agregar fecha y hora del evento a noticias

  1. Cambios
    - Agregar columna `event_date` para la fecha del evento de la noticia
    - Agregar columna `event_time` para la hora del evento
    - Estos campos son opcionales y permiten especificar cuándo ocurre el evento de la noticia
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news' AND column_name = 'event_date'
  ) THEN
    ALTER TABLE news ADD COLUMN event_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news' AND column_name = 'event_time'
  ) THEN
    ALTER TABLE news ADD COLUMN event_time time;
  END IF;
END $$;