import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Facebook,
  Headphones,
  Instagram,
  ListMusic,
  MapPin,
  Menu,
  MessageCircle,
  Mic2,
  Music2,
  Pause,
  Play,
  Radio,
  Send,
  Signal,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Youtube,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Song = {
  id: string;
  position: number;
  title: string;
  artist: string;
  genre: string;
  cover_url: string | null;
  votes: number;
  trend: 'up' | 'down' | 'same';
};

type NewsItem = {
  category: string;
  title: string;
  excerpt: string;
  time: string;
  tone: 'yellow' | 'red' | 'silver';
};

type Program = {
  time: string;
  title: string;
  description: string;
  live?: boolean;
};

const streamUrl = 'https://usa13.fastcast4u.com/proxy/ricardo1975?mp=/1';

const fallbackSongs: Song[] = [
  { id: 'demo-1', position: 1, title: 'Haverá Sinais', artist: 'Jorge & Mateus, Lauana Prado', genre: 'Sertanejo', cover_url: null, votes: 248, trend: 'up' },
  { id: 'demo-2', position: 2, title: 'Dois Tristes', artist: 'Simone Mendes', genre: 'Sertanejo', cover_url: null, votes: 219, trend: 'up' },
  { id: 'demo-3', position: 3, title: 'Descer Pra BC', artist: 'Breno & Matheus, DJ Ari SL', genre: 'Sertanejo universitário', cover_url: null, votes: 197, trend: 'same' },
  { id: 'demo-4', position: 4, title: 'Chitãozinho e Xororó', artist: 'Guilherme & Benuto', genre: 'Modão', cover_url: null, votes: 180, trend: 'down' },
  { id: 'demo-5', position: 5, title: 'Saudade da Minha Vida', artist: 'Gusttavo Lima', genre: 'Sertanejo', cover_url: null, votes: 162, trend: 'up' },
  { id: 'demo-6', position: 6, title: 'Tubarões', artist: 'Diego & Victor Hugo', genre: 'Sertanejo', cover_url: null, votes: 151, trend: 'same' },
  { id: 'demo-7', position: 7, title: 'P do Pecado', artist: 'Menos é Mais, Simone Mendes', genre: 'Pagode', cover_url: null, votes: 138, trend: 'up' },
  { id: 'demo-8', position: 8, title: 'A Noite', artist: 'Gustavo Mioto', genre: 'Pop sertanejo', cover_url: null, votes: 127, trend: 'down' },
  { id: 'demo-9', position: 9, title: 'Evidências', artist: 'Chitãozinho & Xororó', genre: 'Sertanejo raiz', cover_url: null, votes: 118, trend: 'same' },
  { id: 'demo-10', position: 10, title: 'Cheia de Manias', artist: 'Raça Negra', genre: 'Pagode', cover_url: null, votes: 103, trend: 'up' },
];

const newsItems: NewsItem[] = [
  { category: 'Caranaíba', title: 'Caranaíba preserva suas raízes e celebra a força da comunidade', excerpt: 'Histórias, encontros e as pessoas que fazem a cidade seguir em frente.', time: 'Hoje, 09:40', tone: 'yellow' },
  { category: 'Minas Gerais', title: 'Minas vive fim de semana com agenda cultural para toda a família', excerpt: 'Confira os principais destaques e programe o seu passeio.', time: 'Hoje, 08:15', tone: 'red' },
  { category: 'Música', title: 'Os sucessos que estão embalando a semana na Caranaíba', excerpt: 'Do modão aos hits atuais, a trilha sonora do seu dia está aqui.', time: 'Ontem, 18:20', tone: 'silver' },
];

const programs: Program[] = [
  { time: '06:00', title: 'Acorda Caranaíba', description: 'Informação, música e energia para começar bem o dia.', live: true },
  { time: '10:00', title: 'Manhã Sertaneja', description: 'Os clássicos e as novidades que moram no coração.' },
  { time: '14:00', title: 'Tarde da Caranaíba', description: 'Companhia, pedidos e os maiores sucessos da programação.' },
  { time: '18:00', title: 'Conexão Caranaíba', description: 'Notícias da região, participação dos ouvintes e música.' },
];

const musicStyles = [
  { label: 'Sertanejo', detail: 'Do raiz ao universitário', color: 'gold' },
  { label: 'Pagode', detail: 'Alegria que contagia', color: 'red' },
  { label: 'Flashbacks', detail: 'Memórias que cantam', color: 'steel' },
  { label: 'MPB & Hits', detail: 'O melhor de cada geração', color: 'cream' },
];

function getVoterToken(): string {
  const storageKey = 'caranaiba-voter-token';
  const storedToken = window.localStorage.getItem(storageKey);
  if (storedToken) return storedToken;

  const newToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, newToken);
  return newToken;
}

function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const reconnectTimer = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.72);
  const [connectionStatus, setConnectionStatus] = useState('Pronto para ouvir');
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'request' | 'contact' | null>(null);
  const [songs, setSongs] = useState<Song[]>(fallbackSongs);
  const [votedSongs, setVotedSongs] = useState<string[]>([]);
  const [rankingError, setRankingError] = useState('');
  const [voteMessage, setVoteMessage] = useState('');

  const topSongs = useMemo(() => songs.slice(0, 5), [songs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    const handlePlaying = () => {
      setIsPlaying(true);
      setConnectionStatus('No ar agora');
    };
    const handleWaiting = () => setConnectionStatus('Conectando ao sinal...');
    const handleError = () => {
      setIsPlaying(false);
      setConnectionStatus('Sinal instável. Tentando reconectar...');
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = window.setTimeout(() => {
        if (audioRef.current && isPlaying) {
          void audioRef.current.play().catch(() => setConnectionStatus('Toque para reconectar'));
        }
      }, 3500);
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('error', handleError);
    return () => {
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('error', handleError);
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
    };
  }, [isPlaying, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    let isMounted = true;
    const loadSongs = async () => {
      const { data, error } = await supabase
        .from('top10_songs')
        .select('id, position, title, artist, genre, cover_url, votes, trend')
        .order('position', { ascending: true });

      if (!isMounted) return;
      if (error || !data?.length) {
        setRankingError('O ranking ao vivo está temporariamente indisponível.');
        return;
      }
      setSongs(data as Song[]);
    };

    void loadSongs();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Rádio Caranaíba',
      artist: 'A sua rádio, sempre com você!',
      album: 'Ao vivo',
    });
    navigator.mediaSession.setActionHandler('play', () => void playRadio());
    navigator.mediaSession.setActionHandler('pause', () => pauseRadio());
  });

  const playRadio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setConnectionStatus('Conectando ao sinal...');
    try {
      await audio.play();
      setIsPlaying(true);
      setConnectionStatus('No ar agora');
    } catch {
      setIsPlaying(false);
      setConnectionStatus('Toque novamente para ouvir');
    }
  };

  const pauseRadio = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setConnectionStatus('Rádio pausada');
  };

  const handleVote = async (song: Song) => {
    if (song.id.startsWith('demo-') || votedSongs.includes(song.id)) {
      setVoteMessage('Você já votou nesta música.');
      return;
    }

    setVoteMessage('Registrando seu voto...');
    const { data, error } = await supabase.rpc('vote_top10', {
      p_song_id: song.id,
      p_voter_token: getVoterToken(),
    });

    if (error) {
      setVoteMessage('Não foi possível registrar agora. Tente novamente.');
      return;
    }

    if (data === true) {
      setSongs((currentSongs) => currentSongs.map((currentSong) => currentSong.id === song.id ? { ...currentSong, votes: currentSong.votes + 1 } : currentSong));
      setVotedSongs((currentVotes) => [...currentVotes, song.id]);
      setVoteMessage('Voto confirmado. Obrigado por participar.');
      return;
    }

    setVotedSongs((currentVotes) => [...currentVotes, song.id]);
    setVoteMessage('Você já votou nesta música.');
  };

  const closeModal = () => setActiveModal(null);

  return (
    <div className="app-shell">
      <audio ref={audioRef} src={streamUrl} preload="none" />
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Rádio Caranaíba - início">
          <span className="brand-mark"><Radio size={18} strokeWidth={2.5} /></span>
          <span><strong>Rádio</strong> Caranaíba</span>
        </a>
        <nav className={`site-nav ${isMobileMenuOpen ? 'is-open' : ''}`}>
          <a href="#inicio" onClick={() => setIsMobileMenuOpen(false)}>Início</a>
          <a href="#top10" onClick={() => setIsMobileMenuOpen(false)}>Top 10</a>
          <a href="#programacao" onClick={() => setIsMobileMenuOpen(false)}>Programação</a>
          <a href="#noticias" onClick={() => setIsMobileMenuOpen(false)}>Notícias</a>
          <a href="#sobre" onClick={() => setIsMobileMenuOpen(false)}>A rádio</a>
        </nav>
        <div className="header-actions">
          <button className="outline-button header-listen" onClick={() => void playRadio()}>
            <Headphones size={16} /> Ouça agora
          </button>
          <button className="menu-button" onClick={() => setIsMobileMenuOpen((open) => !open)} aria-label="Abrir menu">
            {isMobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero-section content-width" id="inicio">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> A voz de Caranaíba no ar</div>
            <h1>A sua rádio,<br /><em>sempre com você.</em></h1>
            <p className="hero-description">Música, informação e alegria para acompanhar cada momento. Do coração de Minas para todos os lugares.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => void playRadio()}>
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />} {isPlaying ? 'Pausar rádio' : 'Ouça agora'}
              </button>
              <button className="text-button" onClick={() => setActiveModal('request')}>
                <Music2 size={17} /> Peça sua música <ChevronRight size={16} />
              </button>
            </div>
            <div className="hero-note"><Signal size={15} /> Transmissão online 24 horas por dia</div>
          </div>
          <div className="hero-visual">
            <div className="sun-glow" />
            <div className="hero-ring hero-ring-one" />
            <div className="hero-ring hero-ring-two" />
            <div className="hero-equalizer" aria-hidden="true">
              {[16, 30, 46, 24, 58, 38, 72, 48, 28, 62, 40, 20].map((height, index) => <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 0.09}s` }} />)}
            </div>
            <div className="hero-logo-card">
              <img src="/images/Logo_Neon_da_Radio_Caranaiba.webp" alt="Logo Rádio Caranaíba" />
            </div>
            <div className="hero-location"><MapPin size={14} /> Caranaíba, Minas Gerais</div>
          </div>
        </section>

        <section className="live-panel content-width" aria-label="Player da Rádio Caranaíba">
          <div className="live-panel-main">
            <button className={`live-play ${isPlaying ? 'is-playing' : ''}`} onClick={isPlaying ? pauseRadio : () => void playRadio()} aria-label={isPlaying ? 'Pausar rádio' : 'Ouvir rádio'}>
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <div className="live-copy">
              <div className="live-label"><span className="live-dot" /> AO VIVO <span className="live-divider" /> Rádio Caranaíba</div>
              <strong>{isPlaying ? 'A Caranaíba está no ar' : 'Ouça a programação da Caranaíba'}</strong>
              <span>{connectionStatus}</span>
            </div>
            <div className="live-wave" aria-hidden="true">{[18, 32, 44, 25, 50, 36, 60, 28, 46, 20, 38, 26].map((height, index) => <i className={isPlaying ? 'wave-active' : ''} key={index} style={{ height: `${height}px`, animationDelay: `${index * 0.08}s` }} />)}</div>
          </div>
          <div className="live-controls">
            {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
            <button className="expand-button" onClick={() => setIsPlayerExpanded((expanded) => !expanded)} aria-label="Expandir player">{isPlayerExpanded ? <X size={18} /> : <span>Detalhes</span>}</button>
          </div>
          {isPlayerExpanded && <div className="player-details"><span><Activity size={15} /> Sinal digital estável</span><span><Zap size={15} /> Qualidade adaptativa</span><span><Headphones size={15} /> Funciona em segundo plano</span></div>}
        </section>

        <section className="stats-strip content-width">
          <div><span className="stat-number">24<span>h</span></span><span className="stat-label">no ar para você</span></div>
          <div><span className="stat-number">10</span><span className="stat-label">músicas no ranking</span></div>
          <div><span className="stat-number">MG</span><span className="stat-label">de Minas para o mundo</span></div>
          <div><span className="stat-number">1</span><span className="stat-label">rádio no seu coração</span></div>
        </section>

        <section className="section-block content-width" id="top10">
          <div className="section-heading">
            <div><div className="eyebrow">O som que está em alta</div><h2>Top 10 <span>Caranaíba</span></h2></div>
            <div className="heading-side"><span>Vote na sua favorita</span><Trophy size={21} /></div>
          </div>
          <div className="top10-layout">
            <div className="ranking-list">
              {topSongs.map((song) => <div className="ranking-row" key={song.id}>
                <span className="ranking-number">{String(song.position).padStart(2, '0')}</span>
                <div className={`album-art album-art-${song.position % 4}`}>
                  {song.cover_url ? <img src={song.cover_url} alt="" /> : <Music2 size={22} />}
                </div>
                <div className="song-details"><strong>{song.title}</strong><span>{song.artist}</span></div>
                <span className={`trend trend-${song.trend}`}>{song.trend === 'up' ? <ArrowUpRight size={15} /> : song.trend === 'down' ? <ArrowDownRight size={15} /> : <span>—</span>}</span>
                <span className="vote-count">{song.votes}</span>
                <button className={`vote-button ${votedSongs.includes(song.id) ? 'voted' : ''}`} onClick={() => void handleVote(song)}>{votedSongs.includes(song.id) ? 'Votado' : 'Votar'}</button>
              </div>)}
            </div>
            <aside className="ranking-aside">
              <div className="aside-glow" />
              <div className="mini-label"><Sparkles size={14} /> Escolha da semana</div>
              <div className="featured-rank">01</div>
              <h3>{songs[0]?.title}</h3>
              <p>{songs[0]?.artist}</p>
              <div className="featured-progress"><span style={{ width: `${Math.min((songs[0]?.votes ?? 0) / 3, 100)}%` }} /></div>
              <span className="featured-votes">{songs[0]?.votes} votos da audiência</span>
              <button className="aside-button" onClick={() => songs[0] && void handleVote(songs[0])}>{votedSongs.includes(songs[0]?.id ?? '') ? 'Voto confirmado' : 'Votar nesta música'} <ChevronRight size={16} /></button>
            </aside>
          </div>
          {rankingError && <p className="inline-status">{rankingError}</p>}
          {voteMessage && <p className="vote-message">{voteMessage}</p>}
        </section>

        <section className="news-section section-block" id="noticias">
          <div className="content-width">
            <div className="section-heading"><div><div className="eyebrow">Informação que aproxima</div><h2>Giro de <span>notícias</span></h2></div><button className="text-button">Ver todas <ChevronRight size={16} /></button></div>
            <div className="news-grid">{newsItems.map((news) => <article className={`news-card news-${news.tone}`} key={news.title}><div className="news-meta"><span>{news.category}</span><time>{news.time}</time></div><h3>{news.title}</h3><p>{news.excerpt}</p><button className="news-link">Ler destaque <ChevronRight size={15} /></button></article>)}</div>
          </div>
        </section>

        <section className="section-block content-width" id="programacao">
          <div className="section-heading"><div><div className="eyebrow">A companhia certa para cada hora</div><h2>Nossa <span>programação</span></h2></div><div className="date-chip"><CalendarDays size={15} /> Segunda a sexta</div></div>
          <div className="schedule-list">{programs.map((program) => <div className={`schedule-row ${program.live ? 'current-program' : ''}`} key={program.time}><span className="schedule-time">{program.time}</span><div className="schedule-marker"><span /></div><div className="schedule-copy"><div><h3>{program.title}</h3>{program.live && <span className="on-air-tag">No ar agora</span>}</div><p>{program.description}</p></div><Clock3 size={17} className="schedule-clock" /></div>)}</div>
        </section>

        <section className="styles-section section-block" id="estilos">
          <div className="content-width"><div className="styles-intro"><div><div className="eyebrow">Uma rádio, muitas histórias</div><h2>Toca na <span>Caranaíba</span></h2></div><p>Tem música para toda fase, todo gosto e todo momento. A trilha sonora de Minas vive aqui.</p></div><div className="styles-grid">{musicStyles.map((style, index) => <div className={`style-card style-${style.color}`} key={style.label}><span className="style-index">0{index + 1}</span><div className="style-icon">{index === 0 ? <Mic2 size={21} /> : index === 1 ? <Music2 size={21} /> : index === 2 ? <Headphones size={21} /> : <ListMusic size={21} />}</div><h3>{style.label}</h3><p>{style.detail}</p><ChevronRight className="style-arrow" size={18} /></div>)}</div></div>
        </section>

        <section className="about-section content-width" id="sobre">
          <div className="about-emblem"><div className="emblem-ring"><Radio size={31} /></div><span>Desde<br /><strong>Caranaíba</strong></span></div>
          <div className="about-copy"><div className="eyebrow">Muito mais que uma frequência</div><h2>Feita de gente,<br /><span>feita de história.</span></h2><p>A Rádio Caranaíba nasceu para estar perto. Celebramos a cultura, as vozes e as histórias de Nossa Senhora da Glória e de toda a nossa região.</p><button className="text-button" onClick={() => setActiveModal('contact')}>Fale com a rádio <ChevronRight size={16} /></button></div>
          <div className="about-quote"><span className="quote-mark">“</span><p>A sua rádio, sempre com você!</p><span className="quote-line" /></div>
        </section>

        <section className="contact-banner content-width">
          <div><div className="eyebrow">A rádio quer ouvir você</div><h2>Tem um pedido,<br /><span>recado ou história?</span></h2></div>
          <div className="contact-actions"><button className="primary-button" onClick={() => setActiveModal('request')}><Music2 size={17} /> Peça sua música</button><button className="outline-button light-button" onClick={() => setActiveModal('contact')}><MessageCircle size={17} /> Fale com a rádio</button></div>
        </section>
      </main>

      <footer className="site-footer"><div className="content-width footer-content"><div className="brand footer-brand"><span className="brand-mark"><Radio size={18} /></span><span><strong>Rádio</strong> Caranaíba</span></div><p>Caranaíba, Minas Gerais · Música, informação e alegria.</p><div className="social-links"><button aria-label="Instagram"><Instagram size={17} /></button><button aria-label="Facebook"><Facebook size={17} /></button><button aria-label="YouTube"><Youtube size={18} /></button></div></div></footer>

      <div className="persistent-player"><div className="persistent-info"><span className="mini-live-dot" /><span><strong>{isPlaying ? 'Rádio Caranaíba' : 'Ouça a Caranaíba'}</strong><small>{isPlaying ? 'Ao vivo agora' : 'Clique para começar'}</small></span></div><div className="persistent-wave">{[12, 22, 16, 28, 19, 30, 15].map((height, index) => <i className={isPlaying ? 'wave-active' : ''} key={index} style={{ height: `${height}px`, animationDelay: `${index * 0.1}s` }} />)}</div><button className="persistent-play" onClick={isPlaying ? pauseRadio : () => void playRadio()} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}>{isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button></div>

      {activeModal && <div className="modal-backdrop" role="presentation" onClick={closeModal}><div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={closeModal} aria-label="Fechar"><X size={19} /></button>{activeModal === 'request' ? <><div className="modal-icon"><Music2 size={21} /></div><div className="eyebrow">Mande seu pedido</div><h2>Qual música você quer ouvir?</h2><p>Envie sua sugestão para a equipe da Caranaíba. Ela pode aparecer na próxima programação.</p><label>Seu nome<input placeholder="Como podemos te chamar?" /></label><label>Música e artista<input placeholder="Ex.: Evidências — Chitãozinho & Xororó" /></label><button className="primary-button full-button" onClick={closeModal}><Send size={17} /> Enviar pedido</button></> : <><div className="modal-icon"><MessageCircle size={21} /></div><div className="eyebrow">Fale com a Caranaíba</div><h2>Estamos aqui para ouvir você.</h2><p>Use este espaço para mandar um recado, contar sua história ou falar sobre uma parceria.</p><label>Seu nome<input placeholder="Como podemos te chamar?" /></label><label>Seu recado<textarea placeholder="Escreva sua mensagem..." rows={4} /></label><button className="primary-button full-button" onClick={closeModal}><Send size={17} /> Enviar mensagem</button></>}</div></div>}
    </div>
  );
}

export default App;
