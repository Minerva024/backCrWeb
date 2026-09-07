
const API_KEY = 'sk-7fc80b250ca143dfa6c1cf69d1a0b163';
const API_URL = 'https://api.deepseek.com/chat/completions';

exports.chatwithdeepseek = async function chatWithDeepSeek(messages) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      stream: false
    })
  });
  let resp = await response.json()
  console.log(resp);
  
  return "Funciona ia";
}
