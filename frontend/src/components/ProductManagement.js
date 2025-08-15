import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import PrintableTicket from './PrintableTicket';
import { QrReader } from 'react-qr-reader'; // Adicione este import

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;



const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [productTicketCounts, setProductTicketCounts] = useState({});   
 
  // Form states
  const [newProduct, setNewProduct] = useState({
    name: '',
    value: '',
    stock: ''
  });
  const [ticketQuantity, setTicketQuantity] = useState(1);
  
  // Dialog states
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [stockToAdd, setStockToAdd] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditProductDialog, setShowEditProductDialog] = useState(false);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const productData = {
        name: editingProduct.name,
        value: parseFloat(editingProduct.value),
        stock: parseInt(editingProduct.stock)
      };
      await axios.put(`${API}/products/${editingProduct.product_id}`, productData);
      toast.success('Produto atualizado com sucesso!');
      setShowEditProductDialog(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(typeof error.response?.data?.detail === 'object' ? JSON.stringify(error.response.data.detail) : error.response?.data?.detail || 'Erro ao atualizar produto');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tickets
  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API}/tickets`);
      setTickets(response.data);

      // Calculate ticket counts per product
      const counts = {};
      response.data.forEach(ticket => {
        if (ticket.product_id) {
          counts[ticket.product_id] = (counts[ticket.product_id] || 0) + 1;
        }
      });
      setProductTicketCounts(counts);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };


  useEffect(() => {
    fetchProducts();
    fetchTickets();
  }, []);

  // Edit product
  const handleEditProduct = (product) => {
    setEditingProduct({ ...product });
    setShowEditProductDialog(true);
  };

  // Create product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const productData = {
        ...newProduct,
        value: parseFloat(newProduct.value),
        stock: parseInt(newProduct.stock)
      };
      
      await axios.post(`${API}/products`, productData);
      toast.success('Produto criado com sucesso!');
      
      setNewProduct({ name: '', value: '', stock: '' });
      setShowProductDialog(false);
      fetchProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(typeof error.response?.data?.detail === 'object' ? JSON.stringify(error.response.data.detail) : error.response?.data?.detail || 'Erro ao criar produto');
    } finally {
      setLoading(false);
    }
  };







  // Create tickets
  const handleCreateTickets = async () => {
    if (!selectedProduct) return;
    
    try {
      setLoading(true);
      const response = await axios.post(`${API}/tickets`, {
        product_id: selectedProduct.product_id,
        quantity: parseInt(ticketQuantity)
      });
      
      toast.success(`${ticketQuantity} ticket(s) criado(s) com sucesso!`);
      setShowTicketDialog(false);
      
      // Show printable tickets
      setPrintData({
        tickets: response.data,
        product: selectedProduct
      });
      setShowPrintDialog(true);
      
      setTicketQuantity(1);
      fetchProducts(); // Refresh to update stock
      fetchTickets();
    } catch (error) {
      console.error('Error creating tickets:', error);
      toast.error('Erro ao criar tickets. Verifique se o produto está ativo e se há estoque suficiente.');
    } finally {
      setLoading(false);
    }
  };

  // Redeem ticket
  const handleRedeemTicket = async (ticketId) => {
    try {
      setLoading(true);
      await axios.post(`${API}/tickets/redeem`, { ticket_id: ticketId });
      toast.success('Ticket resgatado com sucesso!');
      fetchTickets();
    } catch (error) {
      console.error('Error redeeming ticket:', error);
      toast.error(typeof error.response?.data?.detail === 'object' ? JSON.stringify(error.response.data.detail) : error.response?.data?.detail || 'Erro ao resgatar ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (productId) => {
    const quantity = parseInt(stockToAdd[productId]);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Por favor, insira uma quantidade válida para adicionar ao estoque.');
      return;
    }
    try {
      setLoading(true);
      await axios.put(`${API}/products/${productId}`, { stock: quantity });
      toast.success('Estoque atualizado com sucesso!');
      fetchProducts(); // Refresh product list
      setStockToAdd({ ...stockToAdd, [productId]: '' }); // Clear input
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error('Erro ao adicionar estoque.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProductStatus = async (productId, newStatus) => {
    try {
      setLoading(true);
      await axios.put(`${API}/products/${productId}`, { status: newStatus });
      toast.success(`Produto ${newStatus === 'active' ? 'habilitado' : 'desabilitado'} com sucesso!`);
      fetchProducts();
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error('Erro ao alterar status do produto.');
    } finally {
      setLoading(false);
    }
  };

  // Show QR Code
  const showQRCode = (product) => {
    setSelectedProduct(product);
    setShowQRDialog(true);
  };

//Mimhas alteracoes Inicio
const [searchTerm, setSearchTerm] = useState('');
const [selectedComboProduct, setSelectedComboProduct] = useState(null);

const filteredProducts = products.filter((product) =>
  product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  product.product_id.toLowerCase().includes(searchTerm.toLowerCase())
);

  // Função para processar o QR Code lido
  const handleScan = async (data) => {
    if (data) {
      setShowQRScanner(false);
      try {
        setLoading(true);
        // Supondo que o QR code contenha o ticket_number
        const ticketNumber = data;
        // Busca o ticket pelo número
        const ticket = tickets.find(t => t.ticket_number === ticketNumber);
        if (!ticket) {
          toast.error('Ticket não encontrado!');
          return;
        }
        await handleRedeemTicket(ticket.id);
        toast.success('Ticket resgatado e estoque estornado!');
      } catch (error) {
        toast.error('Erro ao processar o ticket!');
      } finally {
        setLoading(false);
      }
    }
  };
 
   const handleError = (err) => {
    toast.error('Erro ao acessar a câmera!');
  }; 


//Minhas alteraacoes fim

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Sistema de Gerenciamento de Produtos</h1>
      
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Produtos</h2>
            <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
              <DialogTrigger asChild>
                <Button>Novo Produto</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Produto</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do produto. Um QR code será gerado automaticamente.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateProduct} className="space-y-4">

                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="Nome do produto"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="value">Valor (R$)</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      value={newProduct.value}
                      onChange={(e) => setNewProduct({...newProduct, value: e.target.value})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Estoque</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                      placeholder="0"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowProductDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Criando...' : 'Criar Produto'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
{/* Minha implemnetacao inicio */}
  {/* Combobox de busca de produtos */}
  <div className="mb-4 max-w-md">
    <Label htmlFor="product-search">Buscar Produto</Label>
    <Input
      id="product-search"
      placeholder="Digite o nome ou ID do produto"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      autoComplete="off"
    />
    {searchTerm && (
      <div className="border rounded bg-white shadow max-h-48 overflow-auto absolute z-10 w-full">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${selectedComboProduct?.id === product.id ? '' : 'bg-gray-200'}`}
              onClick={() => {
                setSelectedComboProduct(product);
                setSearchTerm(''); // Clear search term to hide results

              }}
            >
              {product.name} 
            </div>
          ))
        ) : (
          <div className="px-4 py-2 text-gray-500">Nenhum produto encontrado</div>
        )}
      </div>
    )}
  </div>

  {/* Cards de produtos filtrados */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {(selectedComboProduct ? [selectedComboProduct] : filteredProducts).map((product) => (
      <Card key={product.id}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>{product.name}</span>
            <Badge variant={product.stock > 0 ? "default" : "destructive"}>
              {product.stock} em estoque
            </Badge>
            <Badge variant="secondary">
              {productTicketCounts[product.product_id] || 0} tickets impressos
            </Badge>
          </CardTitle>
          <CardDescription>ID: {product.product_id}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-gray-400">R$ {product.value.toFixed(2)}</p>
          <p className="text-sm text-gray-600">Estoque: {product.stock}</p>
          <p className="text-sm text-gray-600">Status: {product.status === 'active' ? 'Ativo' : 'Inativo'}</p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => showQRCode(product)}
          >
            Ver QR Code
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleEditProduct(product)}
          >
            Editar
          </Button>

{/*                   
          <div className="flex items-center space-x-2">
            <input
              type="number"
              placeholder="Qtd"
              value={stockToAdd[product.product_id] || ''}
              onChange={(e) => {
                const value = e.target.value;
                setStockToAdd(prevState => ({
                  ...prevState,
                  [product.product_id]: value
                }));
              }}
              className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30 md:text-sm w-24"
            />
            <Button onClick={() => handleAddStock(product.product_id)}>+</Button>
          </div>
*/}
          <Button 
            size="sm"
            onClick={() => {
              setSelectedProduct(product);
              setShowTicketDialog(true);
            }}
            disabled={product.stock === 0}
          >
            Criar Tickets
          </Button>
{/*
          <Button onClick={() => handleToggleProductStatus(product.product_id, product.status === 'active' ? 'inactive' : 'active')}>
            {product.status === 'active' ? 'Desabilitar' : 'Habilitar'}
          </Button>
*/}
        </CardFooter>
      </Card>
    ))}
    </div>
{/* Minha implementacao fim */}



  {/*         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{product.name}</span>
                    <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                      {product.stock} em estoque
                    </Badge>
                  </CardTitle>
                  <CardDescription>ID: {product.product_id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">R$ {product.value.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Estoque: {product.stock}</p>
                  <p className="text-sm text-gray-600">Impresso: {product.printed_quantity}</p>
                  <p className="text-sm text-gray-600">Status: {product.status === 'active' ? 'Ativo' : 'Inativo'}</p>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => showQRCode(product)}
                  >
                    Ver QR Code
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder="Add Stock"
                      value={stockToAdd[product.product_id] || ''}
                      onChange={(e) => setStockToAdd({ ...stockToAdd, [product.product_id]: e.target.value })}
                      className="w-32"
                    />
                    <Button onClick={() => handleAddStock(product.product_id)}>Add Stock</Button>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowTicketDialog(true);
                    }}
                    disabled={product.stock === 0}
                  >
                    Criar Tickets
                  </Button>
                  <Button onClick={() => handleToggleProductStatus(product.product_id, product.status === 'active' ? 'inactive' : 'active')}>
                    {product.status === 'active' ? 'Desabilitar' : 'Habilitar'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div> */}
        {/* Edit Product Dialog */}
        <Dialog open={showEditProductDialog} onOpenChange={setShowEditProductDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Produto</DialogTitle>
              <DialogDescription>
                Altere os detalhes do produto aqui.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateProduct}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingProduct?.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-value" className="text-right">
                    Valor
                  </Label>
                  <Input
                    id="edit-value"
                    type="number"
                    step="0.01"
                    value={editingProduct?.value || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, value: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-stock" className="text-right">
                    Estoque
                  </Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    value={editingProduct?.stock || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </TabsContent>

        {/* Tickets Tab */}
     {/*    <TabsContent value="tickets" className="space-y-4">
          <h2 className="text-2xl font-semibold">Tickets</h2>
          
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número do Ticket</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
           <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono">{ticket.ticket_number}</TableCell>
                    <TableCell>{ticket.product_name}</TableCell>
                    <TableCell>R$ {ticket.product_value.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.is_redeemed ? "destructive" : "default"}>
                        {ticket.is_redeemed ? 'Resgatado' : 'Ativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(ticket.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {!ticket.is_redeemed && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRedeemTicket(ticket.id)}
                          disabled={loading}
                        >
                          Resgatar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody> 
            </Table>
          </div>
        </TabsContent> */}

{/* minha inicio */}
<TabsContent value="tickets" className="space-y-4">
  <h2 className="text-2xl font-semibold">Tickets</h2>

  <div className="mb-4">
    <Button onClick={() => setShowQRScanner(true)}>
      Ler QR Code do Ticket
    </Button>
  </div>

  {showQRScanner && (
    <div className="mb-4">
      <QrReader
        delay={300}
        onError={handleError}
        onScan={handleScan}
        style={{ width: '100%' }}
        facingMode="environment"
      />
      <Button variant="outline" onClick={() => setShowQRScanner(false)} className="mt-2">
        Cancelar
      </Button>
    </div>
  )}

  <div className="border rounded-lg">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Número do Ticket</TableHead>
          <TableHead>Produto</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="font-mono">{ticket.ticket_number}</TableCell>
            <TableCell>{ticket.product_name}</TableCell>
            <TableCell>R$ {ticket.product_value.toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant={ticket.is_redeemed ? "destructive" : "default"}>
                {ticket.is_redeemed ? 'Resgatado' : 'Ativo'}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(ticket.created_at).toLocaleString('pt-BR')}
            </TableCell>
            <TableCell>
              {!ticket.is_redeemed && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRedeemTicket(ticket.id)}
                  disabled={loading}
                >
                  Resgatar
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
</TabsContent>
{/* minha fim */}

      </Tabs>

      {/* Create Tickets Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Tickets</DialogTitle>
            <DialogDescription>
              {selectedProduct && (
                <>Criar tickets para: <strong>{selectedProduct.name}</strong></>
              )}
              <br />
              Estoque disponível: {selectedProduct?.stock || 0}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantidade de Tickets</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedProduct?.stock || 0}
                value={ticketQuantity}
                onChange={(e) => setTicketQuantity(e.target.value)}
                required
                className="w-80"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTickets} disabled={loading}>
              {loading ? 'Criando...' : 'Criar Tickets'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code do Produto</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - {selectedProduct?.product_id}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {selectedProduct?.qr_code_image && (
              <img 
                src={`data:image/png;base64,${selectedProduct.qr_code_image}`}
                alt="QR Code"
                className="max-w-xs border rounded"
              />
            )}
            <div className="text-sm text-gray-600 text-center">
              <p><strong>Dados do QR Code:</strong></p>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                {selectedProduct?.qr_code_data}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQRDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Print Tickets Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Tickets para Impressão</DialogTitle>
            <DialogDescription>
              Os tickets foram criados com sucesso. Use o botão de impressão para imprimir.
            </DialogDescription>
          </DialogHeader>
          {printData && (
            <PrintableTicket
          tickets={printData.tickets}
          product={{...printData.product, qr_code_image: selectedProduct?.qr_code_image}}
          onClose={() => setShowPrintDialog(false)}
        />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;