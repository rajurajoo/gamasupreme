import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useBusiness } from '../BusinessContext';

export default function CompletionCertificates() {
  const [certs, setCerts] = useState([]);
  const { businessId } = useBusiness();
  useEffect(() => { if (businessId) api.get('/completion-certificates').then(setCerts); }, [businessId]);

  return (
    <div>
      <h1>Completion Certificates</h1>
      <p>Completion certificates are created from a delivery order on a fitout job.</p>
      <div className="card">
        <table>
          <thead><tr><th>Number</th><th>Customer</th><th>Delivery Order</th><th>Completion Date</th><th></th></tr></thead>
          <tbody>
            {certs.map((c) => (
              <tr key={c.id}>
                <td>{c.number}</td>
                <td>{c.deliveryOrder.invoice.quotation.customer.name}</td>
                <td>{c.deliveryOrder.number}</td>
                <td>{new Date(c.completionDate).toLocaleDateString()}</td>
                <td><Link to={`/completion-certificates/${c.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
