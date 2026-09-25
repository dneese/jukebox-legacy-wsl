'use strict';

const elements = {
  audio: document.querySelector('#audio'),
  fileInput: document.querySelector('#fileInput'),
  folderInput: document.querySelector('#folderInput'),
  dropzone: document.querySelector('#dropzone'),
  searchInput: document.querySelector('#searchInput'),
  playlist: document.querySelector('#playlist'),
  emptyPlaylist: document.querySelector('#emptyPlaylist'),
  queueList: document.querySelector('#queueList'),
  queueEmpty: document.querySelector('#queueEmpty'),
  queueHint: document.querySelector('.queue-hint'),
  clearQueueButton: document.querySelector('#clearQueueButton'),
  creditCount: document.querySelector('#creditCount'),
  queueCount: document.querySelector('#queueCount'),
  addCreditButton: document.querySelector('#addCreditButton'),
  fullscreenButton: document.querySelector('#fullscreenButton'),
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
  queue: [],
  history: [],
  currentIndex: -1,
  currentPaid: false,
  credits: 1,
  query: '',
  muted: false,
  previousVolume: 0.8,
  toastTimer: null,
  dragDepth: 0
};

const audioExtensionPattern = /\.(mp3|m4a|m4b|aac|ogg|oga|opus|wav|flac|webm|aiff?|wma)$/i;

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

function isAudioFile(file) {
  return Boolean(file && (file.type.startsWith('audio/') || audioExtensionPattern.test(file.name)));
}

function createTrack(file) {
  const names = parseTrackName(file.name);
  return {
    file,
    url: URL.createObjectURL(file),
    artist: names.artist,
    title: names.title,
    duration: 0
  };
}

function getTrack(index) {
  return state.tracks[index] || null;
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
  }, 3200);
}

function setStatus(text, playing = false) {
  elements.statusPill.classList.toggle('is-playing', playing);
  const label = elements.statusPill.lastChild;
  if (label) {
    label.textContent = text;
  }
}

function updateCredits() {
  elements.creditCount.textContent = String(state.credits);
  elements.queueCount.textContent = String(state.queue.length);
  elements.clearQueueButton.disabled = state.queue.length === 0;
}

function updateCounts() {
  const count = state.tracks.length;
  elements.trackCount.textContent = `${count} ${count === 1 ? 'трек' : 'треків'}`;
  elements.libraryBadge.textContent = String(count);
  elements.footerStatus.textContent = count > 0
    ? `${count} ${count === 1 ? 'трек' : 'треків'} • кредитів: ${state.credits}`
    : 'Файли залишаються на твоєму пристрої';
}

function updatePlaybackState() {
  const playing = !audio.paused && !audio.ended && state.currentIndex >= 0;
  elements.playerCard.classList.toggle('is-playing', playing);
  elements.coverArt.classList.toggle('is-playing', playing);
  elements.playButton.setAttribute('aria-label', playing ? 'Пауза' : 'Відтворити');
  elements.playButton.title = playing ? 'Пауза' : 'Відтворити';
  if (playing) {
    setStatus('ВІДТВОРЮЄТЬСЯ', true);
  } else if (state.currentIndex < 0) {
    setStatus('ОЧІКУЄ КРЕДИТ');
  } else if (state.currentPaid) {
    setStatus('ПАУЗА');
  } else {
    setStatus('ОЧІКУЄ КРЕДИТ');
  }
}

function updateMediaSession(track) {
  if (!('mediaSession' in navigator) || !track) {
    return;
  }
  if ('MediaMetadata' in window) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: 'JukeBox Kiosk'
    });
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

function renderCurrent() {
  const track = getTrack(state.currentIndex);
  if (!track) {
    elements.trackTitle.textContent = 'Оберіть музику';
    elements.trackArtist.textContent = 'Додайте трек або відкрийте локальну теку';
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

function renderQueue() {
  state.queue = state.queue.filter((index) => Boolean(getTrack(index)));
  elements.queueList.replaceChildren();
  state.queue.forEach((trackIndex, position) => {
    const track = getTrack(trackIndex);
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
  const query = state.query.trim().toLocaleLowerCase();
  const visibleTracks = state.tracks
    .map((track, index) => ({ track, index }))
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
      if (event.target.closest('button')) {
        return;
      }
      activate();
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

  const hasTracks = state.tracks.length > 0;
  const hasVisibleTracks = visibleTracks.length > 0;
  elements.emptyPlaylist.hidden = hasTracks && hasVisibleTracks;
  if (hasTracks && !hasVisibleTracks) {
    elements.emptyPlaylist.querySelector('strong').textContent = 'Нічого не знайдено';
    elements.emptyPlaylist.querySelector('span:last-child').textContent = 'Спробуй змінити пошуковий запит';
  } else {
    elements.emptyPlaylist.querySelector('strong').textContent = 'Список пісень порожній';
    elements.emptyPlaylist.querySelector('span:last-child').textContent = 'Додай кілька треків, щоб почати';
  }
}

function renderAll() {
  updateCredits();
  updateCounts();
  renderCurrent();
  renderQueue();
  renderPlaylist();
  updatePlaybackState();
}

function consumeCredit() {
  if (state.credits < 1) {
    showToast('Немає кредитів. Натисни «+1 кредит».', true);
    return false;
  }
  state.credits -= 1;
  updateCredits();
  return true;
}

function addCredit() {
  state.credits += 1;
  updateCredits();
  showToast('Кредит додано');
}

function playAudio() {
  if (state.currentIndex < 0) {
    if (state.tracks.length > 0) {
      playTrack(0, { autoplay: true });
    }
    return;
  }
  if (!state.currentPaid && !consumeCredit()) {
    return;
  }
  state.currentPaid = true;
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => showToast('Браузер не дозволив відтворення. Натисни play ще раз.', true));
  }
  updateCredits();
  updatePlaybackState();
}

function playTrack(index, options = {}) {
  const track = getTrack(index);
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
  audio.src = track.url;
  audio.load();
  audio.currentTime = 0;
  renderCurrent();
  renderPlaylist();
  renderQueue();
  updateCounts();
  if (autoplay) {
    playAudio();
  }
}

function enqueueTrack(index) {
  if (!getTrack(index)) {
    return;
  }
  if (!consumeCredit()) {
    return;
  }
  state.queue.push(index);
  renderQueue();
  renderPlaylist();
  showToast('Трек додано в чергу');
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

function advanceQueue() {
  while (state.queue.length > 0) {
    const nextIndex = state.queue.shift();
    if (getTrack(nextIndex)) {
      playTrack(nextIndex, { autoplay: true, paid: true });
      renderQueue();
      return true;
    }
  }
  showToast('Черга порожня. Додай трек у чергу.', true);
  return false;
}

function togglePlay() {
  if (state.currentIndex < 0) {
    if (state.tracks.length > 0) {
      playTrack(0, { autoplay: true });
    } else {
      showToast('Спочатку додай аудіофайли.', true);
    }
    return;
  }
  if (audio.paused) {
    playAudio();
  } else {
    audio.pause();
  }
}

function previousTrack() {
  if (state.currentIndex < 0) {
    return;
  }
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  while (state.history.length > 0) {
    const previousIndex = state.history.pop();
    if (getTrack(previousIndex)) {
      playTrack(previousIndex, { autoplay: true, paid: true });
      return;
    }
  }
  showToast('Це перший трек у історії');
}

function removeTrack(index) {
  const track = getTrack(index);
  if (!track) {
    return;
  }
  const wasCurrent = index === state.currentIndex;
  state.queue = state.queue
    .map((queueIndex) => (queueIndex === index ? -1 : queueIndex > index ? queueIndex - 1 : queueIndex))
    .filter((queueIndex) => queueIndex >= 0);
  state.history = state.history
    .map((historyIndex) => (historyIndex === index ? -1 : historyIndex > index ? historyIndex - 1 : historyIndex))
    .filter((historyIndex) => historyIndex >= 0);
  state.tracks.splice(index, 1);
  URL.revokeObjectURL(track.url);
  if (wasCurrent) {
    state.currentIndex = -1;
    state.currentPaid = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  } else if (state.currentIndex > index) {
    state.currentIndex -= 1;
  }
  renderAll();
}

function loadFiles(fileList) {
  const files = Array.from(fileList || []).filter(isAudioFile);
  if (files.length === 0) {
    showToast('Аудіофайли не знайдено.', true);
    return;
  }
  const firstNewIndex = state.tracks.length;
  files.forEach((file) => state.tracks.push(createTrack(file)));
  if (state.currentIndex < 0) {
    state.currentIndex = firstNewIndex;
    state.currentPaid = false;
  }
  renderAll();
  showToast(`Додано треків: ${files.length}`);
}

function resetFileInputs() {
  elements.fileInput.value = '';
  elements.folderInput.value = '';
}

function updateTrackDuration() {
  const track = getTrack(state.currentIndex);
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
    document.documentElement.requestFullscreen().catch(() => showToast('Браузер не дозволив повноекранний режим.', true));
  }
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
    addCredit();
  } else if (event.code === 'Space') {
    event.preventDefault();
    togglePlay();
  } else if (event.key === 'ArrowRight' && state.currentIndex >= 0) {
    event.preventDefault();
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
  } else if (event.key === 'ArrowLeft' && state.currentIndex >= 0) {
    event.preventDefault();
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  } else if (event.key.toLowerCase() === 'n') {
    advanceQueue();
  } else if (event.key.toLowerCase() === 'p') {
    previousTrack();
  } else if (event.key.toLowerCase() === 'm') {
    toggleMute();
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

elements.playButton.addEventListener('click', togglePlay);
elements.previousButton.addEventListener('click', previousTrack);
elements.nextButton.addEventListener('click', advanceQueue);
elements.muteButton.addEventListener('click', toggleMute);
elements.addCreditButton.addEventListener('click', addCredit);
elements.clearQueueButton.addEventListener('click', clearQueue);
elements.fullscreenButton.addEventListener('click', toggleFullscreen);
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
elements.dropzone.addEventListener('click', () => elements.fileInput.click());
elements.dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.fileInput.addEventListener('change', () => {
  loadFiles(elements.fileInput.files);
  resetFileInputs();
});
elements.folderInput.addEventListener('change', () => {
  loadFiles(elements.folderInput.files);
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
  loadFiles(event.dataTransfer.files);
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
  if (!advanceQueue()) {
    renderAll();
  }
});
audio.addEventListener('error', () => {
  if (state.currentIndex >= 0) {
    showToast('Не вдалося відтворити цей файл.', true);
    updatePlaybackState();
  }
});

if ('mediaSession' in navigator) {
  const actions = {
    play: () => playAudio(),
    pause: () => audio.pause(),
    previoustrack: () => previousTrack(),
    nexttrack: () => advanceQueue()
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
