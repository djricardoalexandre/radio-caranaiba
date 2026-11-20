/*
# Criar ranking público e votação da Rádio Caranaíba

1. Novas tabelas
- `top10_songs`: músicas exibidas no ranking, com posição, artista, capa, estilo, votos e tendência.
- `top10_vote_receipts`: recibos técnicos que impedem o mesmo visitante de votar novamente na mesma música.

2. Segurança e acesso
- RLS é ativado nas duas tabelas.
- O ranking fica disponível para leitura pública, pois é conteúdo editorial compartilhado.
- Os recibos de voto não ficam disponíveis para leitura ou gravação direta pelo navegador.
- A função pública `vote_top10` valida a música, registra o voto uma única vez por sessão e incrementa a contagem de forma atômica.
- A função usa `search_path` fixo e não aceita identificadores de usuário fornecidos pelo navegador.

3. Dados iniciais
- Dez músicas populares são cadastradas para que o ranking tenha conteúdo desde o primeiro acesso.
- As capas usam imagens remotas públicas de álbum para manter o visual editorial até a curadoria definitiva da rádio.

4. Observações
- A proteção contra repetição é básica e baseada no identificador persistido no navegador, adequada para uma votação pública inicial.
- O painel administrativo autenticado pode ser adicionado depois sem alterar a experiência pública atual.
*/

CREATE TABLE IF NOT EXISTS public.top10_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL UNIQUE CHECK (position BETWEEN 1 AND 10),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  artist text NOT NULL CHECK (char_length(artist) BETWEEN 1 AND 160),
  genre text NOT NULL DEFAULT 'Sertanejo',
  cover_url text,
  votes integer NOT NULL DEFAULT 0 CHECK (votes >= 0),
  trend text NOT NULL DEFAULT 'same' CHECK (trend IN ('up', 'down', 'same')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.top10_vote_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES public.top10_songs(id) ON DELETE CASCADE,
  voter_token text NOT NULL CHECK (char_length(voter_token) BETWEEN 16 AND 128),
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (song_id, voter_token)
);

CREATE INDEX IF NOT EXISTS top10_songs_position_idx ON public.top10_songs (position);
CREATE INDEX IF NOT EXISTS top10_vote_receipts_token_idx ON public.top10_vote_receipts (voter_token);

ALTER TABLE public.top10_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top10_vote_receipts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.top10_songs TO anon, authenticated;
REVOKE ALL ON public.top10_vote_receipts FROM anon, authenticated;

DROP POLICY IF EXISTS "Public can read active ranking" ON public.top10_songs;
CREATE POLICY "Public can read active ranking"
  ON public.top10_songs
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Public cannot write ranking" ON public.top10_songs;

CREATE OR REPLACE FUNCTION public.vote_top10(p_song_id uuid, p_voter_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF p_voter_token IS NULL OR char_length(p_voter_token) < 16 OR char_length(p_voter_token) > 128 THEN
    RAISE EXCEPTION 'Invalid voter token';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.top10_songs
    WHERE id = p_song_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Song is not available';
  END IF;

  INSERT INTO public.top10_vote_receipts (song_id, voter_token)
  VALUES (p_song_id, p_voter_token)
  ON CONFLICT (song_id, voter_token) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.top10_songs
  SET votes = votes + 1
  WHERE id = p_song_id AND is_active = true;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vote_top10(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vote_top10(uuid, text) TO anon, authenticated;

INSERT INTO public.top10_songs (position, title, artist, genre, cover_url, votes, trend)
VALUES
  (1, 'Haverá Sinais', 'Jorge & Mateus, Lauana Prado', 'Sertanejo', 'https://images.pexels.com/photos/1671325/pexels-photo-1671325.jpeg?auto=compress&cs=tinysrgb&w=600', 248, 'up'),
  (2, 'Dois Tristes', 'Simone Mendes', 'Sertanejo', 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600', 219, 'up'),
  (3, 'Descer Pra BC', 'Breno & Matheus, DJ Ari SL', 'Sertanejo universitário', 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=600', 197, 'same'),
  (4, 'Chitãozinho e Xororó', 'Guilherme & Benuto', 'Modão', 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600', 180, 'down'),
  (5, 'Saudade da Minha Vida', 'Gusttavo Lima', 'Sertanejo', 'https://images.pexels.com/photos/1190296/pexels-photo-1190296.jpeg?auto=compress&cs=tinysrgb&w=600', 162, 'up'),
  (6, 'Tubarões', 'Diego & Victor Hugo', 'Sertanejo', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600', 151, 'same'),
  (7, 'P do Pecado', 'Menos é Mais, Simone Mendes', 'Pagode', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=600', 138, 'up'),
  (8, 'A Noite', 'Gustavo Mioto', 'Pop sertanejo', 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=600', 127, 'down'),
  (9, 'Evidências', 'Chitãozinho & Xororó', 'Sertanejo raiz', 'https://images.pexels.com/photos/164829/pexels-photo-164829.jpeg?auto=compress&cs=tinysrgb&w=600', 118, 'same'),
  (10, 'Cheia de Manias', 'Raça Negra', 'Pagode', 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600', 103, 'up')
ON CONFLICT (position) DO NOTHING;