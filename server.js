/**
 * 短视频数据看板 - 后端服务
 * Node.js + Express + NeDB (纯JS，无需编译)
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const Datastore = require('@seald-io/nedb');

const app = express();
const PORT = 3388;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 数据库初始化
const db = new Datastore({
  filename: path.join(__dirname, 'data', 'videodata.db'),
  autoload: true
});

// 确保 data 目录存在
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ─────────────────────────────────────────────
// 预置历史数据（仅数据库为空时写入）
// ─────────────────────────────────────────────
const seedData = [
  {
    date: '2026-03-25', plays: 12000, likes: 960, shares: 12, collects: 45,
    completion_rate: 35, bounce_2s: 42, completion_5s: 65,
    avg_play_ratio: 62, avg_play_duration: 12.4,
    total_plays: 12000, avg_interaction: 8.5, avg_completion: 35,
    title: '城市晨光: 一个城市的苏醒瞬间', theme: '城市烟火', status: '正常'
  },
  {
    date: '2026-03-26', plays: 15000, likes: 1380, shares: 18, collects: 52,
    completion_rate: 38, bounce_2s: 39, completion_5s: 68,
    avg_play_ratio: 65, avg_play_duration: 13.5,
    total_plays: 27000, avg_interaction: 9.2, avg_completion: 36.5,
    title: '地铁早高峰里的沉默故事', theme: '上班通勤', status: '正常'
  },
  {
    date: '2026-03-27', plays: 9800, likes: 686, shares: 8, collects: 38,
    completion_rate: 34, bounce_2s: 45, completion_5s: 62,
    avg_play_ratio: 58, avg_play_duration: 11.8,
    total_plays: 36800, avg_interaction: 7.8, avg_completion: 35.7,
    title: '打工人的自愈时刻: 下班后的第一口面', theme: '城市烟火', status: '低预警'
  },
  {
    date: '2026-03-28', plays: 12400, likes: 1116, shares: 12, collects: 65,
    completion_rate: 42, bounce_2s: 36, completion_5s: 72,
    avg_play_ratio: 72, avg_play_duration: 15.2,
    total_plays: 49200, avg_interaction: 11.2, avg_completion: 37.3,
    title: '春日公园散步计划: 寻找第一朵桃花', theme: '休闲时刻', status: '正常'
  },
  {
    date: '2026-03-29', plays: 14200, likes: 1278, shares: 29, collects: 58,
    completion_rate: 40, bounce_2s: 38, completion_5s: 70,
    avg_play_ratio: 68, avg_play_duration: 14.6,
    total_plays: 63400, avg_interaction: 10.5, avg_completion: 37.8,
    title: '为什么我们总是害怕拒绝别人?', theme: '停止讨好', status: '正常'
  },
  {
    date: '2026-03-30', plays: 18502, likes: 1850, shares: 18, collects: 72,
    completion_rate: 48, bounce_2s: 32, completion_5s: 78,
    avg_play_ratio: 78, avg_play_duration: 17.5,
    total_plays: 81902, avg_interaction: 12.8, avg_completion: 39.5,
    title: '周一早高峰的生存指南: 咖啡是唯一光', theme: '上班通勤', status: '正常'
  },
  {
    date: '2026-03-31', plays: 21440, likes: 2144, shares: 25, collects: 68,
    completion_rate: 46, bounce_2s: 34, completion_5s: 76,
    avg_play_ratio: 75, avg_play_duration: 16.8,
    total_plays: 103342, avg_interaction: 11.9, avg_completion: 40.4,
    title: '深夜的11路公交车: 这里的每个人都有故事', theme: '城市烟火', status: '正常'
  },
  {
    date: '2026-04-01', plays: 42801, likes: 5136, shares: 44, collects: 85,
    completion_rate: 52, bounce_2s: 22, completion_5s: 84,
    avg_play_ratio: 82, avg_play_duration: 18.2,
    total_plays: 146143, avg_interaction: 14.2, avg_completion: 42.5,
    title: '停止讨好: 做自己才是终极浪漫 (18s版)', theme: '停止讨好', status: '爆款'
  }
];

db.count({}, (err, count) => {
  if (!err && count === 0) {
    db.insert(seedData, (err2) => {
      if (!err2) console.log('✅ 历史数据已初始化');
    });
  }
});

// ─────────────────────────────────────────────
// API 路由
// ─────────────────────────────────────────────

// GET /api/data - 获取所有数据，按日期排序
app.get('/api/data', (req, res) => {
  db.find({}).sort({ date: 1 }).exec((err, docs) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(docs);
  });
});

// GET /api/data/latest - 获取最新一条数据（用于看板KPI卡片）
app.get('/api/data/latest', (req, res) => {
  db.find({}).sort({ date: -1 }).limit(1).exec((err, docs) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(docs[0] || null);
  });
});

// GET /api/summary - 获取汇总数据（用于看板顶部指标卡）
app.get('/api/summary', (req, res) => {
  db.find({}).sort({ date: 1 }).exec((err, docs) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!docs.length) return res.json({});

    const latest = docs[docs.length - 1];
    const prev = docs[docs.length - 2] || latest;
    const totalPlays = docs.reduce((s, d) => s + d.plays, 0);
    const avgCompletion = (docs.reduce((s, d) => s + d.completion_rate, 0) / docs.length).toFixed(1);
    const peakShare = Math.max(...docs.map(d => d.shares));
    const peakShareDate = docs.find(d => d.shares === peakShare)?.date?.slice(5) || '';
    const avgInteraction = (docs.reduce((s, d) => s + d.avg_interaction, 0) / docs.length).toFixed(2);

    // 环比变化
    const playsChange = prev.plays ? (((latest.plays - prev.plays) / prev.plays) * 100).toFixed(1) : 0;
    const completionChange = prev.completion_rate ? (latest.completion_rate - prev.completion_rate).toFixed(1) : 0;
    const interactionChange = prev.avg_interaction ? (latest.avg_interaction - prev.avg_interaction).toFixed(1) : 0;

    res.json({
      totalPlays,
      avgCompletion: parseFloat(avgCompletion),
      peakShare,
      peakShareDate,
      avgInteraction: parseFloat(avgInteraction),
      playsChange: parseFloat(playsChange),
      completionChange: parseFloat(completionChange),
      interactionChange: parseFloat(interactionChange),
      latestDate: latest.date,
      recordCount: docs.length
    });
  });
});

// POST /api/data - 新增一条每日数据
app.post('/api/data', (req, res) => {
  const body = req.body;
  const required = ['date', 'plays', 'likes', 'shares', 'collects',
    'completion_rate', 'bounce_2s', 'completion_5s',
    'avg_play_ratio', 'avg_play_duration', 'total_plays'];

  for (const field of required) {
    if (body[field] === undefined || body[field] === '') {
      return res.status(400).json({ error: `缺少必填字段: ${field}` });
    }
  }

  // 平均互动率自动计算：(点赞 + 分享 + 收藏) / 播放量 * 100
  const plays = parseFloat(body.plays) || 0;
  if (plays > 0) {
    const interaction = ((parseFloat(body.likes)||0) + (parseFloat(body.shares)||0) + (parseFloat(body.collects)||0)) / plays * 100;
    body.avg_interaction = parseFloat(interaction.toFixed(2));
  } else {
    body.avg_interaction = 0;
  }

  // 检查当天是否已有数据
  db.findOne({ date: body.date }, (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) {
      // 更新已有数据
      db.update({ date: body.date }, { $set: body }, {}, (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ success: true, action: 'updated', date: body.date });
      });
    } else {
      // 插入新数据
      db.insert(body, (err2, newDoc) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ success: true, action: 'inserted', id: newDoc._id });
      });
    }
  });
});

// DELETE /api/data/:id - 删除一条数据
app.delete('/api/data/:id', (req, res) => {
  db.remove({ _id: req.params.id }, {}, (err, n) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, removed: n });
  });
});

// ─────────────────────────────────────────────
// 启动服务
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   短视频数据看板 服务已启动               ║
║   http://localhost:${PORT}                  ║
║   主看板:   http://localhost:${PORT}/index.html ║
║   明细表:   http://localhost:${PORT}/details.html ║
║   数据录入: http://localhost:${PORT}/input.html  ║
╚══════════════════════════════════════════╝
  `);
});
