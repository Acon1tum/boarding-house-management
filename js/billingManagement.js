import { supabase } from "../db/supabase.js";

// Fetch and Display Bills
async function fetchBills(searchQuery = "") {
    let query = supabase.from("bills").select("*, users(first_name, last_name)");

    if (searchQuery) {
        query = query.or(`users.first_name.ilike.%${searchQuery}%,users.last_name.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching bills:", error);
        return;
    }

    const billList = document.getElementById("billList");
    billList.innerHTML = data.map(bill => `
        <tr class="border-b">
            <td class="p-2">${bill.users.first_name} ${bill.users.last_name}</td>
            <td class="p-2">$${bill.amount}</td>
            <td class="p-2">${new Date(bill.due_date).toLocaleDateString()}</td>
            <td class="p-2">${bill.status}</td>
            <td class="p-2">
                <button onclick="editBill('${bill.id}')" class="bg-blue-500 text-white px-2 py-1 rounded">Edit</button>
                <button onclick="deleteBill('${bill.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
            </td>
        </tr>
    `).join("");
}

// Open Add Bill Modal
document.getElementById("addBillBtn").addEventListener("click", async () => {
    document.getElementById("modalTitle").textContent = "Add Bill";
    document.getElementById("billId").value = "";
    document.getElementById("billAmount").value = "";
    document.getElementById("billDueDate").value = "";
    document.getElementById("billStatus").value = "pending";

    // Fetch tenants
    const { data: tenants, error } = await supabase.from("users").select("id, first_name, last_name").eq("role", "tenant");
    if (error) console.error("Error fetching tenants:", error);
    
    const tenantSelect = document.getElementById("tenantSelect");
    tenantSelect.innerHTML = tenants.map(tenant => `
        <option value="${tenant.id}">${tenant.first_name} ${tenant.last_name}</option>
    `).join("");

    document.getElementById("billModal").classList.remove("hidden");
});

// Close Modal
document.getElementById("cancelModalBtn").addEventListener("click", () => {
    document.getElementById("billModal").classList.add("hidden");
});

// Save Bill
document.getElementById("saveBillBtn").addEventListener("click", async () => {
    const id = document.getElementById("billId").value;
    const tenantId = document.getElementById("tenantSelect").value;
    const amount = document.getElementById("billAmount").value;
    const dueDate = document.getElementById("billDueDate").value;
    const status = document.getElementById("billStatus").value;

    if (!tenantId || !amount || !dueDate) {
        alert("All fields are required!");
        return;
    }

    let query = id ? supabase.from("bills").update({ tenant_id: tenantId, amount, due_date: dueDate, status }).eq("id", id)
                   : supabase.from("bills").insert([{ tenant_id: tenantId, amount, due_date: dueDate, status }]);

    const { error } = await query;
    if (error) {
        alert("Failed to save bill: " + error.message);
    } else {
        alert("Bill saved successfully!");
        document.getElementById("billModal").classList.add("hidden");
        fetchBills();
    }
});

// Initialize
document.addEventListener("DOMContentLoaded", fetchBills);
