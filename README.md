# 🕶️ Chasma Bazar - Backend Server

**Production-Ready E-commerce Backend for Eyewear Platform**

---

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

## 📚 Documentation

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **QUICK_START_GUIDE.md** | Setup & first test | 5 min |
| **API_ENDPOINTS_SUMMARY.md** | Endpoint reference | 15 min |
| **COMPLETE_API_DOCUMENTATION.md** | Full technical docs | 30 min |
| **IMPLEMENTATION_PLAN.md** | Architecture & workflows | 20 min |
| **NEW_ROUTES_SUMMARY.md** | All new endpoints | 10 min |

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
