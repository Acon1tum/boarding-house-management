import { supabase } from "../db/supabase.js";

const tenantsPerPage = 5; // Number of tenants per page
let currentPage = 1;
let totalPages = 1;
let sortBy = "first_name"; // Default sorting

// Fetch Tenants with Pagination & Sorting
async function fetchTenants(searchQuery = null) {
    let query = supabase.from("users").select("*", { count: "exact" }).eq("role", "tenant");

    // Apply search filter
    if (searchQuery && searchQuery.trim() !== "") {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    // Sorting
    query = query.order(sortBy, { ascending: true });

    // Pagination
    const from = (currentPage - 1) * tenantsPerPage;
    const to = from + tenantsPerPage - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
        console.error("Error fetching tenants:", error);
        return;
    }

    totalPages = Math.ceil(count / tenantsPerPage);
    updatePagination();

    const tenantList = document.getElementById("tenantList");
    tenantList.innerHTML = data
        .map((tenant) => `
            <tr class="border-b">
                <td class="p-2">${tenant.first_name} ${tenant.last_name}</td>
                <td class="p-2">${tenant.email}</td>
                <td class="p-2">
                    <button onclick="editTenant('${tenant.id}')" class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
                    <button onclick="deleteTenant('${tenant.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                </td>
            </tr>
        `)
        .join("");
}

// Update Pagination UI
function updatePagination() {
    document.getElementById("currentPage").textContent = currentPage;
    document.getElementById("totalPages").textContent = totalPages;

    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;
}

// Next Page
document.getElementById("nextPage").addEventListener("click", () => {
    if (currentPage < totalPages) {
        currentPage++;
        fetchTenants();
    }
});

// Previous Page
document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        fetchTenants();
    }
});

// Sorting
document.getElementById("sortBy").addEventListener("change", (event) => {
    sortBy = event.target.value;
    fetchTenants();
});

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

// Save Tenant (Add or Edit)
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

// Delete Tenant
window.deleteTenant = async function (id) {
    if (!confirm("Are you sure you want to delete this tenant?")) return;

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
        alert("Failed to delete tenant: " + error.message);
    } else {
        fetchTenants();
    }
};

// Search
document.getElementById("searchBtn").addEventListener("click", () => {
    const searchQuery = document.getElementById("searchInput").value.trim();
    fetchTenants(searchQuery);
});

// Reset Search Filters
document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    fetchTenants();
});

// Load Tenants on First Load
document.addEventListener("DOMContentLoaded", () => fetchTenants(null));
