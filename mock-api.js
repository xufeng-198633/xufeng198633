(function() {
  const isStaticEnv = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';
  if (!isStaticEnv) return;

  console.log('🌐 检测到静态托管环境 (GitHub Pages / 本地文件)，启用纯前端 LocalStorage 数据模式');

  const SEED_DATA = [
    {
      date: '2026-03-25', plays: 12000, likes: 960, shares: 12, collects: 45, comments: 120, danmaku: 50,
      completion_rate: 35, bounce_2s: 42, completion_5s: 65,
      avg_play_ratio: 62, avg_play_duration: 12.4,
      total_plays: 12000, avg_interaction: 9.89, avg_completion: 35,
      title: '城市晨光: 一个城市的苏醒瞬间', theme: '职场系列', status: '正常', _id: 'mock1'
    },
    {
      date: '2026-03-26', plays: 15000, likes: 1380, shares: 18, collects: 52, comments: 200, danmaku: 80,
      completion_rate: 38, bounce_2s: 39, completion_5s: 68,
      avg_play_ratio: 65, avg_play_duration: 13.5,
      total_plays: 27000, avg_interaction: 11.53, avg_completion: 36.5,
      title: '地铁早高峰里的沉默故事', theme: '职场系列', status: '正常', _id: 'mock2'
    },
    {
      date: '2026-03-27', plays: 9800, likes: 686, shares: 8, collects: 38, comments: 85, danmaku: 30,
      completion_rate: 34, bounce_2s: 45, completion_5s: 62,
      avg_play_ratio: 58, avg_play_duration: 11.8,
      total_plays: 36800, avg_interaction: 8.64, avg_completion: 35.7,
      title: '打工人的自愈时刻: 下班后的第一口面', theme: '人生感悟', status: '低预警', _id: 'mock3'
    },
    {
      date: '2026-03-28', plays: 12400, likes: 1116, shares: 12, collects: 65, comments: 150, danmaku: 60,
      completion_rate: 42, bounce_2s: 36, completion_5s: 72,
      avg_play_ratio: 72, avg_play_duration: 15.2,
      total_plays: 49200, avg_interaction: 11.31, avg_completion: 37.3,
      title: '春日公园散步计划: 寻找第一朵桃花', theme: '爱自己', status: '正常', _id: 'mock4'
    },
    {
      date: '2026-03-29', plays: 14200, likes: 1278, shares: 29, collects: 58, comments: 300, danmaku: 120,
      completion_rate: 40, bounce_2s: 38, completion_5s: 70,
      avg_play_ratio: 68, avg_play_duration: 14.6,
      total_plays: 63400, avg_interaction: 12.57, avg_completion: 37.8,
      title: '为什么我们总是害怕拒绝别人?', theme: '情感释怀', status: '正常', _id: 'mock5'
    },
    {
      date: '2026-03-30', plays: 18502, likes: 1850, shares: 18, collects: 72, comments: 400, danmaku: 150,
      completion_rate: 48, bounce_2s: 32, completion_5s: 78,
      avg_play_ratio: 78, avg_play_duration: 17.5,
      total_plays: 81902, avg_interaction: 13.46, avg_completion: 39.5,
      title: '周一早高峰的生存指南: 咖啡是唯一光', theme: '成长逆袭', status: '正常', _id: 'mock6'
    },
    {
      date: '2026-03-31', plays: 21440, likes: 2144, shares: 25, collects: 68, comments: 500, danmaku: 200,
      completion_rate: 46, bounce_2s: 34, completion_5s: 76,
      avg_play_ratio: 75, avg_play_duration: 16.8,
      total_plays: 103342, avg_interaction: 13.70, avg_completion: 40.4,
      title: '深夜的11路公交车: 这里的每个人都有故事', theme: '人生感悟', status: '正常', _id: 'mock7'
    },
    {
      date: '2026-04-01', plays: 42801, likes: 5136, shares: 44, collects: 85, comments: 1200, danmaku: 500,
      completion_rate: 52, bounce_2s: 22, completion_5s: 84,
      avg_play_ratio: 82, avg_play_duration: 18.2,
      total_plays: 146143, avg_interaction: 16.27, avg_completion: 42.5,
      title: '停止讨好: 做自己才是终极浪漫 (18s版)', theme: '爱自己', status: '爆款', _id: 'mock8'
    }
  ];

  if (!localStorage.getItem('videodata')) {
    localStorage.setItem('videodata', JSON.stringify(SEED_DATA));
  }

  function getDB() {
    return JSON.parse(localStorage.getItem('videodata') || '[]');
  }
  function saveDB(data) {
    localStorage.setItem('videodata', JSON.stringify(data));
  }

  function mockResponse(data) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data)
    });
  }

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    let url = typeof input === 'string' ? input : input.url;
    let method = (init && init.method) ? init.method.toUpperCase() : 'GET';
    
    if (!url.includes('/api/')) {
      return originalFetch.apply(this, arguments);
    }

    await new Promise(r => setTimeout(r, 150)); 
    const db = getDB();
    db.sort((a, b) => new Date(a.date) - new Date(b.date));

    try {
      if (url.endsWith('/api/data') && method === 'GET') {
        return mockResponse(db);
      }
      
      if (url.endsWith('/api/data/latest') && method === 'GET') {
        return mockResponse(db.length ? db[db.length - 1] : null);
      }

      if (url.endsWith('/api/summary') && method === 'GET') {
        if (!db.length) return mockResponse({});

        const latest = db[db.length - 1];
        const prev = db[db.length - 2] || latest;
        const totalPlays = db.reduce((s, d) => s + d.plays, 0);
        const avgCompletion = (db.reduce((s, d) => s + d.completion_rate, 0) / db.length).toFixed(1);
        const peakShare = Math.max(...db.map(d => d.shares));
        const peakShareDate = db.find(d => d.shares === peakShare)?.date?.slice(5) || '';
        const avgInteraction = (db.reduce((s, d) => s + d.avg_interaction, 0) / db.length).toFixed(2);

        const playsChange = prev.plays ? (((latest.plays - prev.plays) / prev.plays) * 100).toFixed(1) : 0;
        const completionChange = prev.completion_rate ? (latest.completion_rate - prev.completion_rate).toFixed(1) : 0;
        const interactionChange = prev.avg_interaction ? (latest.avg_interaction - prev.avg_interaction).toFixed(1) : 0;

        return mockResponse({
          totalPlays, avgCompletion: parseFloat(avgCompletion), peakShare, peakShareDate,
          avgInteraction: parseFloat(avgInteraction), playsChange: parseFloat(playsChange),
          completionChange: parseFloat(completionChange), interactionChange: parseFloat(interactionChange),
          latestDate: latest.date, recordCount: db.length
        });
      }

      if (url.endsWith('/api/data') && method === 'POST') {
        const body = JSON.parse(init.body);
        const plays = parseFloat(body.plays) || 0;
        if (plays > 0) {
          const interaction = ((parseFloat(body.likes)||0) + (parseFloat(body.shares)||0) + (parseFloat(body.collects)||0) + (parseFloat(body.comments)||0) + (parseFloat(body.danmaku)||0)) / plays * 100;
          body.avg_interaction = parseFloat(interaction.toFixed(2));
        } else {
          body.avg_interaction = 0;
        }

        const existingIdx = db.findIndex(d => d.date === body.date);
        if (existingIdx !== -1) {
          db[existingIdx] = { ...db[existingIdx], ...body };
          saveDB(db);
          return mockResponse({ success: true, action: 'updated', date: body.date });
        } else {
          body._id = Math.random().toString(36).substring(2, 9);
          db.push(body);
          saveDB(db);
          return mockResponse({ success: true, action: 'inserted', id: body._id });
        }
      }

      if (url.includes('/api/data/') && method === 'DELETE') {
        const id = url.split('/').pop();
        const newDb = db.filter(d => d._id !== id);
        saveDB(newDb);
        return mockResponse({ success: true, removed: db.length - newDb.length });
      }

      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({error: 'Not Found'}) });
    } catch(err) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({error: err.message}) });
    }
  };
})();