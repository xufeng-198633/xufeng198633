/**
 * AI 助手核心模块 - 后端包装
 */
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-0e4d0a22f0d2478a8ecdfed174be195c';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

async function getCompletion(prompt, messages = []) {
  try {
    let apiMessages = [];

    // 如果传入了消息数组且包含系统提示词，则直接使用
    const hasSystem = messages && messages.some(m => m.role === 'system');
    if (!hasSystem) {
      apiMessages.push({ role: 'system', content: '你是一个专业的数据分析和文案生成助手。' });
    }

    if (messages && messages.length > 0) {
      // 过滤掉可能存在的非标准角色或空消息
      const validMessages = messages.filter(m => m.content && ['user', 'assistant', 'system'].includes(m.role));
      apiMessages.push(...validMessages);
    } else if (prompt) {
      apiMessages.push({ role: 'user', content: prompt });
    }

    if (apiMessages.length === 0 || apiMessages[apiMessages.length - 1].role !== 'user') {
        // 如果最后一条不是 user 发送的，API 可能会报错 400
        console.warn('Last message is not from user or messages are empty');
    }

    console.log('Sending to DeepSeek API:', JSON.stringify({
      model: 'deepseek-chat',
      messages: apiMessages,
      temperature: 0.7
    }, null, 2));

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('DeepSeek API Error:', errorData);
      throw new Error(`API 请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI 模块错误:', error);
    throw error;
  }
}

module.exports = {
  getCompletion
};
