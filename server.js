const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = '/tmp/cautela_db.json';

function carregarDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.log('Erro ao ler DB:', e);
    }
    return {
        itens: [
            { id: 1, nome: 'Capa de Colete', codigo: 'COL-001', qtdTotal: 5, qtdDisponivel: 5 },
            { id: 2, nome: 'Colcha', codigo: 'COLCH-002', qtdTotal: 10, qtdDisponivel: 10 }
        ],
        solicitacoes: []
    };
}

function salvarDB(db) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.log('Erro ao salvar DB:', e);
    }
}

// Redirecionamento da raiz
app.get('/', (req, res) => {
    res.redirect('/militar.html');
});

// Rotas de Itens
app.get('/api/itens', (req, res) => {
    const DB = carregarDB();
    res.json(DB.itens);
});

app.post('/api/itens', (req, res) => {
    const { nome, codigo, qtdTotal } = req.body;
    const DB = carregarDB();
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
    salvarDB(DB);
    res.json({ success: true, itens: DB.itens });
});

app.delete('/api/itens/:id', (req, res) => {
    const id = req.params.id;
    const DB = carregarDB();
    DB.itens = DB.itens.filter(i => String(i.id) !== String(id));
    salvarDB(DB);
    res.json({ success: true, itens: DB.itens });
});

// Rotas de Cautelas / Solicitações
app.get('/api/solicitacoes', (req, res) => {
    const { saram } = req.query;
    const DB = carregarDB();
    if (saram) {
        const minhsSolicitacoes = DB.solicitacoes.filter(s => String(s.saram) === String(saram) && s.status !== 'DEVOLVIDO');
        return res.json(minhsSolicitacoes);
    }
    res.json(DB.solicitacoes);
});

app.post('/api/solicitacoes', (req, res) => {
    const { id, saram, nomeGuerra, itemId, itemNome, quantidade } = req.body;
    const qtdNum = Number(quantidade) || 1;
    const DB = carregarDB();

    const itemObj = DB.itens.find(i => String(i.id) === String(itemId));
    const nomeItemFinal = itemNome || (itemObj ? `${itemObj.nome} [${itemObj.codigo}]` : 'Item Indefinido');

    const solId = id || Date.now();
    let solExistente = DB.solicitacoes.find(s => String(s.id) === String(solId));

    if (!solExistente) {
        solExistente = {
            id: solId,
            saram,
            nomeGuerra,
            itemId: itemId,
            itemNome: nomeItemFinal,
            quantidade: qtdNum,
            data: new Date().toLocaleString('pt-BR'),
            status: 'PENDENTE'
        };
        DB.solicitacoes.push(solExistente);
        salvarDB(DB);
    }

    res.json({ success: true, solicitacao: solExistente });
});

app.post('/api/solicitacoes/:id/aprovar', (req, res) => {
    const id = req.params.id;
    const DB = carregarDB();
    const sol = DB.solicitacoes.find(s => String(s.id) === String(id));

    if (!sol) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    const item = DB.itens.find(i => String(i.id) === String(sol.itemId));
    const qtdNum = sol.quantidade || 1;

    sol.status = 'APROVADA';
    sol.dataAprovacao = new Date().toLocaleString('pt-BR');

    if (item) {
        item.qtdDisponivel = Math.max(0, item.qtdDisponivel - qtdNum);
        item.qtdTotal = Math.max(0, item.qtdTotal - qtdNum);
    }

    salvarDB(DB);
    res.json({ success: true, solicitacao: sol });
});

app.post('/api/solicitacoes/:id/devolver', (req, res) => {
    const id = req.params.id;
    const DB = carregarDB();
    const sol = DB.solicitacoes.find(s => String(s.id) === String(id));

    if (!sol) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    const item = DB.itens.find(i => String(i.id) === String(sol.itemId));
    const qtdNum = sol.quantidade || 1;

    sol.status = 'DEVOLVIDO';

    if (item) {
        item.qtdDisponivel += qtdNum;
        item.qtdTotal += qtdNum;
    }

    salvarDB(DB);
    res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
