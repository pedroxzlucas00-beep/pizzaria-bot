const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const VERIFY = process.env.VERIFY_TOKEN || 'pizzaria123';

// COLOQUE AQUI OS LINKS DO IMBB - DEPOIS QUE VOCÊ SUBIR AS FOTOS
const BASE = 'https://raw.githubusercontent.com/pedroxzLucas00-beep/pizzaria-bot/main/';
const FOTOS = {
  salgadas: [BASE+'IMG-20261108-WA0213.jpg', BASE+'IMG-20261108-WA0214.jpg', BASE+'IMG-20261108-WA0215.jpg'],
  doces: [BASE+'IMG-20261108-WA0216.jpg', BASE+'IMG-20261108-WA0217.jpg'],
  pasteis: [BASE+'IMG-20261108-WA0218.jpg', BASE+'IMG-20261108-WA0219.jpg'],
  bebidas: [BASE+'IMG-20261108-WA0220.jpg', BASE+'IMG-20261108-WA0221.jpg']
};

async function enviarVariasFotos(to, lista, legenda) {
  for (const link of lista) {
    await enviarFoto(to, link, legenda);
  }
}

const sessoes = {};

async function enviarTexto(to, texto) {
  await axios.post(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp', to, type: 'text', text: { body: texto }
  }, { headers: { Authorization: `Bearer ${TOKEN}` } });
}

async function enviarFoto(to, link, legenda) {
  await axios.post(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    messaging_product: 'whatsapp', to, type: 'image',
    image: { link, caption: legenda }
  }, { headers: { Authorization: `Bearer ${TOKEN}` } });
}

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY) return res.send(req.query['hub.challenge']);
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg || !msg.text) return;
    const from = msg.from;
    const texto = msg.text.body.trim().toLowerCase();
    if (!sessoes[from]) sessoes[from] = { etapa: 'inicio' };
    const s = sessoes[from];

    // INICIO
    if (texto === 'oi' || texto === 'ola' || texto === 'menu' || texto === '0' || s.etapa === 'inicio') {
      s.etapa = 'menu';
      await enviarTexto(from, `🍕 *PIZZARIA A GARAGEM* 🍕\nFala! Bem-vindo!\n\nDigite:\n*1* - Ver Cardápio\n*2* - Fazer Pedido\n*3* - Falar com atendente`);
      return;
    }

    // MENU PRINCIPAL
    if (s.etapa === 'menu') {
      if (texto === '1') {
        s.etapa = 'cardapio';
        await enviarTexto(from, `🍕 *CARDÁPIO A GARAGEM*\nDigite:\n*1* - Pizzas Salgadas\n*2* - Pizzas Doces\n*3* - Pastéis / Porções\n*4* - Bebidas / Açaí\n*0* - Voltar`);
        return;
      }
      if (texto === '2') {
        s.etapa = 'pedido_item';
        await enviarTexto(from, `Beleza! Qual o número do item? Ex: *48*\nSe não sabe, digita *1* pra ver o cardápio.`);
        return;
      }
      if (texto === '3') {
        s.etapa = 'atendente';
        await enviarTexto(from, `Blz! Um atendente já vai te chamar. Só aguardar um pouquinho! 🙏\nDigite *0* pra voltar ao menu.`);
        return;
      }
    }

    // CARDAPIO - ENVIA FOTO
    if (s.etapa === 'cardapio') {
            if (texto === '1') { await enviarVariasFotos(from, FOTOS.salgadas, '🍕 Pizzas Salgadas - A Garagem'); }
      if (texto === '2') { await enviarVariasFotos(from, FOTOS.doces, '🍫 Pizzas Doces - A Garagem'); }
      if (texto === '3') { await enviarVariasFotos(from, FOTOS.pasteis, '🥟 Pastéis / Porções - A Garagem'); }
      if (texto === '4') { await enviarVariasFotos(from, FOTOS.bebidas, '🥤 Bebidas / Açaí - A Garagem'); }
      if (texto === '0') { s.etapa = 'inicio'; await enviarTexto(from, `Digite *oi* pra voltar ao menu.`); return; }
      await enviarTexto(from, `Quer ver outra parte? Digite 1, 2, 3 ou 4.\nOu digite *2* pra fazer pedido.`);
      if (texto === '2') s.etapa = 'menu';
      return;
    }

    // PEDIDO PASSO A PASSO - SEM BUG
    if (s.etapa === 'pedido_item') {
      s.item = texto;
      s.etapa = 'pedido_tamanho';
      await enviarTexto(from, `Boa! Item *${texto}* anotado.\nQual o tamanho? Digite: *M*, *G*, *F* ou *GG*`);
      return;
    }
    if (s.etapa === 'pedido_tamanho') {
      s.tamanho = texto.toUpperCase();
      s.etapa = 'pedido_endereco';
      await enviarTexto(from, `Tamanho *${s.tamanho}* anotado.\nAgora me manda seu endereço completo: Rua, número, bairro.`);
      return;
    }
    if (s.etapa === 'pedido_endereco') {
      s.endereco = texto;
      s.etapa = 'pedido_pagamento';
      await enviarTexto(from, `Endereço anotado: ${texto}\nQual a forma de pagamento? *Pix* ou *Cartão*?`);
      return;
    }
    if (s.etapa === 'pedido_pagamento') {
      s.pagamento = texto;
      s.etapa = 'menu';
      await enviarTexto(from, `✅ *PEDIDO CONFIRMADO!*\n\nItem: ${s.item}\nTamanho: ${s.tamanho}\nEndereço: ${s.endereco}\nPagamento: ${s.pagamento}\n\nJá estamos preparando! Obrigado! 🍕\n\nDigite *oi* pra novo pedido.`);
      return;
    }

  } catch (e) { console.log(e.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Rodando ' + PORT));
