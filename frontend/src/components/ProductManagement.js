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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Form states
  const [newProduct, setNewProduct] = useState({
    product_id: '',
    name: '',
    value: '',
    stock: ''
  });
  const [ticketQuantity, setTicketQuantity] = useState(1);
  
  // Dialog states
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

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

  // Fetch tickets
  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API}/tickets`);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTickets();
  }, []);

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
      
      setNewProduct({ product_id: '', name: '', value: '', stock: '' });
      setShowProductDialog(false);
      fetchProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.detail || 'Erro ao criar produto');
    } finally {
      setLoading(false);
    }
  };

  // Create tickets
  const handleCreateTickets = async () => {
    if (!selectedProduct) return;
    
    try {
      setLoading(true);
      await axios.post(`${API}/tickets`, {
        product_id: selectedProduct.product_id,
        quantity: parseInt(ticketQuantity)
      });
      
      toast.success(`${ticketQuantity} ticket(s) criado(s) com sucesso!`);
      setShowTicketDialog(false);
      setTicketQuantity(1);
      fetchProducts(); // Refresh to update stock
      fetchTickets();
    } catch (error) {
      console.error('Error creating tickets:', error);
      toast.error(error.response?.data?.detail || 'Erro ao criar tickets');
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
      toast.error(error.response?.data?.detail || 'Erro ao resgatar ticket');
    } finally {
      setLoading(false);
    }
  };

  // Show QR Code
  const showQRCode = (product) => {
    setSelectedProduct(product);
    setShowQRDialog(true);
  };

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
                    <Label htmlFor="product_id">ID do Produto</Label>
                    <Input
                      id="product_id"
                      value={newProduct.product_id}
                      onChange={(e) => setNewProduct({...newProduct, product_id: e.target.value})}
                      placeholder="Ex: PROD-001"
                      required
                    />
                  </div>
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowTicketDialog(true);
                    }}
                    disabled={product.stock === 0}
                  >
                    Criar Tickets
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
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
        </TabsContent>
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
    </div>
  );
};

export default ProductManagement;