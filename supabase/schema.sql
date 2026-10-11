-- MS Quistões: esquema inicial do backend
-- Executar no SQL Editor do projeto Supabase.

create table if not exists public.ms_challenges (
  challenge_date date primary key,
  title text not null,
  prompt text not null,
  timezone text not null
);

create table if not exists public.ms_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null references public.ms_challenges(challenge_date),
  participant text not null check (participant in ('sandro','marta')),
  storage_path text not null,
  photo_name text,
  score integer not null check (score in (0,1,3)),
  evaluation text not null,
  created_at timestamptz not null default now(),
  unique (challenge_date, participant)
);

alter table public.ms_challenges enable row level security;
alter table public.ms_submissions enable row level security;
-- Sem políticas públicas: apenas a Edge Function com service_role pode ler/escrever.

insert into public.ms_challenges (challenge_date,title,prompt,timezone) values
('2026-10-23','Uma cor, três detalhes','Encontrem e fotografem três detalhes da mesma cor durante o dia. A imagem deve mostrar os três detalhes, juntos ou numa colagem.','Asia/Ashgabat'),
('2026-10-24','Simetria','Fotografem uma fachada ou monumento com uma composição tão simétrica quanto possível.','Asia/Ashgabat'),
('2026-10-25','Escala gigante','Façam uma fotografia que mostre a escala impressionante da paisagem, usando uma pessoa como referência, sem se aproximarem de zonas perigosas.','Asia/Ashgabat'),
('2026-10-26','Texturas antigas','Encontrem e fotografem três texturas diferentes num local histórico, sem tocar nem subir às estruturas.','Asia/Ashgabat'),
('2026-10-27','Reflexos','Criem uma fotografia em que um reflexo seja parte importante da composição.','Asia/Ashgabat'),
('2026-10-28','Luz e fogo','Em Darvaza, façam uma fotografia em que a luz da cratera seja o elemento principal. Fiquem sempre à distância de segurança indicada pelo guia.','Asia/Ashgabat'),
('2026-10-29','O mesmo lugar, outra luz','Fotografem Darvaza à luz do dia, mostrando a cratera e a paisagem envolvente. É o mesmo local da noite anterior.','Asia/Ashgabat'),
('2026-10-30','Uma porta para outra época','Escolham uma porta ou arco em Khiva e façam uma fotografia com profundidade, enquadrando algo através dele.','Asia/Tashkent'),
('2026-10-31','Azul em destaque','Em Samarcanda, fotografem um detalhe azul de azulejaria que se destaque claramente na imagem.','Asia/Tashkent'),
('2026-11-01','Vida quotidiana','Fotografem uma cena de vida quotidiana num espaço público, sem identificar pessoas sem consentimento.','Asia/Tashkent'),
('2026-11-02','A viagem em movimento','Façam uma fotografia que transmita movimento ou a sensação de estar a chegar a um novo país.','Asia/Bishkek'),
('2026-11-03','Companheiro de quatro patas','Fotografem um cavalo na paisagem, mantendo distância segura e sem perturbar o animal.','Asia/Bishkek'),
('2026-11-04','Casa na paisagem','Fotografem uma iurta com a paisagem envolvente, de modo a mostrar a relação entre a habitação e o local.','Asia/Bishkek'),
('2026-11-05','Linhas naturais','Procurem linhas na paisagem que conduzam o olhar para um ponto principal.','Asia/Bishkek'),
('2026-11-06','Um detalhe de Bisqueque','Fotografem um detalhe urbano que represente a vossa experiência na cidade, sem depender de uma fotografia turística óbvia.','Asia/Bishkek'),
('2026-11-07','A imagem final','Escolham uma fotografia que resuma a viagem e expliquem, em poucas palavras, por que razão a escolheram.','Asia/Bishkek')
on conflict (challenge_date) do nothing;
