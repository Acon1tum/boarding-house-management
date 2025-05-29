import { supabase } from "../db/supabase.js";

const tenantsPerPage = 5;
let currentPage = 1;
let totalPages = 1;
let sortBy = "first_name";

async function fetchTenants(searchQuery = null) {
    let query = supabase.from("users").select("*", { count: "exact" }).eq("role", "tenant");

    if (searchQuery && searchQuery.trim() !== "") {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    query = query.order(sortBy, { ascending: true });

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
    tenantList.innerHTML = data.map(tenant => `
        <tr class="border-b">
            <td class="p-2">${tenant.first_name} ${tenant.last_name}</td>
            <td class="p-2">${tenant.email}</td>
            <td class="p-2">
                <button onclick="editTenant('${tenant.id}')" class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
                <button onclick="deleteTenant('${tenant.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                <button onclick="viewBilling('${tenant.id}')" class="bg-green-500 text-white px-2 py-1 rounded">View</button>
            </td>
        </tr>
    `).join("");
}

function updatePagination() {
    document.getElementById("currentPage").textContent = currentPage;
    document.getElementById("totalPages").textContent = totalPages;

    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;
}

document.getElementById("nextPage").addEventListener("click", () => {
    if (currentPage < totalPages) {
        currentPage++;
        fetchTenants();
    }
});

document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        fetchTenants();
    }
});

document.getElementById("sortBy").addEventListener("change", (event) => {
    sortBy = event.target.value;
    fetchTenants();
});

document.getElementById("createTenantBtn").addEventListener("click", () => {
    document.getElementById("modalTitle").textContent = "Add Tenant";
    document.getElementById("tenantId").value = "";
    document.getElementById("tenantFirstName").value = "";
    document.getElementById("tenantLastName").value = "";
    document.getElementById("tenantEmail").value = "";
    document.getElementById("tenantPassword").value = "";
    document.getElementById("tenantModal").classList.remove("hidden");
});

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

document.getElementById("cancelModalBtn").addEventListener("click", () => {
    document.getElementById("tenantModal").classList.add("hidden");
});

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

window.deleteTenant = async function (id) {
    if (!confirm("Are you sure you want to delete this tenant?")) return;

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
        alert("Failed to delete tenant: " + error.message);
    } else {
        fetchTenants();
    }
};

// Fetch Billing Records for Selected Tenant
window.viewBilling = async function (tenantId) {
    try {
        // Fetch tenant details
        const { data: tenantData, error: tenantError } = await supabase
            .from("users")
            .select("first_name, last_name, email")
            .eq("id", tenantId)
            .single();

        if (tenantError) {
            console.error("Error fetching tenant details:", tenantError);
            alert("Failed to load tenant details");
            return;
        }

        // Fetch active bills
        const { data: activeBills, error: activeBillsError } = await supabase
            .from("bills")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("due_date", { ascending: true });

        if (activeBillsError) {
            console.error("Error fetching active bills:", activeBillsError);
        }

        // Fetch billing history
        const { data: billingHistory, error: billingHistoryError } = await supabase
            .from("billing_record")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("due_date", { ascending: false });

        if (billingHistoryError) {
            console.error("Error fetching billing history:", billingHistoryError);
        }

        // Update modal title with tenant name
        document.querySelector("#billingModalTitle").textContent = `Billing Record - ${tenantData.first_name} ${tenantData.last_name}`;

        // Display active bills
        const activeBillsTable = document.querySelector("#activeBillsTable");
        activeBillsTable.innerHTML = "";

        if (!activeBills || activeBills.length === 0) {
            activeBillsTable.innerHTML = `<tr><td colspan="3" class="text-center text-gray-500">No active bills found.</td></tr>`;
        } else {
            activeBills.forEach(bill => {
                let statusClass = bill.status === "pending" ? "text-yellow-500" : 
                                 bill.status === "paid" ? "text-green-500" : 
                                 bill.status === "overdue" ? "text-red-500" : "text-gray-500";
                
                activeBillsTable.innerHTML += `
                    <tr>
                        <td class="p-2">₱${Number(bill.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="p-2">${new Date(bill.due_date).toLocaleDateString()}</td>
                        <td class="p-2 ${statusClass}">${bill.status}</td>
                    </tr>
                `;
            });
        }

        // Display billing history
        const billingHistoryTable = document.querySelector("#billingHistoryTable");
        billingHistoryTable.innerHTML = "";

        if (!billingHistory || billingHistory.length === 0) {
            billingHistoryTable.innerHTML = `<tr><td colspan="3" class="text-center text-gray-500">No billing history found.</td></tr>`;
        } else {
            billingHistory.forEach(record => {
                let statusClass = record.status === "paid" ? "text-green-500" : 
                                 record.status === "overdue" ? "text-red-500" : "text-gray-500";
                
                billingHistoryTable.innerHTML += `
                    <tr>
                        <td class="p-2">₱${Number(record.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="p-2">${new Date(record.due_date).toLocaleDateString()}</td>
                        <td class="p-2 ${statusClass}">${record.status}</td>
                    </tr>
                `;
            });
        }

        // Show the modal
        document.querySelector("#billingModal").classList.remove("hidden");
    } catch (error) {
        console.error("Unexpected error in viewBilling:", error);
        alert("An unexpected error occurred while loading billing records");
    }
};

document.querySelector("#closeBillingModal").addEventListener("click", () => {
    document.querySelector("#billingModal").classList.add("hidden");
});

// Search
document.getElementById("searchBtn").addEventListener("click", () => {
    const searchQuery = document.getElementById("searchInput").value.trim();
    fetchTenants(searchQuery);
});

document.getElementById("resetBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    fetchTenants();
});

document.addEventListener("DOMContentLoaded", () => fetchTenants(null));
