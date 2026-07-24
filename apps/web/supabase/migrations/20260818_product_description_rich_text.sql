-- A descrição do produto passou a ser texto rico (HTML gerado pelo editor).
-- O limite visto pelo criador continua sendo 5000 caracteres *visíveis*, mas o
-- valor guardado carrega a marcação (<p>, <strong>, <a href="...">...), então o
-- CHECK precisa de folga para não recusar descrições válidas.
--
-- 20000 dá ~4x de espaço para marcação sobre o limite de texto e continua sendo
-- um teto rígido contra abuso — a validação real do conteúdo (quais tags são
-- aceitas) acontece na sanitização, na hora de renderizar.

alter table public.products
  drop constraint if exists products_description_len;

alter table public.products
  add constraint products_description_len
  check (description is null or char_length(description) <= 20000);
