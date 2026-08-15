import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useBusiness } from '../BusinessContext';

export default function DeliveryOrders() {
  const [dos, setDos] = useState([]);
  const { businessId } = useBusiness();
  useEffect(() => { if (businessId) api.get('/delivery-orders').then(setDos); }, [businessId]);

  return (
    <div>
      <h1>Delivery Orders</h1>
      <p>Delivery orders are created from an invoice - open an invoice to convert it.</p>
      <div className="card">
        <table>
          <thead><tr><th>Number</th><th>Customer</th><th>Invoice</th><th>Delivery Date</th><th>Signed By</th><th></th></tr></thead>
          <tbody>
            {dos.map((d) => (
              <tr key={d.id}>
                <td>{d.number}</td>
                <td>{d.invoice.quotation.customer.name}</td>
                <td>{d.invoice.number}</td>
                <td>{new Date(d.deliveryDate).toLocaleDateString()}</td>
                <td>{d.signedBy || '-'}</td>
                <td><Link to={`/delivery-orders/${d.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
