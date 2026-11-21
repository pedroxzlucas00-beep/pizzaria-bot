const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_ID || '1451284713737889';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'pizzaria_garagem_123';

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    return res.send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return;
    const from = msg.from;
    const text = (msg.text?.body || '').toLowerCase();
    let reply = '';
    if (text.includes('oi') || text.includes('ola') || text.includes('menu') || text.includes('cardapio')) {
      reply = `🍕 *PIZZARIA A GARAGEM* 🍕\n\nFala! Bem-vindo!\n\nDigite:\n*1* - Ver Cardapio\n*2* - Fazer Pedido\n*3* - Falar com atendente`;
    } else if (text === '1') {
      reply = `📋 *CARDAPIO*\n\n1. Calabresa - R$ 45\n2. Frango c/ Catupiry - R$ 48\n3. Marguerita - R$ 42\n4. Portuguesa - R$ 50\n\nDigite *2* para pedir!`;
    } else if (text === '2') {
      reply = `Otimo! Me fala qual pizza voce quer e seu endereco?\nEx: *1 Calabresa, Rua X, 123*`;
    } else if (text === '3') {
      reply = `Te chamei um atendente! Ja ja te respondem aqui.`;
    } else {
      reply = `Entendi! Quer ver o cardapio? Digita *1* 🍕`;
    }
    await axios.post(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
      messaging_product: 'whatsapp',
      to: from,
      text: { body: reply }
    }, { headers: { Authorization: `Bearer ${TOKEN}` } });
  } catch (e) { console.log(e.message); }
});

app.get('/', (req,res) => res.send('Bot Pizzaria A Garagem ON'));
app.listen(process.env.PORT || 3000, () => console.log('ON'));
