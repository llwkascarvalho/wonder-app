-- Permite que usuarios Google diferentes tenham o mesmo nome de exibicao.
-- A identidade de login continua sendo o email, que permanece unico.

ALTER TABLE customuser DROP CONSTRAINT IF EXISTS customuser_username_key;
DROP INDEX IF EXISTS customuser_username_key;
