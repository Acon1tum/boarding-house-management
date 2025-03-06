import { supabase } from "../db/supabase.js";

// Fetch Tenants (without search applied on first load)
async function fetchTenants(searchQuery = null) {
    let query = supabase.from("users").select("*").eq("role", "tenant");

    // Apply search only if a query is provided (not on first load)
    if (searchQuery && searchQuery.trim() !== "") {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching tenants:", error);
        return;
    }

    const tenantList = document.getElementById("tenantList");
    tenantList.innerHTML = data.map(tenant => `
        <tr class="border-b">
            <td class="p-2">${tenant.first_name} ${tenant.last_name}</td>
            <td class="p-2">${tenant.email}</td>
            <td class="p-2">
                <button onclick="editTenant('${tenant.id}')" class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
                <button onclick="deleteTenant('${tenant.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
            </td>
        </tr>
    `).join("");
}

// Open Create Tenant Modal
document.getElementById("createTenantBtn").addEventListener("click", () => {
    document.getElementById("modalTitle").textContent = "Add Tenant";
    document.getElementById("tenantId").value = "";
    document.getElementById("tenantFirstName").value = "";
    document.getElementById("tenantLastName").value = "";
    document.getElementById("tenantEmail").value = "";
    document.getElementById("tenantPassword").value = "";
    document.getElementById("tenantModal").classList.remove("hidden");
});

// Open Edit Tenant Modal
window.editTenant = async function (id) {
    const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
    if (error || !data) {
        alert("Failed to load tenant details!");
        return;
    }

    document.getElementById("modalTitle").textContent = "Edit Tenant";
    document.getElementById("tenantId").value = data.id;
    document.getElementById("tenantFirstName").value = data.first_name;
    document.getElementById("tenantLastName").value = data.last_name;
    document.getElementById("tenantEmail").value = data.email;
    document.getElementById("tenantPassword").value = "";
    document.getElementById("tenantModal").classList.remove("hidden");
};

// Close Modal
document.getElementById("cancelModalBtn").addEventListener("click", () => {
    document.getElementById("tenantModal").classList.add("hidden");
});

// Save Tenant (Add or Edit) with Confirmation
document.getElementById("saveTenantBtn").addEventListener("click", async () => {
    const id = document.getElementById("tenantId").value;
    const firstName = document.getElementById("tenantFirstName").value.trim();
    const lastName = document.getElementById("tenantLastName").value.trim();
    const email = document.getElementById("tenantEmail").value.trim();
    const password = document.getElementById("tenantPassword").value.trim();

    if (!firstName || !lastName || !email) {
        alert("First name, last name, and email are required!");
        return;
    }

    const confirmation = confirm(id ? "Are you sure you want to update this tenant?" : "Are you sure you want to add this tenant?");
    if (!confirmation) return;

    let query;
    if (id) {
        const updateData = { first_name: firstName, last_name: lastName, email };
        if (password) updateData.password = password;

        query = supabase.from("users").update(updateData).eq("id", id);
    } else {
        query = supabase.from("users").insert([{ first_name: firstName, last_name: lastName, email, password, role: "tenant" }]);
    }

    const { error } = await query;
    if (error) {
        alert("Failed to save tenant: " + error.message);
    } else {
        alert("Tenant saved successfully!");
        document.getElementById("tenantModal").classList.add("hidden");
        fetchTenants();
    }
});

// Delete Tenant with Confirmation
window.deleteTenant = async function (id) {
    if (!confirm("Are you sure you want to delete this tenant?")) return;

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
        alert("Failed to delete tenant: " + error.message);
    } else {
        fetchTenants();
    }
};

// Apply Search Only When User Clicks Search Button
document.getElementById("searchBtn").addEventListener("click", () => {
    const searchQuery = document.getElementById("searchInput").value.trim();
    fetchTenants(searchQuery);
});

// Reset Search Filters
document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    fetchTenants();
});

// Load All Tenants on First Load (Without Search)
document.addEventListener("DOMContentLoaded", () => fetchTenants(null));
