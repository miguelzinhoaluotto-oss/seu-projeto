/* =========================================================
   ClapColor 2.0 — Jogo de memória com palmas
   Usa a câmera (preview) e o microfone (detecção de palmas).
   ========================================================= */

/* ---------- Configuração das cores ---------- */
// A legenda usa esta mesma configuração para não divergir das regras.
const COLORS = [
  { key: 'red',    nome: 'Vermelho', cls: 'pad-red',    claps: 1 },
  { key: 'yellow', nome: 'Amarelo',  cls: 'pad-yellow', claps: 2 },
  { key: 'green',  nome: 'Verde',    cls: 'pad-green',  claps: 3 },
  { key: 'blue',   nome: 'Azul',     cls: 'pad-blue',   claps: 4 },
];

/* ---------- Elementos ---------- */
const el = {
  video: document.getElementById('camera'),
  camStatus: document.getElementById('camStatus'),
  clapFlash: document.getElementById('clapFlash'),
  pads: document.getElementById('pads'),
  prompt: document.getElementById('prompt'),
  progressBar: document.getElementById('progressBar'),
  timeBar: document.getElementById('timeBar'),
  timeValue: document.getElementById('timeValue'),
  legend: document.getElementById('legend'),
  level: document.getElementById('level'),
  score: document.getElementById('score'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  sensitivity: document.getElementById('sensitivity'),
  sensValue: document.getElementById('sensValue'),
  meterFill: document.getElementById('meterFill'),
  thresholdLine: document.getElementById('thresholdLine'),
};

/* ---------- Estado do jogo ---------- */
const estado = {
  jogando: false,
  fase: 'idle',        // idle | mostrando | ouvindo | pausa
  sequencia: [],       // índices em COLORS
  passo: 0,            // passo atual da reprodução
  palmasPasso: 0,      // palmas já dadas no passo atual
  nivel: 0,
  pontos: 0,
};

/* ---------- Áudio / Microfone ---------- */
let audioCtx = null;
let analyser = null;
let micStream = null;
let dataArray = null;
let limiar = 35;
let ultimaPalma = 0;

const COOLDOWN_MS = 220;
const PAUSA_PALMAS_MS = 850;
const temporizadores = new Set();
let timerPalmas = null;
let prazoPasso = 0;
let duracaoPasso = 0;

function agendar(callback, atraso) {
  const id = window.setTimeout(() => {
    temporizadores.delete(id);
    callback();
  }, atraso);
  temporizadores.add(id);
  return id;
}

function limparTemporizadores() {
  temporizadores.forEach(id => clearTimeout(id));
  temporizadores.clear();
  timerPalmas = null;
}

/* ---------- Cria os "pads" de cor ---------- */
function criarPads() {
  el.pads.innerHTML = '';

  COLORS.forEach((c, i) => {
    const div = document.createElement('div');

    div.className = `pad ${c.cls}`;
    div.id = `pad-${i}`;

    div.innerHTML = `<span>${c.nome}</span>`;

    el.pads.appendChild(div);
  });

  el.legend.innerHTML = COLORS.map(c =>
    `<span class="legend-item"><span class="legend-dot ${c.cls}" aria-hidden="true"></span>${c.nome}: <strong>${c.claps} ${c.claps === 1 ? 'palma' : 'palmas'}</strong></span>`
  ).join('');
}

function padEl(i) {
  return document.getElementById(`pad-${i}`);
}

/* ---------- Inicializar câmera ---------- */
async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    el.video.srcObject = stream;
    el.camStatus.textContent = 'Câmera ligada';

  } catch (e) {
    el.camStatus.textContent = 'Sem acesso à câmera';
    console.warn('Câmera indisponível:', e);
  }
}

/* ---------- Inicializar microfone ---------- */
async function iniciarMicrofone() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    audioCtx = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    const src = audioCtx.createMediaStreamSource(micStream);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;

    src.connect(analyser);

    dataArray = new Uint8Array(analyser.fftSize);

    el.camStatus.textContent = 'Câmera e microfone ligados';

    loopAudio();

  } catch (e) {
    alert(
      'Não foi possível acessar o microfone. ' +
      'O jogo precisa dele para detectar as palmas.'
    );

    console.warn('Microfone indisponível:', e);
  }
}

/* ---------- Loop de leitura do áudio ---------- */
function loopAudio() {
  requestAnimationFrame(loopAudio);

  if (!analyser) return;

  analyser.getByteTimeDomainData(dataArray);

  // Pico (transiente) — palmas geram picos altos e rápidos
  let pico = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const v = Math.abs(dataArray[i] - 128) / 128;

    if (v > pico) {
      pico = v;
    }
  }

  const nivelPct = Math.min(100, Math.round(pico * 100));

  el.meterFill.style.width = nivelPct + '%';

  if (pico * 100 >= limiar) {
    const agora = performance.now();

    if (agora - ultimaPalma > COOLDOWN_MS) {
      ultimaPalma = agora;
      registrarPalma();
    }
  }
}

function atualizarLimiar() {
  limiar = Number(el.sensitivity.value);

  el.sensValue.textContent = limiar;
  el.thresholdLine.style.left = limiar + '%';
}

/* ---------- Feedback visual de palma ---------- */
function piscarFlash() {
  el.clapFlash.classList.add('active');

  agendar(() => {
    el.clapFlash.classList.remove('active');
  }, 90);
}

/* ---------- Registro de palma ---------- */
function registrarPalma() {
  piscarFlash();

  if (!estado.jogando || estado.fase !== 'ouvindo') {
    return;
  }

  if (performance.now() >= prazoPasso) {
    erro('Tempo esgotado!');
    return;
  }

  const cor = COLORS[estado.sequencia[estado.passo]];
  estado.palmasPasso++;
  atualizarProgresso();

  if (estado.palmasPasso > cor.claps) {
    erro('Palmas demais!');
    return;
  }

  // Só confirma após silêncio: atingir a meta não esconde palmas extras.
  clearTimeout(timerPalmas);
  temporizadores.delete(timerPalmas);
  timerPalmas = agendar(confirmarPalmas, PAUSA_PALMAS_MS);
}

function confirmarPalmas() {
  if (!estado.jogando || estado.fase !== 'ouvindo') return;
  if (performance.now() >= prazoPasso) {
    erro('Tempo esgotado!');
    return;
  }

  const corIndex = estado.sequencia[estado.passo];
  if (estado.palmasPasso !== COLORS[corIndex].claps) {
    erro('Palmas de menos!');
    return;
  }

  limparTemporizadores();
  estado.fase = 'pausa';
  padEl(corIndex).classList.remove('active');
  estado.passo++;
  estado.palmasPasso = 0;
  el.prompt.textContent = '✅ Cor correta! Aguarde a próxima...';

  agendar(() => {
    if (estado.passo >= estado.sequencia.length) {
      completarNivel();
    } else {
      pedirCorAtual();
    }
  }, 450);
}

function atualizarTempo() {
  if (!estado.jogando || estado.fase !== 'ouvindo') return;
  const restante = Math.max(0, prazoPasso - performance.now());
  el.timeBar.style.width = (restante / duracaoPasso * 100) + '%';
  el.timeValue.textContent = (restante / 1000).toFixed(1) + ' s';
  if (restante === 0) {
    erro('Tempo esgotado!');
    return;
  }
  agendar(atualizarTempo, 50);
}

/* ---------- Progresso do passo atual ---------- */
function atualizarProgresso() {
  const corIndex = estado.sequencia[estado.passo];

  if (corIndex === undefined) return;

  const cor = COLORS[corIndex];

  const pct = Math.min(
    100,
    (estado.palmasPasso / cor.claps) * 100
  );

  el.progressBar.style.width = pct + '%';
}

/* ---------- Pedir a cor atual ---------- */
function pedirCorAtual() {
  estado.fase = 'ouvindo';

  const corIndex = estado.sequencia[estado.passo];
  const pad = padEl(corIndex);

  pad.classList.add('active');

  el.prompt.textContent = `Sua vez: ${COLORS[corIndex].nome}. Bata as palmas e faça uma pausa.`;

  // Dificuldade gradual; quatro palmas continuam tendo tempo confortável.
  duracaoPasso = Math.max(3500, 6000 - (estado.nivel - 1) * 250);
  prazoPasso = performance.now() + duracaoPasso;
  atualizarTempo();
  atualizarProgresso();
}

/* ---------- Mostrar a sequência ---------- */
function mostrarSequencia() {
  limparTemporizadores();
  estado.fase = 'mostrando';
  el.timeBar.style.width = '0%';
  el.timeValue.textContent = '—';
  el.clapFlash.classList.remove('active');
  COLORS.forEach((_, i) => padEl(i).classList.remove('active', 'flash', 'pad-error'));

  el.prompt.textContent = 'Observe a sequência...';

  el.startBtn.disabled = true;
  el.stopBtn.disabled = false;

  agendar(() => {

    estado.sequencia.forEach((corIndex, idx) => {

      agendar(() => {

        const pad = padEl(corIndex);

        pad.classList.add('flash');

        agendar(() => {
          pad.classList.remove('flash');
        }, 500);

      }, idx * 650);

    });

    // Ao terminar de mostrar, começa a ouvir as palmas.
    agendar(() => {

      estado.passo = 0;
      estado.palmasPasso = 0;

      el.progressBar.style.width = '0%';

      pedirCorAtual();

    }, estado.sequencia.length * 650 + 600);

  }, 700);
}

/* ---------- Avançar de nível ---------- */
function completarNivel() {
  estado.fase = 'pausa';

  estado.pontos += 10 * estado.sequencia.length;

  el.score.textContent = estado.pontos;

  el.prompt.textContent = '✅ Correto! Próximo nível...';

  agendar(() => {

    estado.nivel++;

    el.level.textContent = estado.nivel;

    adicionarCorAleatoria();

    mostrarSequencia();

  }, 1400);
}

/* ---------- Erro ---------- */
function erro(motivo) {
  limparTemporizadores();
  estado.fase = 'pausa';
  el.clapFlash.classList.remove('active');

  const pad = padEl(
    estado.sequencia[estado.passo]
  );

  pad.classList.remove('active');
  pad.classList.add('pad-error');

  const cor = COLORS[estado.sequencia[estado.passo]];
  el.prompt.textContent = `❌ ${motivo} ${cor.nome}: ${cor.claps} ${cor.claps === 1 ? 'palma' : 'palmas'}; detectadas: ${estado.palmasPasso}. Tente de novo.`;

  agendar(() => {
    pad.classList.remove('pad-error');
  }, 500);

  // Repete o mesmo nível depois de uma pausa.
  agendar(() => {

    if (!estado.jogando) return;

    estado.passo = 0;
    estado.palmasPasso = 0;

    el.progressBar.style.width = '0%';

    mostrarSequencia();

  }, 1600);
}

/* ---------- Adiciona uma cor aleatória ---------- */
function adicionarCorAleatoria() {
  const aleatorio = Math.floor(
    Math.random() * COLORS.length
  );

  estado.sequencia.push(aleatorio);
}

/* ---------- Iniciar jogo ---------- */
function iniciarJogo() {
  limparTemporizadores();
  estado.jogando = true;
  estado.nivel = 1;
  estado.pontos = 0;
  estado.sequencia = [];
  estado.passo = 0;
  estado.palmasPasso = 0;

  el.level.textContent = estado.nivel;
  el.score.textContent = estado.pontos;

  el.startBtn.disabled = true;
  el.stopBtn.disabled = false;

  adicionarCorAleatoria();

  mostrarSequencia();
}

/* ---------- Parar jogo ---------- */
function pararJogo() {
  limparTemporizadores();
  estado.jogando = false;
  estado.fase = 'idle';

  el.startBtn.disabled = false;
  el.stopBtn.disabled = true;

  el.prompt.textContent = 'Jogo parado.';

  el.progressBar.style.width = '0%';
  el.timeBar.style.width = '0%';
  el.timeValue.textContent = '—';
  el.clapFlash.classList.remove('active');

  COLORS.forEach((_, i) => {
    padEl(i)?.classList.remove(
      'active',
      'flash',
      'pad-error'
    );
  });
}

/* ---------- Eventos ---------- */
el.startBtn.addEventListener(
  'click',
  iniciarJogo
);

el.stopBtn.addEventListener(
  'click',
  pararJogo
);

el.sensitivity.addEventListener(
  'input',
  atualizarLimiar
);

/* ---------- Boot ---------- */
async function init() {
  criarPads();
  atualizarLimiar();

  await iniciarCamera();
  await iniciarMicrofone();
}

init();
