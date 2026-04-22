# 私人 DJ 电台架构

这张项目不是要把架构图画到页面上，而是按这个结构实现产品。

## 1. 播放器界面

位置：`index.html`、`styles.css`、`app.js`

职责：

- 展示当前播放歌曲
- 控制播放、暂停、上一首、下一首
- 导入歌单
- 选择心情、能量、场景提示
- 调用本地服务生成播放队列

未来要变成 PWA：

- `manifest.webmanifest`
- `sw.js`
- 离线缓存最近歌单和播放队列

## 2. 本地服务器

位置：`server.js`

职责：

- 保存当前歌单和播放队列
- 统一解析 CSV / JSON / 平台歌单
- 根据心情、能量、天气、时间生成推荐队列
- 保护 API key，不让密钥暴露在浏览器里
- 负责连接外部 API

当前已有接口：

- `GET /api/health`
- `GET /api/now`
- `GET /api/connectors`
- `GET /api/sample-playlist`
- `POST /api/playlist/import`
- `POST /api/radio/generate`

## 3. 几个 API

这些 API 不应该直接写在前端，而应该接在 `server.js` 后面。

### 音乐歌单 API

目标：读取你的真实歌单。

候选：

- Spotify API
- Apple Music API
- 网易云音乐第三方方案
- 本地音乐文件扫描

统一输出格式：

```json
{
  "title": "夜曲",
  "artist": "周杰伦",
  "tags": ["华语", "夜晚", "安静"],
  "energy": 58,
  "audioUrl": ""
}
```

### AI DJ API

目标：让 DJ 会解释、会串场、会根据你的口味重排。

输入：

- 当前歌单
- 当前时间
- 天气
- 用户心情
- 历史播放记录

输出：

- 推荐队列
- 每首歌推荐理由
- DJ 串词

### 天气 API

目标：让电台知道现在是雨天、晴天、夜晚、通勤、运动前后。

候选：

- OpenWeather
- 和风天气

### 语音 API

目标：把 DJ 串词读出来。

候选：

- Fish Audio
- OpenAI TTS

### 设备控制 API

目标：把音乐推到音箱或本地播放器。

候选：

- UPnP / DLNA
- AirPlay
- 本地播放器命令

## 推荐开发顺序

1. 先把 UI 和本地 Node 服务跑顺
2. 接一个真实歌单来源
3. 接 AI DJ，替换现在的规则推荐
4. 接天气，让推荐更像私人电台
5. 接真实音频播放源
6. 最后再做登录、数据库和线上部署
