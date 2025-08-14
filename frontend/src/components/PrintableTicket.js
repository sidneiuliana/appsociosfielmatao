import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PrintableTicket = ({ tickets, product, onClose }) => {
  return (
    <div className="printable-area" style={{ width: '80mm', padding: '5mm' }}>
      <div className="header" style={{ textAlign: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '10px', marginBottom: '2px' }}>ID: {product.product_id}</div>
      </div>
      
      {tickets.map((ticket) => (
        <div key={ticket.id} className="ticket" style={{
          border: '1px dashed #ccc',
          padding: '5px',
          marginBottom: '5px',
          fontSize: '12px'
        }}>
          <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '2px 0' }}>{product.name}</p>
          <p style={{ margin: '2px 0' }}><strong>Ticket:</strong> {ticket.ticket_number}</p>
          <p style={{ margin: '2px 0' }}><strong>Valor:</strong> R$ {ticket.product_value.toFixed(2)}</p>
          <p style={{ margin: '2px 0' }}><strong>Status:</strong> {ticket.is_redeemed ? 'Resgatado' : 'Ativo'}</p>
          <p style={{ margin: '2px 0' }}><strong>Data:</strong> {new Date(ticket.created_at).toLocaleString('pt-BR')}</p>
          {product.qr_code_image && (
            <img
              src={`data:image/png;base64,${product.qr_code_image}`}
              alt="QR Code"
              style={{ width: '60px', height: '60px', margin: '5px auto', display: 'block' }}
            />
          )}
        </div>
      ))}
      
      <div className="footer" style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px' }}>
        <p>Obrigado por sua compra!</p>
      </div>
      
      <div className="buttons" style={{ display: 'none' }}>
        <button onClick={onClose}>Fechar</button>
        <button onClick={() => window.print()}>Imprimir</button>
      </div>
    </div>
  );
};

export default PrintableTicket;