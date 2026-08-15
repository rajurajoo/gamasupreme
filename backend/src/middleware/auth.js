const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Verifies the bearer JWT and attaches { id, name, email, role } to req.user.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Role-based gate. Usage: requireRole('admin', 'accountant')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Resolves the active business from the "x-business-id" header (set by the
// frontend's business switcher) and attaches it to req.businessId. Document
// routes use this to scope list/create requests to the selected business.
function requireBusiness(req, res, next) {
  const businessId = Number(req.headers['x-business-id']);
  if (!businessId) return res.status(400).json({ error: 'Missing x-business-id header - select a business first' });
  req.businessId = businessId;
  next();
}

module.exports = { requireAuth, requireRole, requireBusiness, JWT_SECRET };
