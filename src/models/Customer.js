import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerName: {
    type: String,
    required: true,
    index: true
  },
  customerNumber: {
    type: String,
    required: true,
    index: true
  },
  cart: {
    items: [{
      productId: String,
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  wishlist: {
    items: [{
      productId: String,
      name: String,
      price: Number,
      image: String
    }],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
customerSchema.index({ 'cart.lastUpdated': 1 });
customerSchema.index({ 'wishlist.lastUpdated': 1 });
customerSchema.index({ customerName: 1 });
customerSchema.index({ customerNumber: 1 });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;