const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiService {
  static async request(endpoint, options = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication
  static async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  static async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  static async getProfile() {
    return this.request('/auth/profile');
  }

  static async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  // Customers
  static async getCustomers() {
    return this.request('/customers');
  }

  static async getCustomer(id) {
    return this.request(`/customers/${id}`);
  }

  static async createCustomer(customerData) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  }

  static async updateCustomer(id, customerData) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData)
    });
  }

  static async deleteCustomer(id) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE'
    });
  }

  // Vehicles
  static async getVehicles() {
    return this.request('/vehicles');
  }

  static async getVehicle(licensePlate) {
    return this.request(`/vehicles/${licensePlate}`);
  }

  static async createVehicle(vehicleData) {
    return this.request('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData)
    });
  }

  static async updateVehicle(licensePlate, vehicleData) {
    return this.request(`/vehicles/${licensePlate}`, {
      method: 'PUT',
      body: JSON.stringify(vehicleData)
    });
  }

  static async deleteVehicle(licensePlate) {
    return this.request(`/vehicles/${licensePlate}`, {
      method: 'DELETE'
    });
  }

  // Services
  static async getServices() {
    return this.request('/services');
  }

  static async getService(id) {
    return this.request(`/services/${id}`);
  }

  static async createService(serviceData) {
    return this.request('/services', {
      method: 'POST',
      body: JSON.stringify(serviceData)
    });
  }

  static async updateService(id, serviceData) {
    return this.request(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData)
    });
  }

  static async deleteService(id) {
    return this.request(`/services/${id}`, {
      method: 'DELETE'
    });
  }

  // Users (Admin only)
  static async getUsers() {
    return this.request('/users');
  }

  static async getUser(id) {
    return this.request(`/users/${id}`);
  }

  static async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  static async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE'
    });
  }
}

export default ApiService; 