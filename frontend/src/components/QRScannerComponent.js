import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button } from './ui/button';

const QRScannerComponent = ({ handleError, handleScan, setShowQRScanner }) => {
    return (
      <div className="mb-4">
       <Scanner
         onResult={(result) => {
           if (result) {
             handleScan(result?.text);
           }
         }}
         onError={handleError}
         constraints={{
           video: {
             facingMode: 'environment'
           }
         }}
         styles={{
           container: { width: '100%' }
         }}
       />
      <Button variant="outline" onClick={() => setShowQRScanner(false)} className="mt-2">
        Cancelar
      </Button>
    </div>
  );
};

export default QRScannerComponent;