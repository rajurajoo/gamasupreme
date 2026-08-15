import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';
import { useBusiness } from '../BusinessContext';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const { businessId } = useBusiness();
  useEffect(() => { if (businessId) api.get('/invoices').then(setInvoices); }, [businessId]);

  return (
    <div>
      <h1>Invoices</h1>
      <p>Invoices are created from an accepted quotation - open a quotation to convert it.</p>
      <div className="card">
        <table>
          <thead><tr><th>Number</th><th>Customer</th><th>Total</th><th>Balance</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td>{i.number}</td>
                <td>{i.quotation.customer.name}</td>
                <td>{money(i.totalWithVat)}</td>
                <td>{money(i.balance)}</td>
                <td>{new Date(i.dueDate).toLocaleDateString()}</td>
                <td><span className={`badge ${i.status}`}>{i.status}</span></td>
                <td><Link to={`/invoices/${i.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
