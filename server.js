const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Banco de Dados Serverless Persistente em Memória Global
global.DB = global.DB || {
    usuarios: [
        { saram: '1234567', nomeGuerra: 'Silva', senha: '123' },
        { saram: '7654321', nomeGuerra: 'Santos', senha: '123' }
    ],
    itens: [
        { id: 1, nome: 'Capa de Colete', codigo: 'COL-001', qtdTotal: 5, qtdDisponivel: 5 },
        { id: 2, nome: 'Colcha', codigo: 'COLCH-002', qtdTotal: 10, qtdDisponivel: 10 }
    ],
    solicitacoes: []
};
const DB = global.DB;

// Rotas de Autenticação
app.post('/api/login', (req, res) => {
    const { saram, senha, nomeGuerra } = req.body;
    let usuario = DB.usuarios.find(u => u.saram === saram);
    if (!usuario) {
        usuario = { saram, nomeGuerra: nomeGuerra || saram, senha: senha || '123' };
        DB.usuarios.push(usuario);
    }
    return res.json({ success: true, usuario });
});

// Rotas de Itens
app.get('/api/itens', (req, res) => {
    res.json(DB.itens);
});

app.post('/api/itens', (req, res) => {
    const { nome, codigo, qtdTotal } = req.body;
    const itemExistente = DB.itens.find(i => i.codigo === codigo);
    if (itemExistente) {
        itemExistente.qtdTotal += Number(qtdTotal);
        itemExistente.qtdDisponivel += Number(qtdTotal);
    } else {
        DB.itens.push({
            id: Date.now(),
            nome,
            codigo,
            qtdTotal: Number(qtdTotal),
            qtdDisponivel: Number(qtdTotal)
        });
    }
    res.json({ success: true, itens: DB.itens });
});

app.delete('/api/itens/:id', (req, res) => {
    const id = Number(req.params.id);
    DB.itens = DB.itens.filter(i => i.id !== id);
    res.json({ success: true, itens: DB.itens });
});

// Rotas de Cautelas / Solicitações
app.get('/api/solicitacoes', (req, res) => {
    const { saram } = req.query;
    if (saram) {
        // Filtro por militar (mostra apenas cautelas ativas/pendentes do próprio militar)
        const minhsSolicitacoes = DB.solicitacoes.filter(s => String(s.saram) === String(saram) && s.status !== 'DEVOLVIDO');
        return res.json(minhsSolicitacoes);
    }
    // Para o Admin (retorna todas as solicitações)
    res.json(DB.solicitacoes);
});

app.post('/api/solicitacoes', (req, res) => {
    const { id, saram, nomeGuerra, itemId, quantidade } = req.body;
    const qtdNum = Number(quantidade) || 1;
    const item = DB.itens.find(i => String(i.id) === String(itemId));

    if (!item) {
        return res.status(404).json({ error: 'Item não encontrado no estoque' });
    }

    const solId = id || Date.now();
    let solExistente = DB.solicitacoes.find(s => String(s.id) === String(solId));

    if (!solExistente) {
        solExistente = {
            id: solId,
            saram,
            nomeGuerra,
            itemId: item.id,
            itemNome: `${item.nome} [${item.codigo}]`,
            quantidade: qtdNum,
            data: new Date().toLocaleString('pt-BR'),
            status: 'PENDENTE'
        };
        DB.solicitacoes.push(solExistente);
    }

    res.json({ success: true, solicitacao: solExistente });
});

app.post('/api/solicitacoes/:id/aprovar', (req, res) => {
    const id = req.params.id;
    const sol = DB.solicitacoes.find(s => String(s.id) === String(id));
    if (!sol) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    const item = DB.itens.find(i => String(i.id) === String(sol.itemId));
    const qtdNum = sol.quantidade || 1;

    if (item && item.qtdDisponivel >= qtdNum) {
        sol.status = 'APROVADA';
        sol.dataAprovacao = new Date().toLocaleString('pt-BR');
        item.qtdDisponivel -= qtdNum;
        item.qtdTotal -= qtdNum;
        return res.json({ success: true, solicitacao: sol });
    }
    res.status(400).json({ error: 'Estoque insuficiente' });
});

app.post('/api/solicitacoes/:id/devolver', (req, res) => {
    const id = req.params.id;
    const sol = DB.solicitacoes.find(s => String(s.id) === String(id));
    if (!sol) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    const item = DB.itens.find(i => String(i.id) === String(sol.itemId));
    const qtdNum = sol.quantidade || 1;

    if (item) {
        sol.status = 'DEVOLVIDO';
        item.qtdDisponivel += qtdNum;
        item.qtdTotal += qtdNum;
        return res.json({ success: true });
    }
    res.status(400).json({ error: 'Erro ao devolver' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
