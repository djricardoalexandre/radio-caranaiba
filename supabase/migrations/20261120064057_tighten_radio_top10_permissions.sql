/*
# Restringir escrita direta no ranking público

1. Alterações
- A tabela `top10_songs` continua disponível para leitura pública.
- As permissões de INSERT, UPDATE e DELETE são removidas dos papéis `anon` e `authenticated`.

2. Segurança
- A única alteração pública permitida é a votação através da função `vote_top10`.
- A atualização da contagem continua acontecendo de forma atômica no banco, sem permitir que o navegador altere posição, artista, votos ou status da música.
- A política de leitura ativa permanece inalterada.
*/

REVOKE INSERT, UPDATE, DELETE ON public.top10_songs FROM anon, authenticated;
GRANT SELECT ON public.top10_songs TO anon, authenticated;