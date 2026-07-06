const EstimateService = {

  /* ==========================================================
     GET ALL ESTIMATES
  ========================================================== */

  async getEstimates() {
    try {
      const { data, error } = await supabaseClient
        .from(TABLES.ESTIMATES)
        .select(`
          *,
          customers (
            customer_id,
            customer_name,
            phone,
            email,
            address
          ),
          jobs!estimates_job_number_fkey (
            job_number,
            customer_id,
            status,
            description,
            flooring_type,
            measurement_date,
            install_start_date,
            install_end_date,
            customers (
              customer_id,
              customer_name,
              phone,
              email,
              address
            )
          ),
          estimate_items (
            estimate_item_id,
            room_name,
            item_type,
            description,
            quantity,
            unit,
            unit_price,
            line_total,
            sort_order,
            created_at
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get estimates error:", error);
        return {
          data: [],
          error
        };
      }

      return {
        data: data || [],
        error: null
      };

    } catch (error) {
      console.error("Get estimates exception:", error);

      return {
        data: [],
        error
      };
    }
  },


  /* ==========================================================
     GET ONE ESTIMATE
  ========================================================== */

  async getEstimate(estimateId) {
    try {
      if (!estimateId) {
        return {
          data: null,
          error: new Error("Estimate ID is required.")
        };
      }

      const { data, error } = await supabaseClient
        .from(TABLES.ESTIMATES)
        .select(`
          *,
          customers (
            customer_id,
            customer_name,
            phone,
            email,
            address
          ),
          jobs!estimates_job_number_fkey (
            job_number,
            customer_id,
            status,
            description,
            flooring_type,
            measurement_date,
            install_start_date,
            install_end_date,
            install_price,
            notes,
            customers (
              customer_id,
              customer_name,
              phone,
              email,
              address
            )
          ),
          estimate_items (
            estimate_item_id,
            room_name,
            item_type,
            description,
            quantity,
            unit,
            unit_price,
            line_total,
            sort_order,
            created_at
          )
        `)
        .eq("estimate_id", estimateId)
        .order("sort_order", {
          referencedTable: "estimate_items",
          ascending: true
        })
        .single();

      if (error) {
        console.error("Get estimate error:", error);

        return {
          data: null,
          error
        };
      }

      return {
        data,
        error: null
      };

    } catch (error) {
      console.error("Get estimate exception:", error);

      return {
        data: null,
        error
      };
    }
  },


  /* ==========================================================
     GET ESTIMATES FOR JOB
  ========================================================== */

  async getEstimatesByJob(jobNumber) {
    try {
      const { data, error } = await supabaseClient
        .from(TABLES.ESTIMATES)
        .select(`
          *,
          estimate_items (
            estimate_item_id,
            room_name,
            item_type,
            description,
            quantity,
            unit,
            unit_price,
            line_total,
            sort_order
          )
        `)
        .eq("job_number", jobNumber)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get job estimates error:", error);

        return {
          data: [],
          error
        };
      }

      return {
        data: data || [],
        error: null
      };

    } catch (error) {
      console.error("Get job estimates exception:", error);

      return {
        data: [],
        error
      };
    }
  },


  /* ==========================================================
     CREATE ESTIMATE
  ========================================================== */

  async createEstimate(estimateData) {
    try {
      const payload = this.cleanEstimatePayload(estimateData);

      const { data, error } = await supabaseClient
        .from(TABLES.ESTIMATES)
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Create estimate error:", error);

        return {
          data: null,
          error
        };
      }

      return {
        data,
        error: null
      };

    } catch (error) {
      console.error("Create estimate exception:", error);

      return {
        data: null,
        error
      };
    }
  },


  /* ==========================================================
     CREATE ESTIMATE WITH ITEMS
  ========================================================== */

  async createEstimateWithItems(estimateData, items = []) {
    let createdEstimate = null;

    try {
      const estimateResult =
        await this.createEstimate(estimateData);

      if (estimateResult.error || !estimateResult.data) {
        return {
          data: null,
          error:
            estimateResult.error ||
            new Error("Estimate could not be created.")
        };
      }

      createdEstimate = estimateResult.data;

      if (Array.isArray(items) && items.length) {
        const itemPayloads = items.map((item, index) => ({
          estimate_id: createdEstimate.estimate_id,
          room_name: item.room_name || null,
          item_type: item.item_type || "Line Item",
          description: item.description,
          quantity: Number(item.quantity || 0),
          unit: item.unit || "each",
          unit_price: Number(item.unit_price || 0),
          line_total:
            item.line_total !== undefined
              ? Number(item.line_total || 0)
              : Number(item.quantity || 0) *
                Number(item.unit_price || 0),
          sort_order:
            item.sort_order !== undefined
              ? Number(item.sort_order)
              : index
        }));

        const { error: itemsError } = await supabaseClient
          .from(TABLES.ESTIMATE_ITEMS)
          .insert(itemPayloads);

        if (itemsError) {
          console.error(
            "Create estimate items error:",
            itemsError
          );

          /*
            Prevent an incomplete estimate from remaining
            if the line items fail to save.
          */

          const { error: rollbackError } =
            await supabaseClient
              .from(TABLES.ESTIMATES)
              .delete()
              .eq(
                "estimate_id",
                createdEstimate.estimate_id
              );

          if (rollbackError) {
            console.error(
              "Estimate rollback error:",
              rollbackError
            );
          }

          return {
            data: null,
            error: itemsError
          };
        }
      }

      return await this.getEstimate(
        createdEstimate.estimate_id
      );

    } catch (error) {
      console.error(
        "Create estimate with items exception:",
        error
      );

      if (createdEstimate?.estimate_id) {
        const { error: rollbackError } =
          await supabaseClient
            .from(TABLES.ESTIMATES)
            .delete()
            .eq(
              "estimate_id",
              createdEstimate.estimate_id
            );

        if (rollbackError) {
          console.error(
            "Estimate rollback error:",
            rollbackError
          );
        }
      }

      return {
        data: null,
        error
      };
    }
  },


  /* ==========================================================
     UPDATE ESTIMATE
  ========================================================== */

  async updateEstimate(estimateId, updates) {
    try {
      if (!estimateId) {
        return {
          data: null,
          error: new Error("Estimate ID is required.")
        };
      }

      const payload = this.cleanEstimatePayload(updates);

      const { data, error } = await supabaseClient
        .from(TABLES.ESTIMATES)
        .update(payload)
        .eq("estimate_id", estimateId)
        .select()
        .single();

      if (error) {
        console.error("Update estimate error:", error);

        return {
          data: null,
          error
        };
      }

      return {
        data,
        error: null
      };

    } catch (error) {
      console.error("Update estimate exception:", error);

      return {
        data: null,
        error
      };
    }
  },


  /* ==========================================================
     REPLACE ESTIMATE ITEMS
  ========================================================== */

  async replaceEstimateItems(estimateId, items = []) {
    try {
      if (!estimateId) {
        return {
          data: null,
          error: new Error("Estimate ID is required.")
        };
      }

      const { error: deleteError } = await supabaseClient
        .from(TABLES.ESTIMATE_ITEMS)
        .delete()
        .eq("estimate_id", estimateId);

      if (deleteError) {
        console.error(
          "Delete existing estimate items error:",
          deleteError
        );

        return {
          data: null,
          error: deleteError
        };
      }

      if (!Array.isArray(items) || !items.length) {
        return {
          data: [],
          error: null
        };
      }

      const payloads = items.map((item, index) => ({
        estimate_id: estimateId,
        room_name: item.room_name || null,
        item_type: item.item_type || "Line Item",
        description: item.description,
        quantity: Number(item.quantity || 0),
        unit: item.unit || "each",
        unit_price: Number(item.unit_price || 0),
        line_total:
          item.line_total !== undefined
            ? Number(item.line_total || 0)
            : Number(item.quantity || 0) *
              Number(item.unit_price || 0),
        sort_order:
          item.sort_order !== undefined
            ? Number(item.sort_order)
            : index
      }));

      const { data, error } = await supabaseClient
        .from(TABLES.ESTIMATE_ITEMS)
        .insert(payloads)
        .select();

      if (error) {
        console.error(
          "Replace estimate items error:",
          error
        );

        return {
          data: null,
          error
        };
      }

      return {
        data: data || [],
        error: null
      };

    } catch (error) {
      console.error(
        "Replace estimate items exception:",
        error
      );

      return {
        data: null,
        error
      };
    }
  },


  /* ==========================================================
     UPDATE ESTIMATE WITH ITEMS
  ========================================================== */

  async updateEstimateWithItems(
    estimateId,
    estimateData,
    items = []
  ) {
    try {
      const updateResult =
        await this.updateEstimate(
          estimateId,
          estimateData
        );

      if (updateResult.error) {
        return updateResult;
      }

      const itemsResult =
        await this.replaceEstimateItems(
          estimateId,
          items
        );

      if (itemsResult.error) {
        return {
          data: null,
          error: itemsResult.error
        };
      }

      return await this.getEstimate(estimateId);

    } catch (error) {
      console.error(
        "Update estimate with items exception:",
        error
      );

      return {
        data: null,
        error
      };
    }
  },


  /* ==========================================================
     UPDATE STATUS
  ========================================================== */

  async updateEstimateStatus(estimateId, status) {
    return await this.updateEstimate(
      estimateId,
      { status }
    );
  },


  /* ==========================================================
     DELETE ESTIMATE
  ========================================================== */

  async deleteEstimate(estimateId) {
    try {
      if (!estimateId) {
        return {
          data: null,
          error: new Error("Estimate ID is required.")
        };
      }

      /*
        estimate_items are deleted automatically because the
        FK uses ON DELETE CASCADE.
      */

      const { data, error } = await supabaseClient
        .from(TABLES.ESTIMATES)
        .delete()
        .eq("estimate_id", estimateId)
        .select()
        .single();

      if (error) {
        console.error("Delete estimate error:", error);

        return {
          data: null,
          error
        };
      }

      return {
        data,
        error: null
      };

    } catch (error) {
      console.error("Delete estimate exception:", error);

      return {
        data: null,
        error
      };
    }
  },


  /* ==========================================================
     CLEAN ESTIMATE PAYLOAD
  ========================================================== */

  cleanEstimatePayload(data = {}) {
    const payload = {};

    const allowedFields = [
      "job_number",
      "customer_id",
      "subtotal",
      "tax_rate",
      "tax_amount",
      "discount",
      "deposit",
      "total",
      "balance_due",
      "notes",
      "status"
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        payload[field] = data[field];
      }
    });

    const moneyFields = [
      "subtotal",
      "tax_rate",
      "tax_amount",
      "discount",
      "deposit",
      "total",
      "balance_due"
    ];

    moneyFields.forEach(field => {
      if (payload[field] !== undefined) {
        payload[field] =
          Number(payload[field] || 0);
      }
    });

    if (payload.job_number === "") {
      payload.job_number = null;
    }

    if (payload.customer_id === "") {
      payload.customer_id = null;
    }

    if (payload.notes === "") {
      payload.notes = null;
    }

    return payload;
  }

};