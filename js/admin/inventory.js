// inventory.js

let allInventoryItems=[];

window.addEventListener("load",()=>{
  loadInventory();

  const form=document.getElementById("inventoryForm");
  if(form){
    form.addEventListener("submit",event=>{
      event.preventDefault();
      addInventoryItem();
    });
  }
});

/* ==========================================================
   LOAD INVENTORY
========================================================== */

async function loadInventory(){
  const container=document.getElementById("inventory");
  if(!container)return;

  container.innerHTML=`<div class="admin-empty-state">Loading inventory...</div>`;

  const{data,error}=await InventoryService.getInventory();

  if(error){
    console.error(error);
    container.innerHTML=`<div class="admin-empty-state">Could not load inventory.</div>`;
    return;
  }

  allInventoryItems=data||[];
  renderInventoryItems(allInventoryItems);
}

/* ==========================================================
   ADD INVENTORY ITEM
========================================================== */

async function addInventoryItem(){
  const submitButton=document.querySelector("#inventoryForm button[type='submit']");
  if(submitButton){
    submitButton.disabled=true;
    submitButton.textContent="Adding...";
  }

  try{
    const fileInput=document.getElementById("productFile");
    const file=fileInput?.files?.[0]||null;

    let imageData=null;

    if(file){
      const{data,error}=await InventoryService.uploadInventoryImage(file);

      if(error){
        console.error(error);
        showMessage("Could not upload product image.");
        return;
      }

      imageData=data;
    }

    const item={
      material_name:document.getElementById("itemName")?.value.trim(),
      category:document.getElementById("itemType")?.value,
      unit_cost:Number(document.getElementById("unitPrice")?.value)||0,
      quantity_on_hand:Number(document.getElementById("quantity")?.value)||0,
      unit:"each",
      reorder_level:0,
      manufacturer:null,
      sku:null,
      location:null,
      supplier:null,
      notes:null,
      image_url:imageData?.image_url||null,
      image_path:imageData?.storage_path||null
    };

    if(!item.material_name){
      showMessage("Please enter an item name.");
      return;
    }

    if(!item.category){
      showMessage("Please select a category.");
      return;
    }

    const{error}=await InventoryService.createInventoryItem(item);

    if(error){
      console.error(error);
      showMessage("Could not add inventory item.");
      return;
    }

    showMessage("Inventory item added.");

    const form=document.getElementById("inventoryForm");
    if(form)form.reset();

    await loadInventory();

    if(typeof loadDashboardCounts==="function"){
      loadDashboardCounts();
    }

  }finally{
    if(submitButton){
      submitButton.disabled=false;
      submitButton.textContent="Add Inventory Item";
    }
  }
}

/* ==========================================================
   RENDER INVENTORY
========================================================== */

function renderInventoryItems(items){
  const container=document.getElementById("inventory");
  if(!container)return;

  if(!items||items.length===0){
    container.innerHTML=`
      <div class="admin-empty-state">
        <h3>No inventory found.</h3>
        <p>Add flooring products, materials, tools, or supplies to begin tracking inventory.</p>
      </div>
    `;
    return;
  }

  container.innerHTML=items.map(item=>renderInventoryCard(item)).join("");
}

function renderInventoryCard(item){
  const lowStock=isLowStock(item);

  return`
    <article class="inventory-card">
      <div class="inventory-image-wrap">
        ${
          item.image_url
            ?`<img src="${item.image_url}" alt="${item.material_name||"Inventory item"}" class="inventory-image">`
            :`<div class="inventory-placeholder">No Image</div>`
        }
      </div>

      <div class="inventory-card-body">
        <div class="inventory-card-header">
          <div>
            <p class="eyebrow">${item.category||"Inventory"}</p>
            <h3>${item.material_name||"Unnamed Item"}</h3>
          </div>

          <span class="admin-status-pill ${lowStock?"danger":"active"}">
            ${lowStock?"Low Stock":"In Stock"}
          </span>
        </div>

        <div class="inventory-detail-grid">
          <div>
            <span>Unit Cost</span>
            <strong>${formatMoney(item.unit_cost||0)}</strong>
          </div>

          <div>
            <span>Quantity</span>
            <strong>${item.quantity_on_hand||0}</strong>
          </div>

          <div>
            <span>Reorder Level</span>
            <strong>${item.reorder_level||0}</strong>
          </div>

          <div>
            <span>Unit</span>
            <strong>${item.unit||"each"}</strong>
          </div>
        </div>
                ${item.manufacturer||item.sku||item.location||item.supplier?`
          <div class="inventory-extra-grid">
            ${item.manufacturer?`<div><span>Manufacturer</span><strong>${item.manufacturer}</strong></div>`:""}
            ${item.sku?`<div><span>SKU</span><strong>${item.sku}</strong></div>`:""}
            ${item.location?`<div><span>Location</span><strong>${item.location}</strong></div>`:""}
            ${item.supplier?`<div><span>Supplier</span><strong>${item.supplier}</strong></div>`:""}
          </div>
        `:""}

        ${item.notes?`
          <div class="inventory-notes">
            <span>Notes</span>
            <p>${item.notes}</p>
          </div>
        `:""}

        <div class="inventory-card-actions">
          <button class="btn secondary" type="button" onclick="adjustInventoryQuantity('${item.inventory_id}',1)">
            +1
          </button>

          <button class="btn secondary" type="button" onclick="adjustInventoryQuantity('${item.inventory_id}',-1)">
            -1
          </button>

          <button class="btn danger" type="button" onclick="deleteInventoryItem('${item.inventory_id}')">
            Delete
          </button>
        </div>
      </div>
    </article>
  `;
}

/* ==========================================================
   UPDATE / DELETE
========================================================== */

async function adjustInventoryQuantity(itemId,quantityChange){
  const{error}=await InventoryService.adjustInventory(itemId,quantityChange);

  if(error){
    console.error(error);
    showMessage("Could not update inventory quantity.");
    return;
  }

  await loadInventory();

  if(typeof loadDashboardCounts==="function"){
    loadDashboardCounts();
  }
}

async function deleteInventoryItem(itemId){
  const confirmed=confirm("Delete this inventory item? This cannot be undone.");
  if(!confirmed)return;

  const{error}=await InventoryService.deleteInventoryItem(itemId);

  if(error){
    console.error(error);
    showMessage("Could not delete inventory item.");
    return;
  }

  showMessage("Inventory item deleted.");
  await loadInventory();

  if(typeof loadDashboardCounts==="function"){
    loadDashboardCounts();
  }
}

/* ==========================================================
   HELPERS
========================================================== */

function isLowStock(item){
  return Number(item.quantity_on_hand||0)<=Number(item.reorder_level||0);
}