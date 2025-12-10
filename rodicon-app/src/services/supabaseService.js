/**
 * supabaseService.js
 * Encapsula TODAS las operaciones a Supabase en un único lugar
 * Facilita reutilización, testing y cambios futuros
 */

import { supabase } from './supabaseClient';

export const supabaseService = {
  // ============ ASSETS ============
  async fetchAssetsPaginated(page = 1, pageSize = 20) {
    const from = (page - 1) * pageSize;
    const to = page * pageSize - 1;
    return supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .order('ficha')
      .range(from, to);
  },

  async fetchAllAssets() {
    return supabase.from('assets').select('*').order('ficha');
  },

  async getAssetById(id) {
    return supabase.from('assets').select('*').eq('id', id).single();
  },

  async createAsset(assetData) {
    return supabase.from('assets').insert([assetData]);
  },

  async updateAsset(id, updates) {
    return supabase.from('assets').update(updates).eq('id', id);
  },

  async deleteAsset(id) {
    return supabase.from('assets').delete().eq('id', id);
  },

  // ============ PURCHASES ============
  async fetchAllPurchases() {
    return supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
  },

  async getPurchaseById(id) {
    return supabase.from('purchase_orders').select('*').eq('id', id).single();
  },

  async createPurchaseOrder(orderData) {
    return supabase.from('purchase_orders').insert([orderData]);
  },

  async updatePurchaseOrder(id, updates) {
    return supabase.from('purchase_orders').update(updates).eq('id', id);
  },

  async fetchPurchaseItems(purchaseOrderId) {
    return supabase.from('purchase_items').select('*').eq('purchase_order_id', purchaseOrderId);
  },

  async createPurchaseItem(itemData) {
    return supabase.from('purchase_items').insert([itemData]);
  },

  // ============ MAINTENANCE LOGS ============
  async fetchAllMaintenanceLogs() {
    return supabase.from('maintenance_logs').select('*').order('fecha', { ascending: false });
  },

  async getMaintenanceLogsByAsset(assetId) {
    return supabase
      .from('maintenance_logs')
      .select('*')
      .eq('ficha_ref', assetId)
      .order('fecha', { ascending: false });
  },

  async createMaintenanceLog(logData) {
    return supabase.from('maintenance_logs').insert([logData]);
  },

  async updateMaintenanceLog(id, updates) {
    return supabase.from('maintenance_logs').update(updates).eq('id', id);
  },

  // ============ SAFETY REPORTS ============
  async fetchAllSafetyReports() {
    return supabase.from('safety_reports').select('*').order('created_at', { ascending: false });
  },

  async getSafetyReportsByAsset(assetId) {
    return supabase
      .from('safety_reports')
      .select('*')
      .eq('ficha_ref', assetId)
      .order('created_at', { ascending: false });
  },

  async createSafetyReport(reportData) {
    return supabase.from('safety_reports').insert([reportData]);
  },

  async updateSafetyReport(id, updates) {
    return supabase.from('safety_reports').update(updates).eq('id', id);
  },

  // ============ USERS / AUTH ============
  async getUserByPin(pin) {
    return supabase.from('app_users').select('*').eq('pin', pin).single();
  },

  async getAllUsers() {
    return supabase.from('app_users').select('*');
  },

  // ============ STORAGE ============
  async uploadToStorage(bucket, path, file) {
    return supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
  },

  async deleteFromStorage(bucket, path) {
    return supabase.storage.from(bucket).remove([path]);
  },

  async getStorageUrl(bucket, path) {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
};

export default supabaseService;
