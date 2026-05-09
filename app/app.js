const state = {
  baseUrl: '',
  count: 2
};

const form = document.getElementById('urlForm');
const baseUrlInput = document.getElementById('baseUrl');
const imageCountInput = document.getElementById('imageCount');
const viewer = document.getElementById('viewer');
const message = document.getElementById('message');

function clampCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(100, Math.max(1, parsed));
}

function changeLastNumber(url, delta) {
  return url.replace(/(\d+)(?!.*\d)/, (match) => {
    const next = Math.max(0, Number(match) + delta);
    return String(next).padStart(match.length, '0');
  });
}

function hasChangeableNumber(url) {
  return /\d(?!.*\d)/.test(url);
}

function changeLastNumericPathSegment(url, delta) {
  const matches = Array.from(url.matchAll(/\/(\d+)(?=\/)/g));
  const match = matches[matches.length - 1];
  if (!match) return url;

  const value = match[1];
  const start = match.index + 1;
  const next = Math.max(0, Number(value) + delta);
  return `${url.slice(0, start)}${String(next).padStart(value.length, '0')}${url.slice(start + value.length)}`;
}

function hasChangeableNumericPathSegment(url) {
  return /\/\d+(?=\/)/.test(url);
}

function buildImageUrls() {
  if (!state.baseUrl) return [];

  return Array.from({ length: state.count }, (_, index) => {
    if (!hasChangeableNumber(state.baseUrl)) return state.baseUrl;
    return changeLastNumber(state.baseUrl, index);
  }).reverse();
}

function createPane(url, index) {
  const pane = document.createElement('article');
  pane.className = 'pane';

  const title = document.createElement('div');
  title.className = 'pane-title';

  const label = document.createElement('span');
  label.textContent = `画像 ${index + 1}`;

  const urlText = document.createElement('span');
  urlText.className = 'url-text';
  urlText.textContent = url;
  urlText.title = url;

  const stage = document.createElement('div');
  stage.className = 'image-stage';

  const image = document.createElement('img');
  image.alt = `画像 ${index + 1}`;
  image.src = url;

  const status = document.createElement('div');
  status.className = 'status';

  image.addEventListener('load', () => {
    pane.classList.remove('broken');
    status.textContent = '';
  });

  image.addEventListener('error', () => {
    pane.classList.add('broken');
    status.textContent = `リンク切れ、または画像を読み込めません: ${url}`;
  });

  title.append(label, urlText);
  stage.append(image, status);
  pane.append(title, stage);
  return pane;
}

function renderAll() {
  const urls = buildImageUrls();
  viewer.replaceChildren();

  if (urls.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'URLを入力してください';
    viewer.append(empty);
  } else {
    urls.forEach((url, index) => {
      viewer.append(createPane(url, index));
    });
  }

  if (!state.baseUrl) {
    message.textContent = '左キーで増加、右キーで減少します。増減量は表示枚数と同じです。';
  } else if (!hasChangeableNumber(state.baseUrl)) {
    message.textContent = 'URL内に変更できる数字がないため、自動インクリメントできません。';
  } else {
    message.textContent = `左キーで +${state.count}、右キーで -${state.count} します。`;
  }
}

function loadFromInputs() {
  state.baseUrl = baseUrlInput.value.trim();
  state.count = clampCount(imageCountInput.value);
  imageCountInput.value = String(state.count);
  renderAll();
  updateAddress();
}

function step(direction) {
  if (!state.baseUrl || !hasChangeableNumber(state.baseUrl)) return;
  state.baseUrl = changeLastNumber(state.baseUrl, direction * state.count);
  baseUrlInput.value = state.baseUrl;
  renderAll();
  updateAddress();
}

function stepPathSegment(delta) {
  if (!state.baseUrl || !hasChangeableNumericPathSegment(state.baseUrl)) return;
  state.baseUrl = changeLastNumericPathSegment(state.baseUrl, delta);
  baseUrlInput.value = state.baseUrl;
  renderAll();
  updateAddress();
}


function updateAddress() {
  const params = new URLSearchParams();
  if (state.baseUrl) params.set('url', state.baseUrl);
  params.set('count', String(state.count));
  const nextUrl = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
  history.replaceState(null, '', nextUrl);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  loadFromInputs();
});

imageCountInput.addEventListener('change', loadFromInputs);
document.getElementById('pathPlusButton').addEventListener('click', () => stepPathSegment(-1));
document.getElementById('pathMinusButton').addEventListener('click', () => stepPathSegment(+1));
document.getElementById('prevButton').addEventListener('click', () => step(1));
document.getElementById('nextButton').addEventListener('click', () => step(-1));

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === 'ArrowLeft') step(1);
  if (event.key === 'ArrowRight') step(-1);
  if (event.key === 'ArrowDown') stepPathSegment(1);
  if (event.key === 'ArrowUp') stepPathSegment(-1);
});

const params = new URLSearchParams(location.search);
baseUrlInput.value = params.get('url') || params.get('url1') || '';
imageCountInput.value = params.get('count') || '2';
loadFromInputs();
