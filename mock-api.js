(function() {
  const isStaticEnv = window.location.hostname.includes('github.io') || (window.location.protocol === 'file:' && !window.location.hostname);
  
  if (!isStaticEnv) {
    console.log('🚀 检测到后端服务环境，mock-api 已禁用，将请求真实后端接口');
    return;
  }

  console.log('🌐 检测到纯静态环境，启用云端/LocalStorage 混合模式');

  // 从 LocalStorage 获取 GitHub 配置
  const getGHConfig = () => JSON.parse(localStorage.getItem('gh_sync_config') || '{}');

  // 获取 GitHub 文件内容
  async function fetchGHData() {
    const { token, repo, path } = getGHConfig();
    if (!token || !repo) return null;

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path || 'data/videodata.db'}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (!res.ok) return null;
      const json = await res.json();
      // GitHub 返回的是 Base64 编码的内容
      const content = decodeURIComponent(escape(atob(json.content)));
      // 解析 NeDB 格式 (每行一个 JSON) 或标准 JSON
      try {
        return JSON.parse(content);
      } catch(e) {
        // 尝试处理 NeDB 格式
        return content.trim().split('\n').map(line => JSON.parse(line));
      }
    } catch(e) {
      console.error('从 GitHub 获取数据失败:', e);
      return null;
    }
  }

  // 保存数据到 GitHub
  async function saveGHData(data) {
    const { token, repo, path } = getGHConfig();
    if (!token || !repo) return false;

    const filePath = path || 'data/videodata.db';
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

    try {
      // 1. 获取当前文件的 sha
      const getRes = await fetch(apiUrl, {
        headers: { 'Authorization': `token ${token}` }
      });
      let sha = '';
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }

      // 2. 提交新内容
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update data via Dashboard [${new Date().toLocaleString()}]`,
          content: content,
          sha: sha
        })
      });

      return putRes.ok;
    } catch(e) {
      console.error('保存数据到 GitHub 失败:', e);
      return false;
    }
  }

  const SEED_DATA = [
    {
      date: '2026-03-25', plays: 12000, likes: 960, shares: 12, collects: 45, comments: 120, danmaku: 50,
      completion_rate: 35, bounce_2s: 42, completion_5s: 65,
      avg_play_ratio: 62, avg_play_duration: 12.4,
      total_plays: 12000, avg_interaction: 9.89, avg_completion: 35,
      title: '城市晨光: 一个城市的苏醒瞬间', theme: '职场系列', status: '正常', _id: 'mock1'
    }
  ];

  // 初始化 LocalStorage
  if (!localStorage.getItem('videodata')) {
    localStorage.setItem('videodata', JSON.stringify(SEED_DATA));
  }

  async function getDB() {
    // 优先尝试从 GitHub 同步
    const ghData = await fetchGHData();
    if (ghData) {
      localStorage.setItem('videodata', JSON.stringify(ghData));
      return ghData;
    }
    return JSON.parse(localStorage.getItem('videodata') || '[]');
  }

  async function saveDB(data) {
    localStorage.setItem('videodata', JSON.stringify(data));
    // 异步同步到 GitHub
    const success = await saveGHData(data);
    if (success) console.log('✅ 数据已成功同步到 GitHub 仓库');
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
    
    // 如果是请求 GitHub API 或者是外部资源，不拦截
    if (!url.includes('/api/')) {
      return originalFetch.apply(this, arguments);
    }

    const db = await getDB();
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
        const totalPlays = db.reduce((s, d) => s + (d.plays || 0), 0);
        const avgCompletion = (db.reduce((s, d) => s + (d.completion_rate || 0), 0) / db.length).toFixed(1);
        const peakShare = Math.max(...db.map(d => d.shares || 0));
        const peakShareDate = db.find(d => d.shares === peakShare)?.date?.slice(5) || '';
        const avgInteraction = (db.reduce((s, d) => s + (d.avg_interaction || 0), 0) / db.length).toFixed(2);

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
          await saveDB(db);
          return mockResponse({ success: true, action: 'updated', date: body.date });
        } else {
          body._id = Math.random().toString(36).substring(2, 9);
          db.push(body);
          await saveDB(db);
          return mockResponse({ success: true, action: 'inserted', id: body._id });
        }
      }

      if (url.includes('/api/data/') && method === 'DELETE') {
        const id = url.split('/').pop();
        const newDb = db.filter(d => d._id !== id);
        await saveDB(newDb);
        return mockResponse({ success: true, removed: db.length - newDb.length });
      }

      return originalFetch.apply(this, arguments);
    } catch(err) {
      console.error('Mock API Error:', err);
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({error: err.message}) });
    }
  };

  // 在页面顶部注入一个醒目的警告横幅（如果是 GitHub Pages 环境且没配置 Token）
  window.addEventListener('DOMContentLoaded', () => {
    const { token } = getGHConfig();
    if (!token && window.location.hostname.includes('github.io')) {
      const banner = document.createElement('div');
      banner.id = 'gh-sync-warning';
      banner.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#f59e0b; color:#78350f; padding:8px; text-align:center; font-size:12px; z-index:9999; font-weight:bold; border-bottom:1px solid #d97706; box-shadow:0 2px 4px rgba(0,0,0,0.1);';
      banner.innerHTML = `
        <iconify-icon icon="ri:alert-line" style="vertical-align:middle; margin-right:4px;"></iconify-icon>
        未配置 GitHub 云端同步。录入的数据仅保存在当前浏览器，换台电脑会丢失。
        <button onclick="showGHSyncModal()" style="text-decoration:underline; margin-left:10px; color:#92400e; font-weight:bold;">点此配置云端同步</button>
      `;
      document.body.prepend(banner);
      document.body.style.paddingTop = '36px';
    }
  });

})();