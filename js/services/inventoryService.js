// inventoryService.js

const InventoryService = {

  /* ==========================================================
     GET INVENTORY
  ========================================================== */

  async getInventory() {
    const { data, error } = await db
      .from(TABLES.INVENTORY)
      .select("*")
      .order("material_name", { ascending: true });

    return {
      data: data || [],
      error
    };
  },

  async getInventoryItem(itemId) {
    const { data, error } = await db
      .from(TABLES.INVENTORY)
      .select("*")
      .eq("inventory_id", itemId)
      .single();

    return {
      data,
      error
    };
  },

  async getInventoryByCategory(category) {
    const { data, error } = await db
      .from(TABLES.INVENTORY)
      .select("*")
      .eq("category", category)
      .order("material_name", { ascending: true });

    return {
      data: data || [],
      error
    };
  },

  /* ==========================================================
     IMAGE STORAGE
  ========================================================== */

  async uploadInventoryImage(file) {

    if (!file) {
      return {
        data: null,
        error: new Error("No file provided.")
      };
    }

    const extension = file.name.split(".").pop();
    const filePath =
      `inventory/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${extension}`;

    const { error: uploadError } = await db.storage
      .from("product-images")
      .upload(filePath, file);

    if (uploadError) {
      return {
        data: null,
        error: uploadError
      };
    }

    const { data } = db.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return {
      data: {
        image_url: data.publicUrl,
        storage_path: filePath
      },
      error: null
    };
  },

  async deleteInventoryImage(filePath) {

    if (!filePath) {
      return { error: null };
    }

    const { error } = await db.storage
      .from("product-images")
      .remove([filePath]);

    return { error };

  },

  /* ==========================================================
     CREATE
  ========================================================== */

  async createInventoryItem(item) {

    const payload = {
      material_name: item.material_name,
      category: item.category || "General",
      manufacturer: item.manufacturer || null,
      sku: item.sku || null,
      unit: item.unit || "each",
      quantity_on_hand: Number(item.quantity_on_hand) || 0,
      reorder_level: Number(item.reorder_level) || 0,
      unit_cost: Number(item.unit_cost) || 0,
      location: item.location || null,
      supplier: item.supplier || null,
      notes: item.notes || null,
      image_url: item.image_url || null,
      image_path: item.image_path || null
    };

    const { data, error } = await db
      .from(TABLES.INVENTORY)
      .insert([payload])
      .select()
      .single();

    return {
      data,
      error
    };
  },

  /* ==========================================================
     UPDATE
  ========================================================== */

  async updateInventoryItem(itemId, updates) {

    const { data, error } = await db
      .from(TABLES.INVENTORY)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("inventory_id", itemId)
      .select()
      .single();

    return {
      data,
      error
    };
  },

  async adjustInventory(itemId, quantityChange) {

    const { data: item, error } =
      await this.getInventoryItem(itemId);

    if (error || !item) {
      return {
        data: null,
        error: error || new Error("Inventory item not found.")
      };
    }

    const newQuantity =
      (Number(item.quantity_on_hand) || 0) +
      Number(quantityChange);

    return await this.updateInventoryItem(itemId, {
      quantity_on_hand: Math.max(newQuantity, 0)
    });
  },

  /* ==========================================================
     DELETE
  ========================================================== */

  async deleteInventoryItem(itemId) {

    const { data: item } =
      await this.getInventoryItem(itemId);

    if (item?.image_path) {
      await this.deleteInventoryImage(item.image_path);
    }

    const { error } = await db
      .from(TABLES.INVENTORY)
      .delete()
      .eq("inventory_id", itemId);

    return {
      error
    };
  },

  /* ==========================================================
     REPORTS
  ========================================================== */

  async getLowStockItems() {

    const { data, error } = await db
      .from(TABLES.INVENTORY)
      .select("*");

    if (error) {
      return {
        data: [],
        error
      };
    }

    const lowStock = (data || []).filter(item =>
      Number(item.quantity_on_hand) <=
      Number(item.reorder_level)
    );

    return {
      data: lowStock,
      error: null
    };
  },

  async getInventoryValue() {

    const { data, error } = await db
      .from(TABLES.INVENTORY)
      .select(`
        quantity_on_hand,
        unit_cost
      `);

    if (error) {
      return {
        value: 0,
        error
      };
    }

    const value = (data || []).reduce((sum, item) => {
      return sum +
        ((Number(item.quantity_on_hand) || 0) *
        (Number(item.unit_cost) || 0));
    }, 0);

    return {
      value,
      error: null
    };
  },

  /* ==========================================================
     COUNTS
  ========================================================== */

  async getInventoryCount() {

    const { count, error } = await db
      .from(TABLES.INVENTORY)
      .select("*", {
        count: "exact",
        head: true
      });

    return {
      count: count || 0,
      error
    };
  }

};