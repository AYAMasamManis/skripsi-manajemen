import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '')

export const apiAssetUrl = (path = '') => `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}`

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/`,
  headers: { Accept: 'application/json' },
})

export default apiClient
