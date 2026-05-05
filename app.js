let userLocation = null;
let lastMoodcast = null;

const els = {
  apiStatus: document.querySelector("#apiStatus"),
  engineBadge: document.querySelector("#engineBadge"),
  clock: document.querySelector("#clockText"),
  now: document.querySelector("#nowText"),
  weather: document.querySelector("#weatherText"),
  state: document.querySelector("#stateText"),
  agentState: document.querySelector("#agentState"),
  routeText: document.querySelector("#routeText"),
  intakePreview: document.querySelector("#intakePreview"),
  ambientProfile: document.querySelector("#ambientProfile"),
  locationButton: document.querySelector("#locationButton"),
  moodInput: document.querySelector("#moodInput"),
  energyInput: document.querySelector("#energyInput"),
  stressInput: document.querySelector("#stressInput"),
  energyValue: document.querySelector("#energyValue"),
  stressValue: document.querySelector("#stressValue"),
  generateButton: document.querySelector("#generateButton"),
  forecastTitle: document.querySelector("#forecastTitle"),
  forecastSummary: document.querySelector("#forecastSummary"),
  weatherIcon: document.querySelector("#weatherIcon"),
  weatherOrb: document.querySelector("#weatherOrb"),
  energyScore: document.querySelector("#energyScore"),
  energyFill: document.querySelector("#energyFill"),
  stressScore: document.querySelector("#stressScore"),
  stressFill: document.querySelector("#stressFill"),
  signalNote: document.querySelector("#signalNote"),
  moodTag: document.querySelector("#moodTag"),
  actionText: document.querySelector("#actionText"),
  careText: document.querySelector("#careText"),
  heroSongCount: document.querySelector("#heroSongCount"),
  heroSongStrip: document.querySelector("#heroSongStrip"),
  songCount: document.querySelector("#songCount"),
  songList: document.querySelector("#songList"),
  chatState: document.querySelector("#chatState"),
  chatLog: document.querySelector("#chatLog"),
  chatInput: document.querySelector("#chatInput"),
  chatSend: document.querySelector("#chatSend"),
};

let engineMode = "local";

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

function locationParams() {
  return userLocation ? `?lat=${userLocation.lat}&lon=${userLocation.lon}` : "";
}

async function loadContext() {
  const data = await api(`/api/now${locationParams()}`);
  els.clock.textContent = data.time;
  els.now.textContent = `${data.partOfDay} · ${data.weekday}`;
  els.weather.textContent = data.weather.summary;
  els.state.textContent = engineMode === "ai" ? "ai agent route" : "local mood route";
  return data;
}

async function loadConnectors() {
  try {
    const data = await api("/api/connectors");
    const moodEngine = data.connectors?.find((item) => item.key === "mood_engine");
    engineMode = moodEngine?.status === "ready" ? "ai" : "local";
  } catch {
    engineMode = "local";
  }

  els.engineBadge.textContent = engineMode === "ai" ? "ai enabled" : "local fallback";
  els.engineBadge.classList.toggle("online", engineMode === "ai");
}

function updateAgentState(text, route) {
  els.agentState.textContent = text;
  if (route) {
    els.routeText.textContent = route;
  }
}

function updateInputTrace() {
  const text = els.moodInput.value.trim();
  const preview = text || "等待输入。Agent 会结合文本、能量、压力与天气信号。";
  els.intakePreview.textContent = preview.length > 120 ? `${preview.slice(0, 120)}...` : preview;
  els.stressScore.textContent = els.stressInput.value;
  els.stressFill.style.width = `${els.stressInput.value}%`;
}

function deriveAmbientProfile(data) {
  const moodLabel = data.forecast?.mood || "calm";
  return `chat-forward console / ${moodLabel} route / netease suggestion link`;
}

function renderHeroSongs(songs) {
  els.heroSongCount.textContent = `${songs.length} tracks`;
  els.heroSongStrip.innerHTML = songs
    .slice(0, 4)
    .map((song) => `<span class="hero-song-chip">${song.title} - ${song.artist}</span>`)
    .join("");
}

function renderMoodcast(data) {
  lastMoodcast = data;
  els.forecastTitle.textContent = data.forecast.title;
  els.forecastSummary.textContent = data.forecast.summary;
  els.weatherIcon.textContent = data.forecast.icon;
  els.weatherOrb.dataset.mood = data.forecast.mood;
  els.energyScore.textContent = `${data.energy}/100`;
  els.energyFill.style.width = `${data.energy}%`;
  els.signalNote.textContent = data.note;
  els.moodTag.textContent = data.forecast.mood;
  els.actionText.textContent = data.advice.action;
  els.careText.textContent = data.advice.care;
  els.songCount.textContent = `${data.songs.length} tracks`;
  renderHeroSongs(data.songs);
  els.ambientProfile.textContent = deriveAmbientProfile(data);
  updateAgentState(
    data.note.includes("AI 暂时不可用") ? "fallback route active" : engineMode === "ai" ? "ai response locked" : "local response locked",
    data.note.includes("AI 暂时不可用")
      ? "ai upstream unavailable -> local fallback"
      : engineMode === "ai"
        ? "ai mood engine -> care output -> netease search"
        : "local rules -> care output -> netease search",
  );
  els.songList.innerHTML = "";

  data.songs.forEach((song, index) => {
    const item = document.createElement("li");
    item.className = "song-item";
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist}`);
    const neteaseUrl = song.neteaseId
      ? `https://music.163.com/song?id=${encodeURIComponent(song.neteaseId)}`
      : `https://music.163.com/#/search/m/?s=${searchQuery}&type=1`;
    item.innerHTML = `
      <span class="queue-index">${String(index + 1).padStart(2, "0")}</span>
      <div class="song-copy">
        <p class="queue-title">${song.title}</p>
        <div class="queue-meta">${song.artist} · ${song.lang} · ${song.reason}</div>
      </div>
      <a class="song-link" href="${neteaseUrl}" target="_blank" rel="noreferrer">网易云播放</a>
    `;
    item.querySelector(".song-link")?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    item.querySelector(".song-copy")?.addEventListener("click", () => {
      window.open(neteaseUrl, "_blank", "noopener,noreferrer");
    });
    item.querySelector(".song-copy")?.setAttribute("role", "button");
    item.querySelector(".song-copy")?.setAttribute("tabindex", "0");
    item.querySelector(".song-copy")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.open(neteaseUrl, "_blank", "noopener,noreferrer");
      }
    });
    item.insertAdjacentHTML("beforeend", `
      <span class="song-source">NetEase</span>
    `);
    els.songList.appendChild(item);
  });
}

function appendChatMessage(role, text) {
  const item = document.createElement("article");
  item.className = `chat-bubble ${role}`;
  item.innerHTML = `
    <small>${role === "assistant" ? "MOODCAST Agent" : "You"}</small>
    <p>${text}</p>
  `;
  els.chatLog.appendChild(item);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function composeChatReply(question, moodcast) {
  const mood = moodcast.forecast.title;
  const songNames = moodcast.songs.slice(0, 2).map((song) => `${song.title} - ${song.artist}`).join(" / ");
  const lower = question.toLowerCase();

  if (lower.includes("休息") || lower.includes("继续") || lower.includes("推进")) {
    return `如果按你现在的情绪天气「${mood}」来看，我会建议先按「${moodcast.advice.action}」做一个小动作，再决定要不要继续推进。现在更重要的是保住节奏，而不是硬顶。顺手可以把 ${songNames} 放进待听清单。`;
  }

  if (lower.includes("为什么") || lower.includes("怎么")) {
    return `我是根据你刚才的文字、能量、压力和天气信号综合判断的，所以这次把你放在「${mood}」这条路线上。最关键的原因是：${moodcast.forecast.summary} 对应的落地动作是「${moodcast.advice.action}」，care 提醒是「${moodcast.advice.care}」。`;
  }

  return `我听见你了。按这次的情绪天气「${mood}」来看，先别急着把自己推到很满。你可以先做这一步：${moodcast.advice.action}。如果想让今天更顺一点，我会提醒你：${moodcast.advice.care}。音乐上我更偏向 ${songNames} 这种气质。`;
}

async function sendChat() {
  const question = els.chatInput.value.trim();
  if (!question) return;

  appendChatMessage("user", question);
  els.chatInput.value = "";
  els.chatSend.disabled = true;
  els.chatState.textContent = "thinking";

  try {
    const context = await loadContext();
    const moodcast = await api("/api/moodcast", {
      method: "POST",
      body: JSON.stringify({
        text: question || els.moodInput.value,
        energy: Number(els.energyInput.value),
        stress: Number(els.stressInput.value),
        weather: context.weather,
        now: context,
      }),
    });
    renderMoodcast(moodcast);
    appendChatMessage("assistant", composeChatReply(question, moodcast));
    els.chatState.textContent = engineMode === "ai" ? "ai reply" : "local reply";
  } catch (error) {
    appendChatMessage("assistant", `我这边刚刚没接稳，不过先给你一句短答：慢一点，但别断线。报错是 ${error.message}。`);
    els.chatState.textContent = "error";
  } finally {
    els.chatSend.disabled = false;
  }
}

async function generateMoodcast() {
  updateAgentState(
    engineMode === "ai" ? "agent analyzing emotional signal" : "local engine analyzing signal",
    engineMode === "ai" ? "context ingest -> ai reasoning -> response shaping" : "context ingest -> local rules -> response shaping",
  );
  els.generateButton.disabled = true;
  els.generateButton.textContent = engineMode === "ai" ? "agent is thinking..." : "local engine running...";
  const context = await loadContext();
  try {
    const data = await api("/api/moodcast", {
      method: "POST",
      body: JSON.stringify({
        text: els.moodInput.value,
        energy: Number(els.energyInput.value),
        stress: Number(els.stressInput.value),
        weather: context.weather,
        now: context,
      }),
    });

    renderMoodcast(data);
  } finally {
    els.generateButton.disabled = false;
    els.generateButton.textContent = "启动情绪 agent";
  }
}

els.energyInput.addEventListener("input", () => {
  els.energyValue.textContent = els.energyInput.value;
  updateInputTrace();
});

els.stressInput.addEventListener("input", () => {
  els.stressValue.textContent = els.stressInput.value;
  updateInputTrace();
});

els.moodInput.addEventListener("input", updateInputTrace);

els.generateButton.addEventListener("click", generateMoodcast);
els.chatSend.addEventListener("click", sendChat);
els.chatInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    sendChat();
  }
});

els.locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    els.signalNote.textContent = "这个浏览器不支持定位。可以继续用默认城市天气。";
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
      els.locationButton.textContent = "已使用当前位置天气";
      updateAgentState("live weather synced", els.routeText.textContent);
    },
    () => {
      els.locationButton.textContent = "使用当前位置天气";
      els.signalNote.textContent = "没有拿到定位权限，先继续使用默认城市天气。";
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
  );
});

async function boot() {
  try {
    await loadConnectors();
    await api("/api/health");
    els.apiStatus.textContent = "API online";
    els.apiStatus.classList.add("online");
    await loadContext();
    updateInputTrace();
    updateAgentState(engineMode === "ai" ? "ai agent ready" : "local engine ready", engineMode === "ai" ? "ai mood engine standby" : "local mood route");
    appendChatMessage("assistant", "我在。你可以直接说今天怎么了，或者问我现在更适合推进、恢复，还是先停一下。");
    renderMoodcast(await api("/api/moodcast", {
      method: "POST",
      body: JSON.stringify({
        text: "",
        energy: Number(els.energyInput.value),
        stress: Number(els.stressInput.value),
      }),
    }));
  } catch (error) {
    els.apiStatus.textContent = "API offline";
    els.signalNote.textContent = "后端没有启动。请运行 node server.js，然后打开 http://localhost:3000";
    els.engineBadge.textContent = "engine offline";
    updateAgentState("agent unavailable", "backend not responding");
    appendChatMessage("assistant", "我现在离线了，后端起来以后我就能继续和你聊。");
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

boot();
