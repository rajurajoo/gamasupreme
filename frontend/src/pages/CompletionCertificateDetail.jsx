import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function CompletionCertificateDetail() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);

  useEffect(() => { api.get(`/completion-certificates/${id}`).then(setCert); }, [id]);

  if (!cert) return <div>Loading...</div>;
  const customer = cert.deliveryOrder.invoice.quotation.customer;

  return (
    <div className="print-view">
      <p style={{ color: '#6b7280', margin: '0 0 6px' }}>GAMA SUPREME - {cert.business?.name}</p>
      <h1>Completion Certificate {cert.number}</h1>
      <div className="card">
        <p><strong>Customer:</strong> {customer.name}</p>
        <p><strong>From Delivery Order:</strong> {cert.deliveryOrder.number}</p>
        <p><strong>Completion Date:</strong> {new Date(cert.completionDate).toLocaleDateString()}</p>
        <p><strong>Scope of Work:</strong></p>
        <p>{cert.scopeDescription}</p>
        <hr />
        <p><strong>Client Sign-off</strong></p>
        <p>Name: {cert.clientName || '_______________________'}</p>
        <p>Signature: {cert.clientSignature || '_______________________ (placeholder - no e-sign integration)'}</p>
        <p>Date: {cert.signOffDate ? new Date(cert.signOffDate).toLocaleDateString() : '_______________________'}</p>
      </div>
      <div className="no-print">
        <button className="btn secondary" onClick={() => window.print()}>Print / Export View</button>
      </div>
    </div>
  );
}
