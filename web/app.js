'use strict';

const elements = {
  audio: document.querySelector('#audio'),
  fileInput: document.querySelector('#fileInput'),
  folderInput: document.querySelector('#folderInput'),
  dropzone: document.querySelector('#dropzone'),
  searchInput: document.querySelector('#searchInput'),
  playlist: document.querySelector('#playlist'),
  emptyPlaylist: document.querySelector('#emptyPlaylist'),
  folderList: document.querySelector('#folderList'),
  queueList: document.querySelector('#queueList'),
  queueEmpty: document.querySelector('#queueEmpty'),
  clearQueueButton: document.querySelector('#clearQueueButton'),
  creditCount: document.querySelector('#creditCount'),
  queueCount: document.querySelector('#queueCount'),
  coinButton: document.querySelector('#coinButton'),
  fullscreenButton: document.querySelector('#fullscreenButton'),
  operatorButton: document.querySelector('#operatorButton'),
  operatorPanel: document.querySelector('#operatorPanel'),
  rootFolderButton: document.querySelector('#rootFolderButton'),
  rescanButton: document.querySelector('#rescanButton'),
  connectRootButton: document.querySelector('#connectRootButton'),
  fallbackFilesButton: document.querySelector('#fallbackFilesButton'),
  clearLibraryButton: document.querySelector('#clearLibraryButton'),
  storageNote: document.querySelector('#storageNote'),
  rootFolderName: document.querySelector('#rootFolderName'),
  libraryStatus: document.querySelector('#libraryStatus'),
  rootBreadcrumb: document.querySelector('#rootBreadcrumb'),
  breadcrumbCurrent: document.querySelector('#breadcrumbCurrent'),
  trackCount: document.querySelector('#trackCount'),
  libraryBadge: document.querySelector('#libraryBadge'),
  trackTitle: document.querySelector('#nowPlayingHeading'),
  trackArtist: document.querySelector('#trackArtist'),
  coverArt: document.querySelector('#coverArt'),
  coverInitial: document.querySelector('#coverInitial'),
  statusPill: document.querySelector('#statusPill'),
  playerCard: document.querySelector('.player-card'),
  playButton: document.querySelector('#playButton'),
  previousButton: document.querySelector('#previousButton'),
  nextButton: document.querySelector('#nextButton'),
  muteButton: document.querySelector('#muteButton'),
  progressBar: document.querySelector('#progressBar'),
  volumeBar: document.querySelector('#volumeBar'),
  currentTime: document.querySelector('#currentTime'),
  totalTime: document.querySelector('#totalTime'),
  volumeValue: document.querySelector('#volumeValue'),
  footerStatus: document.querySelector('#footerStatus'),
  toast: document.querySelector('#toast')
};

const audio = elements.audio;
const state = {
  tracks: [],
  tree: null,
  rootHandle: null,
  pendingHandle: null,
  rootName: '',
  currentFolderPath: '',
  currentIndex: -1,
  currentPaid: false,
  queue: [],
  history: [],
  credits: 0,
  query: '',
  previousVolume: 0.8,
  toastTimer: null,
  dragDepth: 0,
  persisted: false
};

const audioExtensionPattern = /\.(mp3|m4a|m4b|aac|ogg|oga|opus|wav|flac|webm|aiff?|wma)$/i;
const databaseName = 'jukebox-kiosk-library';
const databaseStore = 'handles';
const rootHandleKey = 'root-directory';

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) {
    return '0:00';
  }
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function parseTrackName(fileName) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '').trim();
  const parts = withoutExtension.match(/^(.{1,80}?)\s+[-–—]\s+(.+)$/);
  if (parts) {
    return { artist: parts[1].trim(), title: parts[2].trim() };
  }
  return { artist: 'Невідомий виконавець', title: withoutExtension || fileName };
}

function isAudioName(name) {
  return audioExtensionPattern.test(name);
}

function createTrackRecord({ name, handle = null, file = null, folderPath = '' }) {
  const parsed = parseTrackName(name);
  return {
    name,
    handle,
    file,
    folderPath,
    url: file ? URL.createObjectURL(file) : null,
    artist: parsed.artist,
    title: parsed.title,
    duration: 0
  };
}

function joinPath(parent, name) {
  return parent ? `${parent}/${name}` : name;
}

function getNode(path) {
  if (!state.tree) {
    return null;
  }
  if (!path) {
    return state.tree;
  }
  let node = state.tree;
  for (const part of path.split('/')) {
    node = node.directories.find((directory) => directory.name === part);
    if (!node) {
      return null;
    }
  }
  return node;
}

function countTracks(node) {
  if (!node) {
    return 0;
  }
  return node.tracks.length + node.directories.reduce((total, directory) => total + countTracks(directory), 0);
}

function flattenTree(node, result = []) {
  if (!node) {
    return result;
  }
  node.tracks.forEach((track) => result.push(track));
  node.directories.forEach((directory) => flattenTree(directory, result));
  return result;
}

function ensureFolder(root, path) {
  if (!path) {
    return root;
  }
  let node = root;
  path.split('/').forEach((part) => {
    let next = node.directories.find((directory) => directory.name === part);
    if (!next) {
      next = { name: part, path: joinPath(node.path, part), handle: null, directories: [], tracks: [] };
      node.directories.push(next);
    }
    node = next;
  });
  return node;
}

function buildFallbackTree(files) {
  const rootName = files[0]?.webkitRelativePath?.split('/')[0] || 'Обрані файли';
  const root = { name: rootName, path: '', handle: null, directories: [], tracks: [] };
  files.forEach((file) => {
    const relativePath = file.webkitRelativePath || file.name;
    const parts = relativePath.split('/');
    const fileName = parts.pop();
    const folderPath = rootName === 'Обрані файли' ? '' : parts.slice(1).join('/');
    const folder = ensureFolder(root, folderPath);
    folder.tracks.push(createTrackRecord({ name: fileName, file, folderPath }));
  });
  return { root, rootName };
}

async function scanDirectory(handle, relativePath = '', depth = 0) {
  const node = { name: handle.name, path: relativePath, handle, directories: [], tracks: [] };
  if (depth > 8) {
    return node;
  }
  const entries = [];
  for await (const entry of handle.values()) {
    entries.push(entry);
  }
  entries.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'directory' ? -1 : 1;
    }
    return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
  });
  for (const entry of entries) {
    if (entry.kind === 'directory') {
      node.directories.push(await scanDirectory(entry, joinPath(relativePath, entry.name), depth + 1));
    } else if (isAudioName(entry.name)) {
      node.tracks.push(createTrackRecord({ name: entry.name, handle: entry, folderPath: relativePath }));
    }
  }
  return node;
}

function setRangeFill(input, percentage) {
  input.style.setProperty('--range-progress', `${Math.max(0, Math.min(100, percentage))}%`);
}

function showToast(message, isError = false) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle('is-error', isError);
  elements.toast.classList.add('is-visible');
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 3400);
}

function setStatus(text, playing = false) {
  elements.statusPill.classList.toggle('is-playing', playing);
  const label = elements.statusPill.lastChild;
  if (label) {
    label.textContent = text;
  }
}

function updateMediaSession(track) {
  if (!('mediaSession' in navigator) || !track || !('MediaMetadata' in window)) {
    return;
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: 'JukeBox Vending Kiosk'
  });
}

function updatePlaybackState() {
  const playing = !audio.paused && !audio.ended && state.currentIndex >= 0;
  elements.playerCard.classList.toggle('is-playing', playing);
  elements.coverArt.classList.toggle('is-playing', playing);
  elements.playButton.setAttribute('aria-label', playing ? 'Пауза' : 'Відтворити');
  elements.playButton.title = playing ? 'Пауза' : 'Відтворити';
  if (playing) {
    setStatus('ВІДТВОРЮЄТЬСЯ', true);
  } else if (state.currentIndex >= 0 && state.currentPaid) {
    setStatus('ПАУЗА');
  } else if (state.credits > 0) {
    setStatus('КРЕДИТ ГОТОВИЙ');
  } else {
    setStatus('ВСТАВТЕ МОНЕТУ');
  }
}

function updateProgress() {
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
  const progress = duration > 0 ? audio.currentTime / duration : 0;
  elements.progressBar.value = Math.round(progress * 1000);
  setRangeFill(elements.progressBar, progress * 100);
  elements.currentTime.textContent = formatTime(audio.currentTime);
  elements.totalTime.textContent = formatTime(duration);
}

function updateVolume() {
  const volume = audio.muted ? 0 : Number(audio.volume);
  const percentage = Math.round(volume * 100);
  elements.volumeBar.value = volume;
  elements.volumeValue.textContent = `${percentage}%`;
  setRangeFill(elements.volumeBar, percentage);
  elements.muteButton.classList.toggle('is-muted', audio.muted || volume === 0);
  elements.muteButton.setAttribute('aria-label', audio.muted ? 'Увімкнути звук' : 'Вимкнути звук');
  try {
    localStorage.setItem('jukebox-volume', String(audio.volume));
  } catch (error) {
    void error;
  }
}

function updateCredits() {
  elements.creditCount.textContent = String(state.credits);
  elements.queueCount.textContent = String(state.queue.length);
  elements.clearQueueButton.disabled = state.queue.length === 0;
}

function updateCounts() {
  const total = state.tracks.length;
  const current = getNode(state.currentFolderPath)?.tracks.length || 0;
  elements.trackCount.textContent = `${current} ${current === 1 ? 'трек' : 'треків'} у теці`;
  elements.libraryBadge.textContent = String(current);
  elements.footerStatus.textContent = total > 0
    ? `${total} треків у бібліотеці • кредитів: ${state.credits}`
    : 'Файли залишаються на вашому пристрої';
}

function updateRootStatus() {
  elements.rootFolderName.textContent = state.rootName || 'Не налаштовано';
  const total = state.tracks.length;
  if (state.pendingHandle && !state.tree) {
    elements.libraryStatus.textContent = 'Натисніть «Підключити збережену теку»';
  } else if (state.tree) {
    elements.libraryStatus.textContent = `${total} ${total === 1 ? 'трек' : 'треків'} • ${state.persisted ? 'коренева теку збережена' : 'вибрано вручну'}`;
  } else {
    elements.libraryStatus.textContent = 'Оберіть теку з музикою';
  }
  elements.storageNote.textContent = state.persisted
    ? 'Коренева теку збережена в цьому браузері. Після перезапуску JukeBox автоматично відновить її; браузер може попросити дозвіл.'
    : 'Для автоматичного відновлення після перезапуску використовуйте кнопку «Налаштувати теку» у режимі оператора.';
}

function renderCurrent() {
  const track = state.tracks[state.currentIndex];
  if (!track) {
    elements.trackTitle.textContent = state.tracks.length > 0 ? 'Оберіть пісню' : 'Бібліотека не налаштована';
    elements.trackArtist.textContent = state.tracks.length > 0 ? 'Вставте монету та оберіть трек' : 'Відкрийте кореневу теку в режимі оператора';
    elements.coverInitial.textContent = 'J';
    elements.coverArt.style.background = '';
    updateMediaSession(null);
    updateProgress();
    return;
  }
  elements.trackTitle.textContent = track.title;
  elements.trackArtist.textContent = track.artist;
  elements.coverInitial.textContent = (track.title || 'J').trim().charAt(0).toUpperCase();
  const hue = (state.currentIndex * 47 + 205) % 360;
  elements.coverArt.style.background = `linear-gradient(145deg, hsla(${hue}, 72%, 68%, 0.82), hsla(${(hue + 58) % 360}, 70%, 48%, 0.52) 52%, rgba(11, 14, 30, 0.94))`;
  updateMediaSession(track);
  updateProgress();
}

function renderFolders() {
  const node = getNode(state.currentFolderPath);
  elements.folderList.replaceChildren();
  if (!node || node.directories.length === 0) {
    elements.folderList.hidden = true;
    return;
  }
  elements.folderList.hidden = false;
  node.directories.forEach((directory) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'folder-chip';
    if (directory.path === state.currentFolderPath) {
      button.classList.add('is-selected');
    }
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"/></svg>';
    const name = document.createElement('span');
    name.textContent = directory.name;
    const count = document.createElement('small');
    count.textContent = String(countTracks(directory));
    button.append(name, count);
    button.addEventListener('click', () => selectFolder(directory.path));
    elements.folderList.append(button);
  });
}

function renderQueue() {
  state.queue = state.queue.filter((index) => Boolean(state.tracks[index]));
  elements.queueList.replaceChildren();
  state.queue.forEach((trackIndex, position) => {
    const track = state.tracks[trackIndex];
    if (!track) {
      return;
    }
    const item = document.createElement('div');
    item.className = 'queue-item';
    const number = document.createElement('span');
    number.className = 'queue-position';
    number.textContent = String(position + 1).padStart(2, '0');
    const copy = document.createElement('div');
    copy.className = 'queue-copy';
    const title = document.createElement('div');
    title.className = 'queue-title';
    title.textContent = track.title;
    const artist = document.createElement('div');
    artist.className = 'queue-artist';
    artist.textContent = track.artist;
    copy.append(title, artist);
    const remove = document.createElement('button');
    remove.className = 'queue-remove';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Прибрати ${track.title} з черги`);
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    remove.addEventListener('click', () => removeFromQueue(position));
    item.append(number, copy, remove);
    elements.queueList.append(item);
  });
  elements.queueEmpty.hidden = state.queue.length > 0;
  updateCredits();
}

function renderPlaylist() {
  const node = getNode(state.currentFolderPath);
  const folderTracks = node ? node.tracks : [];
  const query = state.query.trim().toLocaleLowerCase();
  const visibleTracks = folderTracks
    .map((track) => ({ track, index: state.tracks.indexOf(track) }))
    .filter(({ track }) => {
      if (!query) {
        return true;
      }
      return `${track.title} ${track.artist}`.toLocaleLowerCase().includes(query);
    });

  elements.playlist.replaceChildren();
  visibleTracks.forEach(({ track, index }) => {
    const isCurrent = index === state.currentIndex;
    const isQueued = state.queue.includes(index);
    const item = document.createElement('li');
    item.className = 'playlist-item';
    item.dataset.index = String(index);
    item.tabIndex = 0;
    if (isCurrent) {
      item.classList.add('is-current');
    }
    if (isQueued) {
      item.classList.add('is-queued');
    }
    const number = document.createElement('span');
    number.className = 'track-number';
    number.textContent = isCurrent && !audio.paused ? '▶' : String(index + 1).padStart(2, '0');
    const copy = document.createElement('div');
    copy.className = 'track-copy';
    const title = document.createElement('div');
    title.className = 'track-title';
    title.textContent = track.title;
    const artist = document.createElement('div');
    artist.className = 'track-artist';
    artist.textContent = track.artist;
    copy.append(title, artist);
    const length = document.createElement('span');
    length.className = 'track-length';
    length.textContent = track.duration > 0 ? formatTime(track.duration) : '--:--';
    const actions = document.createElement('div');
    actions.className = 'track-actions';
    const play = document.createElement('button');
    play.className = 'track-action play';
    play.type = 'button';
    play.title = 'Грати зараз';
    play.setAttribute('aria-label', `Грати ${track.title}`);
    play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z"/></svg>';
    const queue = document.createElement('button');
    queue.className = 'track-action queue';
    queue.type = 'button';
    queue.title = 'Додати в чергу';
    queue.setAttribute('aria-label', `Додати ${track.title} в чергу`);
    queue.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    if (isQueued) {
      queue.classList.add('is-queued');
    }
    const remove = document.createElement('button');
    remove.className = 'track-action remove';
    remove.type = 'button';
    remove.title = 'Вилучити';
    remove.setAttribute('aria-label', `Вилучити ${track.title}`);
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    actions.append(play, queue, remove);
    const activate = () => playTrack(index, { autoplay: true });
    item.addEventListener('click', (event) => {
      if (!event.target.closest('button')) {
        activate();
      }
    });
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
    play.addEventListener('click', (event) => {
      event.stopPropagation();
      activate();
    });
    queue.addEventListener('click', (event) => {
      event.stopPropagation();
      enqueueTrack(index);
    });
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      removeTrack(index);
    });
    item.append(number, copy, length, actions);
    elements.playlist.append(item);
  });

  const hasLibrary = state.tracks.length > 0;
  const hasVisibleTracks = visibleTracks.length > 0;
  elements.emptyPlaylist.hidden = hasLibrary && hasVisibleTracks;
  if (hasLibrary && !hasVisibleTracks) {
    elements.emptyPlaylist.querySelector('strong').textContent = 'У цій теці нічого немає';
    elements.emptyPlaylist.querySelector('span:last-child').textContent = 'Перейди до іншої папки або додай файли';
  } else if (hasLibrary) {
    elements.emptyPlaylist.querySelector('strong').textContent = 'У цій теці немає пісень';
    elements.emptyPlaylist.querySelector('span:last-child').textContent = 'Оберіть іншу папку у кореневій теці';
  } else {
    elements.emptyPlaylist.querySelector('strong').textContent = 'Бібліотека не налаштована';
    elements.emptyPlaylist.querySelector('span:last-child').textContent = 'Відкрийте налаштування оператора та оберіть кореневу теку';
  }
}

function renderAll() {
  updateCredits();
  updateCounts();
  updateRootStatus();
  renderCurrent();
  renderFolders();
  renderQueue();
  renderPlaylist();
  updatePlaybackState();
}

function revokeTrack(track) {
  if (track?.url) {
    URL.revokeObjectURL(track.url);
    track.url = null;
  }
}

function clearCurrentAudio() {
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  state.currentIndex = -1;
  state.currentPaid = false;
  state.history = [];
}

function setLibrary({ tree, rootName, rootHandle = null, persisted = false }) {
  state.tracks.forEach(revokeTrack);
  state.credits += state.queue.length;
  state.tree = tree;
  state.rootName = rootName;
  state.rootHandle = rootHandle;
  state.pendingHandle = null;
  state.persisted = persisted;
  state.tracks = flattenTree(tree);
  state.currentFolderPath = '';
  clearCurrentAudio();
  state.queue = [];
  renderAll();
}

function selectFolder(path) {
  if (!getNode(path)) {
    return;
  }
  state.currentFolderPath = path;
  state.query = '';
  elements.searchInput.value = '';
  renderFolders();
  renderPlaylist();
  updateCounts();
}

function consumeCredit() {
  if (state.credits < 1) {
    showToast('Немає кредитів. Вставте монету.', true);
    elements.coinButton.classList.remove('is-inserting');
    void elements.coinButton.offsetWidth;
    elements.coinButton.classList.add('is-inserting');
    return false;
  }
  state.credits -= 1;
  updateCredits();
  return true;
}

function insertCoin() {
  state.credits += 1;
  updateCredits();
  elements.coinButton.classList.remove('is-inserting');
  void elements.coinButton.offsetWidth;
  elements.coinButton.classList.add('is-inserting');
  showToast('Монета прийнята • кредит додано');
  updatePlaybackState();
}

async function ensureTrackFile(track) {
  if (!track.file && track.handle) {
    track.file = await track.handle.getFile();
  }
  if (!track.url && track.file) {
    track.url = URL.createObjectURL(track.file);
  }
}

async function playAudio() {
  if (state.currentIndex < 0) {
    showToast('Спочатку оберіть пісню.', true);
    return;
  }
  if (!state.currentPaid && !consumeCredit()) {
    return;
  }
  state.currentPaid = true;
  const track = state.tracks[state.currentIndex];
  try {
    await ensureTrackFile(track);
  } catch (error) {
    showToast('Не вдалося прочитати файл.', true);
    return;
  }
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => showToast('Браузер не дозволив відтворення. Натисніть play ще раз.', true));
  }
  updatePlaybackState();
}

async function playTrack(index, options = {}) {
  const track = state.tracks[index];
  if (!track) {
    return;
  }
  const autoplay = options.autoplay !== false;
  const paid = options.paid === true;
  if (autoplay && !paid && !consumeCredit()) {
    return;
  }
  if (state.currentIndex >= 0 && state.currentIndex !== index) {
    state.history.push(state.currentIndex);
    if (state.history.length > 30) {
      state.history.shift();
    }
  }
  state.currentIndex = index;
  state.currentPaid = paid || autoplay;
  audio.pause();
  try {
    await ensureTrackFile(track);
  } catch (error) {
    showToast('Не вдалося відкрити файл.', true);
    return;
  }
  audio.src = track.url;
  audio.load();
  audio.currentTime = 0;
  renderCurrent();
  renderPlaylist();
  updatePlaybackState();
  if (autoplay) {
    await playAudio();
  }
}

function enqueueTrack(index) {
  if (!state.tracks[index] || !consumeCredit()) {
    return;
  }
  state.queue.push(index);
  renderQueue();
  renderPlaylist();
  showToast('Пісню додано в чергу');
}

function removeFromQueue(position, refund = true) {
  if (position < 0 || position >= state.queue.length) {
    return;
  }
  state.queue.splice(position, 1);
  if (refund) {
    state.credits += 1;
  }
  renderAll();
}

function clearQueue() {
  if (state.queue.length === 0) {
    return;
  }
  state.credits += state.queue.length;
  state.queue = [];
  renderAll();
  showToast('Чергу очищено, кредити повернуто');
}

async function advanceQueue() {
  while (state.queue.length > 0) {
    const nextIndex = state.queue.shift();
    if (state.tracks[nextIndex]) {
      await playTrack(nextIndex, { autoplay: true, paid: true });
      renderQueue();
      return true;
    }
  }
  showToast('Черга порожня. Додайте пісню в чергу.', true);
  return false;
}

async function togglePlay() {
  if (state.currentIndex < 0) {
    showToast('Оберіть пісню зі списку.', true);
    return;
  }
  if (audio.paused) {
    await playAudio();
  } else {
    audio.pause();
  }
}

async function previousTrack() {
  if (state.currentIndex < 0) {
    return;
  }
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  while (state.history.length > 0) {
    const previousIndex = state.history.pop();
    if (state.tracks[previousIndex]) {
      await playTrack(previousIndex, { autoplay: true, paid: true });
      return;
    }
  }
  showToast('Це перший трек у історії');
}

function removeTrack(index) {
  const track = state.tracks[index];
  if (!track) {
    return;
  }
  const wasCurrent = index === state.currentIndex;
  state.queue = state.queue.map((queueIndex) => (queueIndex === index ? -1 : queueIndex > index ? queueIndex - 1 : queueIndex)).filter((queueIndex) => queueIndex >= 0);
  state.history = state.history.map((historyIndex) => (historyIndex === index ? -1 : historyIndex > index ? historyIndex - 1 : historyIndex)).filter((historyIndex) => historyIndex >= 0);
  state.tracks.splice(index, 1);
  revokeTrack(track);
  if (wasCurrent) {
    clearCurrentAudio();
  } else if (state.currentIndex > index) {
    state.currentIndex -= 1;
  }
  renderAll();
}

async function loadFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith('audio/') || isAudioName(file.name));
  if (files.length === 0) {
    showToast('Аудіофайли не знайдено.', true);
    return;
  }
  const { root, rootName } = buildFallbackTree(files);
  setLibrary({ tree: root, rootName, persisted: false });
  showToast(`Завантажено вручну: ${files.length}`);
}

function openLibraryDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(databaseStore);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readRootHandle() {
  const db = await openLibraryDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(databaseStore, 'readonly').objectStore(databaseStore).get(rootHandleKey);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function writeRootHandle(handle) {
  const db = await openLibraryDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(databaseStore, 'readwrite').objectStore(databaseStore).put(handle, rootHandleKey);
    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function deleteRootHandle() {
  const db = await openLibraryDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(databaseStore, 'readwrite').objectStore(databaseStore).delete(rootHandleKey);
    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function scanRoot(handle) {
  try {
    const tree = await scanDirectory(handle);
    setLibrary({ tree, rootName: handle.name, rootHandle: handle, persisted: true });
    showToast(`Бібліотека завантажена: ${countTracks(tree)} треків`);
  } catch (error) {
    showToast('Не вдалося прочитати кореневу теку.', true);
  }
}

async function loadPersistedRoot() {
  try {
    const handle = await readRootHandle();
    if (!handle) {
      renderAll();
      return;
    }
    state.pendingHandle = handle;
    state.rootName = handle.name;
    const permission = await handle.queryPermission({ mode: 'read' });
    if (permission === 'granted') {
      await scanRoot(handle);
    } else {
      renderAll();
    }
  } catch (error) {
    renderAll();
  }
}

async function chooseRootFolder() {
  if (!window.showDirectoryPicker) {
    showToast('Браузер не підтримує постійну теку. Використайте ручний вибір.', true);
    elements.folderInput.click();
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'read' });
    await writeRootHandle(handle);
    await scanRoot(handle);
  } catch (error) {
    if (error.name !== 'AbortError') {
      showToast('Не вдалося зберегти кореневу теку.', true);
    }
  }
}

async function connectSavedRoot() {
  if (!state.pendingHandle) {
    await chooseRootFolder();
    return;
  }
  try {
    const permission = await state.pendingHandle.requestPermission({ mode: 'read' });
    if (permission === 'granted') {
      await scanRoot(state.pendingHandle);
    }
  } catch (error) {
    showToast('Браузер не надав доступ до збереженої теки.', true);
  }
}

async function rescanRoot() {
  if (state.rootHandle) {
    await scanRoot(state.rootHandle);
  } else if (state.pendingHandle) {
    await connectSavedRoot();
  } else {
    showToast('Спершу налаштуйте кореневу теку.', true);
  }
}

async function clearLibrary() {
  state.tracks.forEach(revokeTrack);
  state.tracks = [];
  state.tree = null;
  state.rootHandle = null;
  state.pendingHandle = null;
  state.rootName = '';
  state.currentFolderPath = '';
  state.persisted = false;
  state.credits += state.queue.length;
  state.queue = [];
  clearCurrentAudio();
  try {
    await deleteRootHandle();
  } catch (error) {
    void error;
  }
  renderAll();
  showToast('Бібліотеку очищено');
}

function resetFileInputs() {
  elements.fileInput.value = '';
  elements.folderInput.value = '';
}

function updateTrackDuration() {
  const track = state.tracks[state.currentIndex];
  if (!track || !Number.isFinite(audio.duration)) {
    return;
  }
  track.duration = audio.duration;
  renderPlaylist();
  updateProgress();
}

function focusSearch() {
  elements.searchInput.focus();
  elements.searchInput.select();
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => undefined);
  } else {
    document.documentElement.requestFullscreen().catch(() => showToast('Браузер не дозволив повний екран.', true));
  }
}

function toggleOperatorPanel() {
  elements.operatorPanel.hidden = !elements.operatorPanel.hidden;
}

function handleGlobalKeydown(event) {
  const activeElement = document.activeElement;
  const isTyping = activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
  if (event.key === '/' && !isTyping) {
    event.preventDefault();
    focusSearch();
    return;
  }
  if (isTyping && event.key !== 'Escape') {
    return;
  }
  if (event.key === 'F1' || event.key.toLowerCase() === 'c') {
    event.preventDefault();
    insertCoin();
  } else if (event.code === 'Space') {
    event.preventDefault();
    void togglePlay();
  } else if (event.key === 'ArrowRight' && state.currentIndex >= 0) {
    event.preventDefault();
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
  } else if (event.key === 'ArrowLeft' && state.currentIndex >= 0) {
    event.preventDefault();
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  } else if (event.key.toLowerCase() === 'n') {
    void advanceQueue();
  } else if (event.key.toLowerCase() === 'p') {
    void previousTrack();
  } else if (event.key.toLowerCase() === 'm') {
    toggleMute();
  } else if (event.key.toLowerCase() === 'o') {
    toggleOperatorPanel();
  } else if (event.key === 'Escape' && document.activeElement === elements.searchInput) {
    elements.searchInput.blur();
  }
}

function toggleMute() {
  if (audio.muted || audio.volume === 0) {
    audio.muted = false;
    audio.volume = state.previousVolume || 0.8;
  } else {
    state.previousVolume = audio.volume;
    audio.muted = true;
  }
  updateVolume();
}

elements.coinButton.addEventListener('click', insertCoin);
elements.playButton.addEventListener('click', () => void togglePlay());
elements.previousButton.addEventListener('click', () => void previousTrack());
elements.nextButton.addEventListener('click', () => void advanceQueue());
elements.muteButton.addEventListener('click', toggleMute);
elements.fullscreenButton.addEventListener('click', toggleFullscreen);
elements.operatorButton.addEventListener('click', toggleOperatorPanel);
elements.rootFolderButton.addEventListener('click', () => void chooseRootFolder());
elements.connectRootButton.addEventListener('click', () => void connectSavedRoot());
elements.rescanButton.addEventListener('click', () => void rescanRoot());
elements.fallbackFilesButton.addEventListener('click', () => elements.folderInput.click());
elements.clearLibraryButton.addEventListener('click', () => void clearLibrary());
elements.clearQueueButton.addEventListener('click', clearQueue);
elements.rootBreadcrumb.addEventListener('click', () => selectFolder(''));
elements.progressBar.addEventListener('input', () => {
  if (state.currentIndex >= 0 && Number.isFinite(audio.duration)) {
    audio.currentTime = (Number(elements.progressBar.value) / 1000) * audio.duration;
    updateProgress();
  }
});
elements.volumeBar.addEventListener('input', () => {
  audio.volume = Number(elements.volumeBar.value);
  audio.muted = audio.volume === 0;
  if (audio.volume > 0) {
    state.previousVolume = audio.volume;
  }
  updateVolume();
});
elements.searchInput.addEventListener('input', () => {
  state.query = elements.searchInput.value;
  renderPlaylist();
});
elements.dropzone.addEventListener('click', () => elements.folderInput.click());
elements.dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    elements.folderInput.click();
  }
});
elements.fileInput.addEventListener('change', () => {
  void loadFiles(elements.fileInput.files);
  resetFileInputs();
});
elements.folderInput.addEventListener('change', () => {
  void loadFiles(elements.folderInput.files);
  resetFileInputs();
});

['dragenter', 'dragover'].forEach((eventName) => {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    state.dragDepth += 1;
    elements.dropzone.classList.add('is-dragging');
  });
});
elements.dropzone.addEventListener('dragleave', (event) => {
  event.preventDefault();
  state.dragDepth = Math.max(0, state.dragDepth - 1);
  if (state.dragDepth === 0) {
    elements.dropzone.classList.remove('is-dragging');
  }
});
elements.dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  state.dragDepth = 0;
  elements.dropzone.classList.remove('is-dragging');
  void loadFiles(event.dataTransfer.files);
});
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());
document.addEventListener('keydown', handleGlobalKeydown);

audio.addEventListener('loadedmetadata', updateTrackDuration);
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('play', updatePlaybackState);
audio.addEventListener('pause', updatePlaybackState);
audio.addEventListener('ended', () => {
  state.currentPaid = false;
  void advanceQueue().then((advanced) => {
    if (!advanced) {
      renderAll();
    }
  });
});
audio.addEventListener('error', () => {
  if (state.currentIndex >= 0) {
    showToast('Не вдалося відтворити цей файл.', true);
    updatePlaybackState();
  }
});

if ('mediaSession' in navigator) {
  const actions = {
    play: () => void playAudio(),
    pause: () => audio.pause(),
    previoustrack: () => void previousTrack(),
    nexttrack: () => void advanceQueue()
  };
  Object.entries(actions).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      void error;
    }
  });
}

let savedVolume = 0.8;
try {
  savedVolume = Number(localStorage.getItem('jukebox-volume')) || 0.8;
} catch (error) {
  void error;
}
audio.volume = Math.max(0, Math.min(1, savedVolume));
state.previousVolume = audio.volume || 0.8;
updateVolume();
renderAll();
void loadPersistedRoot();
