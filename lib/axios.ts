// lib\axios.ts

import axios from "axios"

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor for adding auth token, etc.
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    // const token = getToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("API Error Response:", error.response.data)

      // Handle specific status codes
      switch (error.response.status) {
        case 401:
          // Handle unauthorized
          break
        case 403:
          // Handle forbidden
          break
        case 404:
          // Handle not found
          break
        case 500:
          // Handle server error
          break
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error("API No Response:", error.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("API Request Error:", error.message)
    }

    return Promise.reject(error)
  }
)

// Helper functions for common API operations
export const apiService = {
  // GET request
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await api.get<T>(url, { params })
    return response.data
  },

  // POST request
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await api.post<T>(url, data)
    return response.data
  },

  // PUT request
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await api.put<T>(url, data)
    return response.data
  },

  // PATCH request
  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await api.patch<T>(url, data)
    return response.data
  },

  // DELETE request
  async delete<T>(url: string): Promise<T> {
    const response = await api.delete<T>(url)
    return response.data
  },
}

export default api
