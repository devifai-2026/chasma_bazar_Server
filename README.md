# 🕶️ Chasma Bazar - Backend Server

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (v4.4+)
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd chasma_bazar_Server

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chasma_bazar
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret_key
ACCESS_TOKEN_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d
NODE_ENV=development
EOF

# Start server
npm start

# Server runs at http://localhost:5000
```

### Health Check
```bash
curl http://localhost:5000/api/health
# Response: { "message": "Server is running" }
```

---

## 📦 What's Included

### Database (18 Models)
✅ User, Product, Frame, Company
✅ Order, Cart, Payment, PromoCode
✅ Review, Rating, Wishlist
✅ UserDeliveryAddress, OrderStatus
✅ RefundRequest, DriverAssigned
✅ UsedPromoCode, LastSeenProduct
✅ Session

### API Endpoints (65+)
✅ Authentication (6)
✅ Products (6)
✅ Cart (6)
✅ Orders (7)
✅ Payments (5)
✅ PromoCode (7)
✅ Refunds (6)
✅ Reviews (4)
✅ Ratings (4)
✅ Wishlist (3)
✅ Addresses (4)
✅ Frames (5)
✅ Companies (5)
✅ Order Status (2)

### Features
✅ User authentication with JWT
✅ Shopping cart management
✅ Order processing & tracking
✅ Payment handling
✅ Promo code system
✅ Review & rating system
✅ Refund management
✅ Driver assignment
✅ Session management
✅ Data verification on all operations

---

## 🔌 API Usage

### 1. Register User
```bash
POST /api/auth/signup
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "9876543210"
}
```

### 2. Login
```bash
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### 3. Browse Products
```bash
GET /api/products?page=1&limit=10&category=Men
```

### 4. Add to Cart
```bash
POST /api/cart
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 2
}
```

### 5. Create Order
```bash
POST /api/orders
{
  "productId": "507f1f77bcf86cd799439011",
  "addressId": "507f1f77bcf86cd799439012"
}
```

### 6. Record Payment
```bash
POST /api/payments
{
  "orderId": "507f1f77bcf86cd799439013",
  "paymentMethod": "credit_card",
  "amount": 2999,
  "transactionId": "TXN123456"
}
```

---

## 🛠️ Project Structure

```
src/
├── config/          # Database configuration
├── controllers/     # Business logic
│   ├── authController.js
│   ├── productController.js
│   ├── orderController.js
│   ├── cartController.js
│   ├── paymentController.js
│   ├── promoCoder.js
│   └── ...
├── middleware/      # Authentication & validation
│   └── auth.improved.js
├── models/          # Database schemas (18 models)
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   ├── Cart.js
│   ├── Payment.js
│   ├── PromoCode.js
│   ├── RefundRequest.js
│   └── ...
├── routes/          # API endpoints (14 route files)
│   ├── authRoutes.js
│   ├── productRoutes.js
│   ├── cartRoutes.js
│   ├── paymentRoutes.js
│   ├── promoRoutes.js
│   ├── refundRoutes.js
│   └── ...
├── utils/           # Utilities
│   ├── response.js           # Response formatting
│   ├── validation.js         # Input validation
│   ├── dataVerification.js   # Reference validation
│   └── tokenManager.js       # JWT management
└── validation/      # Express validators

server.js           # Main entry point
package.json        # Dependencies
.env               # Configuration (create this)
```

---

## 🔐 Authentication

### Token System
- **Access Token:** 15 minutes (for API requests)
- **Refresh Token:** 7 days (to get new access tokens)
- **Session:** Tracked in database with auto-cleanup

### Using Tokens
```bash
# All authenticated requests need Authorization header
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:5000/api/orders
```

---

## ✅ Data Verification

Every operation verifies:
- ✅ User exists & is not deleted
- ✅ Referenced resources exist
- ✅ User has permission to access
- ✅ Order belongs to user (not someone else's)
- ✅ No orphaned records created

---

## 📊 API Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (auth required) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 500 | Server Error |

---

## 🧪 Testing with Postman

1. **Import Collection**
   ```
   File → Import → Chasma_Bazar_API_Collection.postman_collection.json
   ```

2. **Create Environment**
   - Set `base_url` = `http://localhost:5000/api`
   - Set `access_token` (from login response)
   - Set `refresh_token` (from login response)

3. **Test Workflow**
   - Register → Login → Create Address → Add to Cart → Create Order → Payment

---

## 📞 Support & Issues

### Common Issues

**"Cannot connect to MongoDB"**
- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env

**"Invalid token" error**
- Login again to get fresh token
- Token may be expired

**"Product not found"**
- Get product ID from: `GET /api/products`
- Use exact ID from response

---

## 🎯 Features

### ✨ Core Features
- User registration & authentication
- Product catalog with search & filters
- Shopping cart management
- Order processing with status tracking
- Payment tracking & management
- Promo code system with discounts
- Product reviews & ratings
- Wishlist functionality
- Delivery address management
- Order tracking & driver assignment
- Refund request management

### 🔒 Security
- Password hashing with bcryptjs
- JWT authentication
- Input validation
- XSS prevention
- SQL injection prevention
- Session management with auto-cleanup

### ⚡ Performance
- Database query optimization
- Pagination support
- Connection pooling
- Response compression ready
- Session cleanup (hourly)

---

## 📝 Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **Password Security:** bcryptjs
- **CORS:** cors middleware
- **Validation:** Custom utilities
- **Environment:** dotenv

---

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "mongoose": "^7.5.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```
