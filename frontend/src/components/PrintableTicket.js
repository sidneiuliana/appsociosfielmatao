import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PrintableTicket = ({ productId, quantity, onClose }) => {
  const [tickets, setTickets] = useState([]);
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch product details
        const productResponse = await axios.get(`${API}/products/${productId}`);
        setProduct(productResponse.data);
        
        // Fetch tickets for this product
        const ticketsResponse = await axios.get(`${API}/tickets/product/${productId}`);
        // Get only the most recent tickets (non-redeemed)
        const recentTickets = ticketsResponse.data
          .filter(ticket => !ticket.is_redeemed)
          .slice(-quantity);
        setTickets(recentTickets);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId, quantity]);

  const handlePrint = () => {
    window.print();
  };

  if (!product || tickets.length === 0) {
    return (
      <div className="text-center p-4">
        <p>Carregando tickets...</p>
      </div>
    );
  }

  return (
    <div className="printable-tickets">
      {/* Screen-only controls */}
      <div className="no-print flex justify-between items-center mb-4 p-4 border-b">
        <h2 className="text-2xl font-bold">Tickets para Impressão</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint}>
            🖨️ Imprimir Tickets
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* Printable ticket grid */}
      <div className="print-grid">
        {tickets.map((ticket, index) => (
          <div key={ticket.id} className="ticket-item">
            <Card className="ticket-card">
              <CardHeader className="text-center pb-2">
                <div className="ticket-header">
                  <h3 className="font-bold text-lg">🎫 TICKET</h3>
                  <Badge variant="default" className="mt-1">
                    #{ticket.ticket_number}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="text-center space-y-3">
                <div className="product-info">
                  <h4 className="font-semibold text-base">{product.name}</h4>
                  <p className="text-sm text-gray-600">ID: {product.product_id}</p>
                  <p className="text-xl font-bold text-green-600 mt-2">
                    R$ {ticket.product_value.toFixed(2)}
                  </p>
                </div>
                
                {product.qr_code_image && (
                  <div className="qr-code-section">
                    <img 
                      src={`data:image/png;base64,${product.qr_code_image}`}
                      alt="QR Code"
                      className="qr-code"
                    />
                  </div>
                )}
                
                <div className="ticket-footer">
                  <p className="text-xs text-gray-500">
                    Criado em: {new Date(ticket.created_at).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ⚠️ Válido apenas uma vez
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Print-specific styles */}
      <style jsx>{`
        @media screen {
          .print-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1rem;
            padding: 1rem;
          }
          
          .ticket-card {
            max-width: 350px;
            margin: 0 auto;
          }
          
          .qr-code {
            max-width: 120px;
            height: auto;
            margin: 0 auto;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
          }
        }

        @media print {
          .no-print {
            display: none !important;
          }
          
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1cm !important;
            padding: 0 !important;
          }
          
          .ticket-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .ticket-card {
            border: 2px solid #000 !important;
            border-radius: 8px !important;
            padding: 1cm !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: white !important;
            max-width: none !important;
          }
          
          .ticket-header h3 {
            font-size: 18px !important;
            margin-bottom: 0.5cm !important;
          }
          
          .product-info h4 {
            font-size: 16px !important;
            margin-bottom: 0.3cm !important;
          }
          
          .product-info p {
            font-size: 12px !important;
            margin: 0.2cm 0 !important;
          }
          
          .qr-code {
            max-width: 3cm !important;
            max-height: 3cm !important;
            margin: 0.5cm auto !important;
            border: 1px solid #000 !important;
          }
          
          .ticket-footer p {
            font-size: 10px !important;
            margin: 0.2cm 0 !important;
          }

          /* Ensure proper page breaks */
          @page {
            size: A4;
            margin: 1cm;
          }
          
          /* Force new page after every 4 tickets */
          .ticket-item:nth-child(4n) {
            page-break-after: always !important;
          }
        }

        /* Additional responsive styles */
        @media (max-width: 768px) {
          .print-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintableTicket;