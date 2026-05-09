const state = {
  mode: 'html',
  baseUrl: '',
  count: 2,
  htmlPageUrl: '',
  htmlImages: [],
  htmlOffset: 0,
};


const form = document.getElementById('urlForm');
const baseUrlInput = document.getElementById('baseUrl');
const imageCountInput = document.getElementById('imageCount');
const viewer = document.getElementById('viewer');
const message = document.getElementById('message');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const urlTagsSection = document.getElementById('urlTagsSection');
const urlTagChips = document.getElementById('urlTagChips');
const urlTagInput = document.getElementById('urlTagInput');
const urlTagDatalist = document.getElementById('url-tags-datalist');
const urlTagAddBtn = document.getElementById('urlTagAddBtn');

// --- Utilities ---

function clampCount(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(100, Math.max(1, n)) : 1;
}

function changeLastNumber(url, delta) {
  return url.replace(/(\d+)(?!.*\d)/, (m) =>
    String(Math.max(0, Number(m) + delta)).padStart(m.length, '0')
  );
}

function hasTrailingNumber(url) {
  return /\d+(?!\d)/.test(url);
}

function changeLastNumericPathSegment(url, delta) {
  const matches = [...url.matchAll(/\/(\d+)(?=\/)/g)];
  const last = matches[matches.length - 1];
  if (!last) return url;
  const v = last[1];
  const start = last.index + 1;
  const next = Math.max(0, Number(v) + delta);
  return url.slice(0, start) + String(next).padStart(v.length, '0') + url.slice(start + v.length);
}

function hasNumericPathSegment(url) {
  return /\/\d+\//.test(url);
}

// --- API ---

async function apiFetchImages(pageUrl) {
  const res = await fetch('api.php?action=fetch_images&url=' + encodeURIComponent(pageUrl));
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.images ?? [];
}

async function apiGetTags(imageUrl) {
  const res = await fetch('api.php?action=get_tags&url=' + encodeURIComponent(imageUrl));
  return (await res.json()).tags ?? [];
}

async function apiAllTags() {
  const res = await fetch('api.php?action=all_tags');
  return (await res.json()).tags ?? [];
}

async function apiAddTag(imageUrl, tag) {
  await fetch('api.php?action=add_tag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl, tag }),
  });
}

async function apiRemoveTag(imageUrl, tag) {
  await fetch('api.php?action=remove_tag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl, tag }),
  });
}

// --- URL tag section ---

function currentTagUrl() {
  return state.mode === 'html' ? state.htmlPageUrl : state.baseUrl;
}

async function refreshUrlTagChips() {
  const url = currentTagUrl();
  if (!url) { urlTagChips.replaceChildren(); return; }
  const tags = await apiGetTags(url);
  urlTagChips.replaceChildren();
  for (const tag of tags) {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    const label = document.createElement('span');
    label.textContent = tag;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tag-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', async () => {
      await apiRemoveTag(url, tag);
      refreshUrlTagChips();
    });
    chip.append(label, removeBtn);
    urlTagChips.append(chip);
  }
}

async function refreshUrlTagDatalist() {
  const tags = await apiAllTags();
  urlTagDatalist.replaceChildren();
  for (const t of tags) {
    const opt = document.createElement('option');
    opt.value = t;
    urlTagDatalist.append(opt);
  }
}

async function doAddUrlTag() {
  const tag = urlTagInput.value.trim();
  const url = currentTagUrl();
  if (!tag || !url) return;
  await apiAddTag(url, tag);
  urlTagInput.value = '';
  refreshUrlTagChips();
  refreshUrlTagDatalist();
}

function showUrlTagSection(visible) {
  urlTagsSection.hidden = !visible;
  if (visible) refreshUrlTagChips();
}

urlTagAddBtn.addEventListener('click', doAddUrlTag);
urlTagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); doAddUrlTag(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation();
});
urlTagInput.addEventListener('focus', refreshUrlTagDatalist);

// --- Pane ---

function createPane(url, index) {
  const pane = document.createElement('article');
  pane.className = 'pane';

  const title = document.createElement('div');
  title.className = 'pane-title';

  const label = document.createElement('span');
  // label.textContent = `画像 ${index + 1}`;

  const urlText = document.createElement('span');
  urlText.className = 'url-text';
  urlText.textContent = url;
  urlText.title = url;

  const stage = document.createElement('div');
  stage.className = 'image-stage';

  const image = document.createElement('img');
  // image.alt = `画像 ${index + 1}`;
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

// --- Render ---

function currentUrls() {
  if (state.mode === 'html') {
    return state.htmlImages.slice(state.htmlOffset, state.htmlOffset + state.count);
  }
  if (!state.baseUrl) return [];
  return Array.from({ length: state.count }, (_, i) => {
    if (!hasTrailingNumber(state.baseUrl)) return state.baseUrl;
    return changeLastNumber(state.baseUrl, i);
  }).reverse();
}

function createDonePane() {
  const pane = document.createElement('article');
  pane.className = 'pane pane-done';
  const msg = document.createElement('div');
  msg.className = 'done-msg';
  msg.textContent = '完了';
  pane.append(msg);
  return pane;
}

function renderAll() {
  const urls = currentUrls();
  viewer.replaceChildren();

  if (urls.length === 0 && state.mode === 'html' && state.htmlImages.length > 0) {
    // 全画像表示済み
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '全ての画像を表示しました';
    viewer.append(empty);
  } else if (urls.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = state.mode === 'html'
      ? 'URLを入力して表示ボタンを押してください'
      : 'URLを入力してください';
    viewer.append(empty);
  } else {
    urls.forEach((url, i) => viewer.append(createPane(url, i)));
    // 残り枚数が count に満たない場合、空きスロットに「完了」を表示
    if (state.mode === 'html') {
      const shortage = state.count - urls.length;
      for (let i = 0; i < shortage; i++) viewer.append(createDonePane());
    }
  }

  updateMessage();
}

function updateMessage() {
  if (state.mode === 'html') {
    const total = state.htmlImages.length;
    if (total === 0) {
      message.textContent = 'HTMLページから画像を読み込んでください。';
    } else {
      const from = state.htmlOffset + 1;
      const to = Math.min(state.htmlOffset + state.count, total);
      message.textContent = `${from}〜${to} / ${total}枚　← 次へ（番号大）　→ 前へ（番号小）`;
    }
  } else {
    if (!state.baseUrl) {
      message.textContent = '左キーで増加、右キーで減少します。増減量は表示枚数と同じです。';
    } else if (!hasTrailingNumber(state.baseUrl)) {
      message.textContent = 'URL内に変更できる数字がないため、自動インクリメントできません。';
    } else {
      message.textContent = `左キーで +${state.count}、右キーで -${state.count} します。`;
    }
  }
}

function setLoading() {
  viewer.replaceChildren();
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.textContent = '読み込み中...';
  viewer.append(empty);
  message.textContent = '読み込み中...';
}

// --- Load ---

async function loadHtmlMode() {
  const pageUrl = baseUrlInput.value.trim();
  if (!pageUrl) { renderAll(); return; }
  setLoading();
  try {
    state.htmlPageUrl = pageUrl;
    state.htmlOffset = 0;
    state.htmlImages = await apiFetchImages(pageUrl);
    if (state.htmlImages.length === 0) {
      message.textContent = '画像が見つかりませんでした。';
    }
  } catch (e) {
    state.htmlImages = [];
    message.textContent = 'エラー: ' + e.message;
  }
  showUrlTagSection(!!state.htmlPageUrl);
  renderAll();
  updateAddress();
}

// --- Navigation ---

function step(direction) {
  if (state.mode === 'html') {
    state.htmlOffset = Math.max(0, state.htmlOffset + direction * state.count);
    renderAll();
    updateAddress();
  } else {
    if (!state.baseUrl || !hasTrailingNumber(state.baseUrl)) return;
    state.baseUrl = changeLastNumber(state.baseUrl, direction * state.count);
    baseUrlInput.value = state.baseUrl;
    renderAll();
    updateAddress();
  }
}

function stepPathSegment(delta) {
  if (state.mode === 'html') {
    if (!state.htmlPageUrl) return;
    const newUrl = changeLastNumber(state.htmlPageUrl, delta);
    if (newUrl === state.htmlPageUrl) return;
    baseUrlInput.value = newUrl;
    loadHtmlMode();
  } else {
    if (!state.baseUrl || !hasNumericPathSegment(state.baseUrl)) return;
    state.baseUrl = changeLastNumericPathSegment(state.baseUrl, delta);
    baseUrlInput.value = state.baseUrl;
    renderAll();
    updateAddress();
  }
}

// --- Address bar ---

function updateAddress() {
  const params = new URLSearchParams();
  params.set('mode', state.mode);
  const url = state.mode === 'html' ? state.htmlPageUrl : state.baseUrl;
  if (url) params.set('url', url);
  params.set('count', String(state.count));
  history.replaceState(null, '', `${location.pathname}?${params}`);
}

// --- Events ---

form.addEventListener('submit', (e) => {
  e.preventDefault();
  state.count = clampCount(imageCountInput.value);
  imageCountInput.value = String(state.count);
  if (state.mode === 'html') {
    loadHtmlMode();
  } else {
    state.baseUrl = baseUrlInput.value.trim();
    showUrlTagSection(!!state.baseUrl);
    renderAll();
    updateAddress();
  }
});

imageCountInput.addEventListener('change', () => {
  state.count = clampCount(imageCountInput.value);
  imageCountInput.value = String(state.count);
  renderAll();
  updateAddress();
});

modeRadios.forEach((r) => r.addEventListener('change', () => {
  state.mode = r.value;
  baseUrlInput.placeholder = state.mode === 'html'
    ? 'https://example.com/gallery.html'
    : 'https://example.com/image001.jpg';
}));

const toggleTitleButton = document.getElementById('toggleTitleButton');
let titlesVisible = true;
toggleTitleButton.addEventListener('click', () => {
  titlesVisible = !titlesVisible;
  document.getElementById('viewer').classList.toggle('hide-titles', !titlesVisible);
  toggleTitleButton.textContent = titlesVisible ? 'URL非表示' : 'URL表示';
});

document.getElementById('pathPlusButton').addEventListener('click', () => stepPathSegment(-1));
document.getElementById('pathMinusButton').addEventListener('click', () => stepPathSegment(+1));
document.getElementById('prevButton').addEventListener('click', () => step(1));
document.getElementById('nextButton').addEventListener('click', () => step(-1));

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === 'ArrowLeft') step(1);
  if (e.key === 'ArrowRight') step(-1);
  if (e.key === 'ArrowDown') stepPathSegment(1);
  if (e.key === 'ArrowUp') stepPathSegment(-1);
});

// --- Init ---

const params = new URLSearchParams(location.search);
state.mode = params.get('mode') === 'direct' ? 'direct' : 'html';
modeRadios.forEach((r) => { r.checked = r.value === state.mode; });
baseUrlInput.value = params.get('url') || params.get('url1') || '';
baseUrlInput.placeholder = state.mode === 'html'
  ? 'https://example.com/gallery.html'
  : 'https://example.com/image001.jpg';
imageCountInput.value = params.get('count') || '2';
state.count = clampCount(imageCountInput.value);

if (state.mode === 'html' && baseUrlInput.value) {
  loadHtmlMode();
} else if (state.mode === 'direct') {
  state.baseUrl = baseUrlInput.value;
  renderAll();
} else {
  renderAll();
}
