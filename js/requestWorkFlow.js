// requestWorkflow.js
// Shared admin workflow for accepting/declining measurement requests

async function generateSupabaseJobNumber() {
  const year = new Date().getFullYear();

  const { count, error } = await db
    .from("jobs")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(error);
    return `CS-${year}-${String(Date.now()).slice(-4)}`;
  }

  const next = (count || 0) + 1;
  return `CS-${year}-${String(next).padStart(4, "0")}`;
}

async function acceptRequest(requestId) {
  const { data: request, error: requestError } = await db
    .from("measurement_requests")
    .select("*")
    .eq("request_id", requestId)
    .single();

  if (requestError || !request) {
    console.error(requestError);
    showMessage("Request not found.");
    return null;
  }

  const cleanEmail = request.email ? request.email.trim().toLowerCase() : "";
  const cleanPhone = request.phone ? request.phone.replace(/\D/g, "") : "";

  let existingCustomer = null;

  if (cleanEmail || cleanPhone) {
    const { data: customers, error: customerSearchError } = await db
      .from("customers")
      .select("*");

    if (customerSearchError) {
      console.error(customerSearchError);
      showMessage("Could not check existing customers.");
      return null;
    }

    existingCustomer = customers?.find(customer => {
      const customerEmail = customer.email ? customer.email.trim().toLowerCase() : "";
      const customerPhone = customer.phone ? customer.phone.replace(/\D/g, "") : "";

      return (
        (cleanEmail && customerEmail === cleanEmail) ||
        (cleanPhone && customerPhone === cleanPhone)
      );
    });
  }

  let customerId;

  if (existingCustomer) {
    customerId = existingCustomer.customer_id;

    const { error: updateCustomerError } = await db
      .from("customers")
      .update({
        customer_name: request.customer_name || existingCustomer.customer_name,
        email: request.email || existingCustomer.email,
        phone: request.phone || existingCustomer.phone,
        address: request.address || existingCustomer.address,
        active: true
      })
      .eq("customer_id", customerId);

    if (updateCustomerError) {
      console.error(updateCustomerError);
      showMessage("Could not update existing customer.");
      return null;
    }
  } else {
    const { data: createdCustomer, error: customerError } = await db
      .from("customers")
      .insert([{
        customer_name: request.customer_name,
        email: request.email,
        phone: request.phone,
        address: request.address,
        active: true
      }])
      .select()
      .single();

    if (customerError) {
      console.error(customerError);
      showMessage("Could not create customer.");
      return null;
    }

    customerId = createdCustomer.customer_id;
  }

  const jobNumber = await generateSupabaseJobNumber();

  const { error: jobError } = await db
    .from("jobs")
    .insert([{
      job_number: jobNumber,
      customer_id: customerId,
      flooring_type: request.flooring_type,
      description: request.description,
      measurement_date: request.preferred_measurement_date || null,
      install_start_date: null,
      install_end_date: null,
      install_price: null,
      status: "Measurement Scheduled",
      estimate_id: null,
      agreement_id: null
    }]);

  if (jobError) {
    console.error(jobError);
    showMessage("Could not create job.");
    return null;
  }

  const { error: deleteError } = await db
    .from("measurement_requests")
    .delete()
    .eq("request_id", requestId);

  if (deleteError) {
    console.error(deleteError);
    showMessage("Job created, but request could not be removed.");
  } else {
    showMessage(
      existingCustomer
        ? `Job created for existing customer: ${jobNumber}`
        : `Job created for new customer: ${jobNumber}`
    );
  }

  return jobNumber;
}

async function declineRequest(requestId) {
  const { error } = await db
    .from("measurement_requests")
    .delete()
    .eq("request_id", requestId);

  if (error) {
    console.error(error);
    showMessage("Could not decline measurement request.");
    return false;
  }

  showMessage("Measurement request declined.");
  return true;
}