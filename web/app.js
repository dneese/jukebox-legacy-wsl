'use strict';

const elements = {
  audio: document.querySelector('#audio'),
  fileInput: document.querySelector('#fileInput'),
  folderInput: document.querySelector('#folderInput'),
  dropzone: document.querySelector('#dropzone'),
  searchInput: document.querySelector('#searchInput'),
  playlist: document.querySelector('#playlist'),
  emptyPlaylist: document.querySelector('#emptyPlaylist'),
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
  currentIndex: -1,
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
  const url = URL.createObjectURL(file);
  return {
    file,
    url,
    artist: names.artist,
    title: names.title,
    duration: 0
  };
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

function updatePlaybackState() {
  const playing = !audio.paused && !audio.ended && state.currentIndex >= 0;
  elements.playerCard.classList.toggle('is-playing', playing);
  elements.coverArt.classList.toggle('is-playing', playing);
  elements.playButton.setAttribute('aria-label', playing ? 'Пауза' : 'Відтворити');
  elements.playButton.title = playing ? 'Пауза' : 'Відтворити';
  setStatus(playing ? 'ВІДТВОРЮЄТЬСЯ' : state.currentIndex >= 0 ? 'ГОТОВИЙ' : 'ОЧІКУЄ ФАЙЛИ', playing);
}

function updateMediaSession(track) {
  if (!('mediaSession' in navigator) || !track) {
    return;
  }
  if ('MediaMetadata' in window) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: 'JukeBox Web'
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

function updateCounts() {
  const count = state.tracks.length;
  elements.trackCount.textContent = `${count} ${count === 1 ? 'трек' : 'треків'}`;
  elements.libraryBadge.textContent = String(count);
  elements.footerStatus.textContent = count > 0
    ? `${count} ${count === 1 ? 'трек' : 'треків'} у локальній бібліотеці`
    : 'Локальний режим • файли не залишають браузер';
}

function renderCurrent() {
  const track = state.tracks[state.currentIndex];
  if (!track) {
    elements.trackTitle.textContent = 'Оберіть музику';
    elements.trackArtist.textContent = 'Перетягніть файли сюди або відкрийте теку';
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
    const item = document.createElement('li');
    item.className = 'playlist-item';
    item.dataset.index = String(index);
    item.tabIndex = 0;
    if (index === state.currentIndex) {
      item.classList.add('is-current');
    }

    const number = document.createElement('span');
    number.className = 'track-number';
    number.textContent = String(index + 1).padStart(2, '0');

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

    const play = document.createElement('button');
    play.className = 'track-play';
    play.type = 'button';
    play.setAttribute('aria-label', `Відтворити ${track.title}`);
    play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z"/></svg>';

    const activate = () => setCurrentTrack(index, true);
    item.addEventListener('click', (event) => {
      if (event.target.closest('.track-play')) {
        event.stopPropagation();
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

    item.append(number, copy, length, play);
    elements.playlist.append(item);
  });

  const hasTracks = state.tracks.length > 0;
  const hasVisibleTracks = visibleTracks.length > 0;
  elements.emptyPlaylist.hidden = hasTracks && hasVisibleTracks;
  if (hasTracks && !hasVisibleTracks) {
    elements.emptyPlaylist.querySelector('strong').textContent = 'Нічого не знайдено';
    elements.emptyPlaylist.querySelector('span:last-child').textContent = 'Спробуй змінити пошуковий запит';
  } else {
    elements.emptyPlaylist.querySelector('strong').textContent = 'Плейлист порожній';
    elements.emptyPlaylist.querySelector('span:last-child').textContent = 'Додай кілька треків, щоб почати';
  }
}

function playAudio() {
  if (state.currentIndex < 0) {
    if (state.tracks.length > 0) {
      setCurrentTrack(0, true);
    }
    return;
  }
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => showToast('Браузер не дозволив відтворення. Натисни play ще раз.', true));
  }
}

function setCurrentTrack(index, autoplay) {
  if (!Number.isInteger(index) || index < 0 || index >= state.tracks.length) {
    return;
  }
  state.currentIndex = index;
  const track = state.tracks[index];
  audio.pause();
  audio.src = track.url;
  audio.load();
  audio.currentTime = 0;
  renderCurrent();
  renderPlaylist();
  if (autoplay) {
    playAudio();
  }
}

function togglePlay() {
  if (state.currentIndex < 0) {
    if (state.tracks.length > 0) {
      setCurrentTrack(0, true);
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

function nextTrack(autoplay = true) {
  if (state.tracks.length === 0) {
    return;
  }
  const nextIndex = (state.currentIndex + 1) % state.tracks.length;
  setCurrentTrack(nextIndex, autoplay);
}

function previousTrack() {
  if (state.tracks.length === 0) {
    return;
  }
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const previousIndex = (state.currentIndex - 1 + state.tracks.length) % state.tracks.length;
  setCurrentTrack(previousIndex, true);
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

function loadFiles(fileList) {
  const files = Array.from(fileList || []).filter(isAudioFile);
  if (files.length === 0) {
    showToast('Аудіофайли не знайдено.', true);
    return;
  }
  const firstNewIndex = state.tracks.length;
  files.forEach((file) => state.tracks.push(createTrack(file)));
  updateCounts();
  if (state.currentIndex < 0) {
    setCurrentTrack(firstNewIndex, false);
  } else {
    renderPlaylist();
  }
  showToast(`Додано треків: ${files.length}`);
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
  if (event.code === 'Space') {
    event.preventDefault();
    togglePlay();
  } else if (event.key === 'ArrowRight' && state.currentIndex >= 0) {
    event.preventDefault();
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
  } else if (event.key === 'ArrowLeft' && state.currentIndex >= 0) {
    event.preventDefault();
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  } else if (event.key.toLowerCase() === 'n') {
    nextTrack();
  } else if (event.key.toLowerCase() === 'p') {
    previousTrack();
  } else if (event.key.toLowerCase() === 'm') {
    toggleMute();
  } else if (event.key === 'Escape' && document.activeElement === elements.searchInput) {
    elements.searchInput.blur();
  }
}

elements.playButton.addEventListener('click', togglePlay);
elements.previousButton.addEventListener('click', previousTrack);
elements.nextButton.addEventListener('click', () => nextTrack());
elements.muteButton.addEventListener('click', toggleMute);
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
audio.addEventListener('ended', () => nextTrack(true));
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
    nexttrack: () => nextTrack()
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
updateCounts();
renderPlaylist();
renderCurrent();
updatePlaybackState();
