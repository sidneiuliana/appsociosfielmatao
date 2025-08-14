# Sistema de Gerenciamento de Produtos
## Manual de Implementação e Execução

### 📋 Visão Geral
Sistema completo para gerenciamento de produtos com funcionalidades de:
- Registro de produtos com QR codes automáticos
- Controle de estoque em tempo real
- Criação e impressão de tickets
- Sistema de resgate/baixa de tickets

### 🏗️ Arquitetura
- **Backend**: FastAPI + MongoDB + Python
- **Frontend**: React + Shadcn/ui + Tailwind CSS
- **Banco de Dados**: MongoDB
- **Ambiente**: Kubernetes Container

---

## 🚀 Configuração e Instalação

### Pré-requisitos
- Python 3.8+
- Node.js 16+
- MongoDB
- Yarn (gerenciador de pacotes)

### 1. Estrutura do Projeto
```
/app/
├── backend/
│   ├── server.py           # Aplicação FastAPI principal
│   ├── requirements.txt    # Dependências Python
│   └── .env               # Variáveis de ambiente backend
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProductManagement.js    # Interface principal
│   │   │   ├── PrintableTicket.js     # Componente de impressão
│   │   │   └── ui/                    # Componentes Shadcn/ui
│   │   ├── App.js         # Componente raiz React
│   │   └── index.js       # Entry point React
│   ├── package.json       # Dependências Node.js
│   └── .env              # Variáveis de ambiente frontend
└── README.md
```

### 2. Configuração do Backend

#### Dependências (requirements.txt)
```txt
fastapi==0.110.1
uvicorn==0.25.0
python-dotenv>=1.0.1
pymongo==4.5.0
motor==3.3.1
pydantic>=2.6.4
qrcode[pil]>=7.4.2
python-multipart>=0.0.9
```

#### Variáveis de Ambiente (.env)
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="product_management"
```

#### Instalação Backend
```bash
cd /app/backend
pip install -r requirements.txt
```

### 3. Configuração do Frontend

#### Dependências Principais
- React 19.0.0
- Shadcn/ui components
- Tailwind CSS
- Sonner (notifications)
- Axios (HTTP client)

#### Variáveis de Ambiente (.env)
```env
REACT_APP_BACKEND_URL=https://seu-backend-url.com
WDS_SOCKET_PORT=443
```

#### Instalação Frontend
```bash
cd /app/frontend
yarn install
```

---

## 🏃\u200d♂️ Execução da Aplicação

### Usando Supervisor (Recomendado)
```bash
# Iniciar todos os serviços
sudo supervisorctl restart all

# Verificar status dos serviços
sudo supervisorctl status

# Serviços individuais
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### Execução Manual (Desenvolvimento)

#### Backend
```bash
cd /app/backend
#####uvicorn server:app --host 0.0.0.0 --port 8001 --reload
uvicorn server:app --host 127.0.0.1 --port 5025 --reload
#####uvicorn server:app --host 127.0.0.1 --port 5025 --reload```




#### Frontend
```bash
cd /app/frontend
yarn start
```

#### MongoDB
```bash
sudo supervisorctl start mongodb
```

---

## 📖 Como Usar a Aplicação

### 1. Acesso à Aplicação
- Abra o navegador e acesse a URL fornecida
- A interface principal mostrará duas abas: "Produtos" e "Tickets"

### 2. Gerenciamento de Produtos

#### Criar Novo Produto
1. Clique no botão **"Novo Produto"**
2. Preencha os campos:
   - **ID do Produto**: Identificador único (ex: PROD-001)
   - **Nome**: Nome do produto
   - **Valor**: Preço em reais
   - **Estoque**: Quantidade disponível
3. Clique em **"Criar Produto"**
4. QR Code será gerado automaticamente

#### Visualizar Produtos
- Produtos aparecem em cards com informações:
  - Nome e ID do produto
  - Valor em reais
  - Badge de estoque (verde: disponível, vermelho: esgotado)
- Botões disponíveis:
  - **"Ver QR Code"**: Exibe QR code do produto
  - **"Criar Tickets"**: Gera tickets para o produto

### 3. Sistema de QR Codes

#### Visualizar QR Code
1. Clique em **"Ver QR Code"** no produto desejado
2. Modal mostra:
   - Imagem do QR Code
   - Dados textuais contidos no QR
   - Informações do produto

#### Conteúdo do QR Code
```
Product: Nome do Produto
ID: PRODUTO-ID
Value: $XXX.XX
```

### 4. Criação e Impressão de Tickets

#### Criar Tickets
1. Clique em **"Criar Tickets"** no produto
2. Defina a quantidade desejada
3. Sistema valida estoque disponível
4. Confirme a criação
5. Interface de impressão abre automaticamente

#### Impressão de Tickets
- Interface exibe tickets formatados para impressão
- Cada ticket contém:
  - Número único do ticket
  - Nome e ID do produto
  - Valor
  - QR Code do produto
  - Data/hora de criação
- Clique em **"🖨️ Imprimir Tickets"** para imprimir
- Layout otimizado para impressão A4

### 5. Gerenciamento de Tickets

#### Visualizar Tickets
1. Clique na aba **"Tickets"**
2. Tabela mostra todos os tickets:
   - Número do ticket
   - Produto vinculado
   - Valor
   - Status (Ativo/Resgatado)
   - Data de criação
   - Ações disponíveis

#### Resgatar Tickets (Baixa)
1. Na aba "Tickets", localize ticket ativo
2. Clique em **"Resgatar"**
3. Status muda para "Resgatado"
4. Data de resgate é registrada
5. Botão de resgate desaparece

---

## 🔧 API Endpoints

### Produtos
```http
# Criar produto
POST /api/products
{
  "product_id": "PROD-001",
  "name": "Nome do Produto",
  "value": 99.99,
  "stock": 10
}

# Listar produtos
GET /api/products

# Buscar produto específico
GET /api/products/{product_id}

# Atualizar produto
PUT /api/products/{product_id}
{
  "name": "Novo Nome",
  "value": 199.99,
  "stock": 15
}

# Deletar produto
DELETE /api/products/{product_id}
```

### Tickets
```http
# Criar tickets
POST /api/tickets
{
  "product_id": "PROD-001",
  "quantity": 5
}

# Listar todos os tickets
GET /api/tickets

# Tickets por produto
GET /api/tickets/product/{product_id}

# Resgatar ticket
POST /api/tickets/redeem
{
  "ticket_id": "uuid-do-ticket"
}

# Buscar ticket específico
GET /api/tickets/{ticket_id}
```

---

## 🎨 Customização da Interface

### Componentes Shadcn/ui Utilizados
- Button, Input, Label
- Card, Dialog, Table
- Badge, Alert, Tabs
- Toast notifications (Sonner)

### Estilização
- **Framework**: Tailwind CSS
- **Tema**: Moderno e limpo
- **Responsivo**: Adaptável a diferentes tamanhos de tela
- **Cores**: Verde para valores, vermelho para alertas

---

## 🔍 Troubleshooting

### Problemas Comuns

#### Backend não inicia
```bash
# Verificar logs do supervisor
tail -f /var/log/supervisor/backend.*.log

# Verificar se MongoDB está rodando
sudo supervisorctl status mongodb

# Reinstalar dependências
cd /app/backend && pip install -r requirements.txt
```

#### Frontend não carrega
```bash
# Verificar logs do frontend
tail -f /var/log/supervisor/frontend.*.log

# Verificar variáveis de ambiente
cat /app/frontend/.env

# Reinstalar dependências
cd /app/frontend && yarn install
```

#### Erro de CORS
- Verifique se `REACT_APP_BACKEND_URL` está correto
- Confirme que backend está rodando na porta 8001
- Verifique configuração de CORS no server.py

#### QR Codes não aparecem
- Confirme que biblioteca `qrcode[pil]` está instalada
- Verifique se produto foi criado corretamente
- Teste endpoint `/api/products/{id}` diretamente

### Comandos Úteis

```bash
# Reiniciar tudo
sudo supervisorctl restart all

# Ver status dos serviços
sudo supervisorctl status

# Logs em tempo real
tail -f /var/log/supervisor/*.log

# Testar API diretamente
curl https://seu-backend-url.com/api/products

# Verificar conectividade MongoDB
mongo --eval "db.adminCommand('ismaster')"
```

---

## 📊 Monitoramento

### Métricas Importantes
- **Produtos cadastrados**: Total na base
- **Tickets criados**: Por período
- **Taxa de resgate**: Tickets resgatados/total
- **Estoque**: Produtos com baixo estoque

### Logs de Aplicação
- **Backend**: `/var/log/supervisor/backend.*.log`
- **Frontend**: `/var/log/supervisor/frontend.*.log`
- **MongoDB**: `/var/log/mongodb/mongodb.log`

---

## 🔒 Segurança

### Considerações
- IDs únicos (UUID) para prevenir conflitos
- Validação de dados no backend
- Sanitização de inputs no frontend
- Controle de CORS configurado

### Backup
```bash
# Backup MongoDB
mongodump --db product_management --out backup/

# Restore MongoDB
mongorestore --db product_management backup/product_management/
```

---

## 📞 Suporte

### Estrutura de Dados

#### Produto
```json
{
  "id": "uuid",
  "product_id": "PROD-001",
  "name": "Nome do Produto",
  "value": 99.99,
  "stock": 10,
  "qr_code_data": "texto-do-qr",
  "qr_code_image": "base64-image",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

#### Ticket
```json
{
  "id": "uuid",
  "product_id": "PROD-001",
  "product_name": "Nome do Produto",
  "product_value": 99.99,
  "ticket_number": "12345678",
  "quantity": 1,
  "is_redeemed": false,
  "created_at": "2024-01-01T00:00:00",
  "redeemed_at": null
}
```

---

**Versão**: 1.0  
**Data**: Janeiro 2024  
**Desenvolvido**: Sistema completo de gerenciamento de produtos com QR codes
