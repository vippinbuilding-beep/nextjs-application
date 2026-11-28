-- Aceite da declaração de conteúdo (DC-e) por envio: data/hora e versão do
-- texto que o criador confirmou em "Preparar envio". Escrita só pelo servidor.

alter table public.shipments
  add column if not exists dce_accepted_at         timestamptz,
  add column if not exists dce_declaration_version text;

-- Envios antigos com DC-e (antes do aceite ser persistido) ficam marcados como
-- 'legacy': sem isso qualquer update neles (sync de rastreio) violaria o CHECK.
update public.shipments
   set dce_accepted_at = coalesce(purchased_at, created_at),
       dce_declaration_version = 'legacy'
 where document_type = 'dce' and dce_accepted_at is null;

alter table public.shipments
  drop constraint if exists shipments_dce_acceptance_valid;
alter table public.shipments
  add constraint shipments_dce_acceptance_valid
  check (
    document_type is distinct from 'dce'
    or (dce_accepted_at is not null and dce_declaration_version is not null)
  );

notify pgrst, 'reload schema';
