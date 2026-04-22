let queue = [];
let currentIndex = 0;
let selectedMood = "focus";
let userLocation = null;

const els = {
  apiStatus: document.querySelector("#apiStatus"),
  file: document.querySelector("#playlistFile"),
  text: document.querySelector("#playlistText"),
  importButton: document.querySelector("#importButton"),
  sampleButton: document.querySelector("#loadSampleButton"),
  generateButton: document.querySelector("#generateButton"),
  moodGrid: document.querySelector("#moodGrid"),
  energy: document.querySelector("#energyInput"),
  energyValue: document.querySelector("#energyValue"),
  prompt: document.querySelector("#promptInput"),
  audioUrl: document.querySelector("#audioUrlInput"),
  attachUrlButton: document.querySelector("#attachUrlButton"),
  title: document.querySelector("#songTitle"),
  meta: document.querySelector("#songMeta"),
  initial: document.querySelector("#coverInitial"),
  vinyl: document.querySelector("#vinyl"),
  audio: document.querySelector("#audioPlayer"),
  play: document.querySelector("#playButton"),
  prev: document.querySelector("#prevButton"),
  next: document.querySelector("#nextButton"),
  progress: document.querySelector("#progressFill"),
  currentTime: document.querySelector("#currentTime"),
  duration: document.querySelector("#duration"),
  reason: document.querySelector("#djReason"),
  queue: document.querySelector("#queueList"),
  count: document.querySelector("#songCount"),
  clock: document.querySelector("#clockText"),
  now: document.querySelector("#nowText"),
  weather: document.querySelector("#weatherText"),
  state: document.querySelector("#stateText"),
  locationButton: document.querySelector("#locationButton"),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API ${response.status}`);
  }

  return response.json();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function setNowPlaying(song) {
  if (!song) return;

  els.title.textContent = song.title;
  els.meta.textContent = `${song.artist} · ${song.tags.join(" / ") || "未标标签"} · 能量 ${song.energy}`;
  els.initial.textContent = song.title.slice(0, 2).toUpperCase();
  els.audio.src = song.audioUrl || "";
  els.audioUrl.value = song.audioUrl || "";
  els.progress.style.width = "0%";
  els.currentTime.textContent = "00:00";
  els.duration.textContent = song.audioUrl ? "loading" : "no audio";
  els.play.textContent = "▶";
  els.vinyl.classList.remove("playing");

  [...els.queue.children].forEach((item, index) => {
    item.classList.toggle("active", index === currentIndex);
  });
}

function renderQueue() {
  els.count.textContent = `${queue.length} 首`;
  els.queue.innerHTML = "";

  queue.forEach((song, index) => {
    const item = document.createElement("li");
    item.className = "queue-item";
    item.innerHTML = `
      <span class="queue-index">${String(index + 1).padStart(2, "0")}</span>
      <div>
        <p class="queue-title">${song.title} - ${song.artist}</p>
        <div class="queue-meta">${song.tags.join(" / ") || "未标标签"}</div>
      </div>
      <span class="energy-pill ${song.audioUrl ? "playable" : ""}">${song.audioUrl ? "play" : song.energy}</span>
    `;
    item.addEventListener("click", () => {
      currentIndex = index;
      setNowPlaying(queue[currentIndex]);
    });
    els.queue.appendChild(item);
  });
}

async function loadContext() {
  const params = userLocation ? `?lat=${userLocation.lat}&lon=${userLocation.lon}` : "";
  const data = await api(`/api/now${params}`);
  els.clock.textContent = data.time;
  els.now.textContent = `${data.partOfDay} · ${data.weekday}`;
  els.weather.textContent = data.weather.summary;
  els.state.textContent = `${data.state.playlistCount} songs · ${data.state.queueCount} queue`;
}

async function loadSample() {
  const data = await api("/api/sample-playlist");
  els.text.value = data.csv;
  els.reason.textContent = "已载入华语示例歌单。现在可以调心情和能量，再生成电台。";
  await importPlaylist();
}

async function importPlaylist() {
  const data = await api("/api/playlist/import", {
    method: "POST",
    body: JSON.stringify({ text: els.text.value }),
  });
  els.reason.textContent = `后端已读入 ${data.count} 首歌。`;
}

async function generateRadio() {
  const data = await api("/api/radio/generate", {
    method: "POST",
    body: JSON.stringify({
      mood: selectedMood,
      energy: Number(els.energy.value),
      prompt: els.prompt.value,
    }),
  });

  queue = data.queue;
  currentIndex = 0;
  renderQueue();
  setNowPlaying(queue[currentIndex]);
  els.reason.textContent = data.reason;
}

els.moodGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".mood");
  if (!button) return;
  selectedMood = button.dataset.mood;
  document.querySelectorAll(".mood").forEach((item) => item.classList.toggle("active", item === button));
});

els.energy.addEventListener("input", () => {
  els.energyValue.textContent = els.energy.value;
});

els.file.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  els.text.value = await file.text();
  await importPlaylist();
});

els.importButton.addEventListener("click", importPlaylist);
els.sampleButton.addEventListener("click", loadSample);
els.generateButton.addEventListener("click", generateRadio);

els.attachUrlButton.addEventListener("click", () => {
  const song = queue[currentIndex];
  const audioUrl = els.audioUrl.value.trim();

  if (!song) {
    els.reason.textContent = "先生成一段推荐队列，再给当前歌曲绑定音频 URL。";
    return;
  }

  if (!audioUrl) {
    els.reason.textContent = "请粘贴一个可以直接访问的音频 URL，例如 mp3/m4a/wav 文件地址。";
    return;
  }

  song.audioUrl = audioUrl;
  setNowPlaying(song);
  renderQueue();
  els.reason.textContent = "已绑定音频 URL。如果链接允许浏览器访问，就可以直接在这里播放。";
});

els.locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    els.reason.textContent = "这个浏览器不支持定位。可以继续用默认城市天气。";
    return;
  }

  els.locationButton.textContent = "正在获取位置...";
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLocation = {
        lat: position.coords.latitude.toFixed(5),
        lon: position.coords.longitude.toFixed(5),
      };
      await loadContext();
      await generateRadio();
      els.locationButton.textContent = "已使用当前位置天气";
    },
    () => {
      els.locationButton.textContent = "使用当前位置天气";
      els.reason.textContent = "没有拿到定位权限，先继续使用默认城市天气。";
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
  );
});

els.play.addEventListener("click", async () => {
  const song = queue[currentIndex];
  if (!song) return;
  if (!song.audioUrl) {
    els.reason.textContent = "这首歌没有 audioUrl，所以只能推荐，不能播放。接入音乐 API 后，把试听链接写进 audioUrl 就可以播放。";
    return;
  }

  if (els.audio.paused) {
    await els.audio.play();
  } else {
    els.audio.pause();
  }
});

els.prev.addEventListener("click", () => {
  if (!queue.length) return;
  currentIndex = (currentIndex - 1 + queue.length) % queue.length;
  setNowPlaying(queue[currentIndex]);
});

els.next.addEventListener("click", () => {
  if (!queue.length) return;
  currentIndex = (currentIndex + 1) % queue.length;
  setNowPlaying(queue[currentIndex]);
});

els.audio.addEventListener("play", () => {
  els.play.textContent = "Ⅱ";
  els.vinyl.classList.add("playing");
});

els.audio.addEventListener("pause", () => {
  els.play.textContent = "▶";
  els.vinyl.classList.remove("playing");
});

els.audio.addEventListener("timeupdate", () => {
  const percent = els.audio.duration ? (els.audio.currentTime / els.audio.duration) * 100 : 0;
  els.progress.style.width = `${percent}%`;
  els.currentTime.textContent = formatTime(els.audio.currentTime);
});

els.audio.addEventListener("loadedmetadata", () => {
  els.duration.textContent = formatTime(els.audio.duration);
});

els.audio.addEventListener("ended", () => {
  if (!queue.length) return;
  currentIndex = (currentIndex + 1) % queue.length;
  setNowPlaying(queue[currentIndex]);
});

async function boot() {
  try {
    await api("/api/health");
    els.apiStatus.textContent = "API online";
    els.apiStatus.classList.add("online");
    await loadContext();
    await loadSample();
    await generateRadio();
    await loadContext();
  } catch (error) {
    els.apiStatus.textContent = "API offline";
    els.reason.textContent = "后端没有启动。请运行 npm start，然后打开 http://localhost:3000";
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

boot();
