// js/billingManagement.js
import { supabase } from "../db/supabase.js";

// Fetch All Bills
async function fetchAllBills() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "landlord") return;

    const { data, error } = await supabase
        .from("bills")
        .select("id, tenant_id, amount, due_date, status, users(first_name, last_name, email)")
        .order("due_date", { ascending: true });

    if (error) {
        console.error("Error fetching bills:", error);
        return;
    }

    const billListTable = document.getElementById("billListTable");
    billListTable.innerHTML = "";

    if (!data || data.length === 0) {
        billListTable.innerHTML = `
            <tr>
                <td class="p-3 text-gray-500 text-center" colspan="5">No bills available.</td>
            </tr>`;
        return;
    }

    billListTable.innerHTML = data.map(bill => `
        <tr class="border-b">
            <td class="p-3">${bill.users.first_name} ${bill.users.last_name} (${bill.users.email})</td>
            <td class="p-3">$${bill.amount}</td>
            <td class="p-3">${new Date(bill.due_date).toDateString()}</td>
            <td class="p-3 font-semibold ${bill.status === "pending" ? "text-red-500" : "text-green-500"}">
                ${bill.status}
            </td>
            <td class="p-3 flex gap-2">
                <button class="bg-green-500 text-white px-2 py-1 rounded mark-paid-btn" data-id="${bill.id}" data-amount="${bill.amount}">
                    Mark Paid
                </button>
                <button class="bg-red-500 text-white px-2 py-1 rounded delete-bill-btn" data-id="${bill.id}">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");

    attachEventListeners();
}

// Attach event listeners dynamically
function attachEventListeners() {
    document.querySelectorAll(".mark-paid-btn").forEach(button => {
        button.addEventListener("click", () => {
            const billId = button.getAttribute("data-id");
            const amount = button.getAttribute("data-amount");
            openConfirmationModal(billId, amount);
        });
    });

    document.querySelectorAll(".delete-bill-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const billId = button.getAttribute("data-id");
            await deleteBill(billId);
        });
    });
}

// Open Confirmation Modal for Mark as Paid
function openConfirmationModal(billId, amount) {
    document.getElementById("confirmationMessage").innerHTML = `Are you sure you want to mark this bill of <strong>$${amount}</strong> as paid?`;
    document.getElementById("confirmMarkPaidBtn").setAttribute("data-id", billId);
    document.getElementById("confirmationModal").classList.remove("hidden");
}

// Confirm Mark as Paid
document.getElementById("confirmMarkPaidBtn").addEventListener("click", async function () {
    const billId = this.getAttribute("data-id");
    await markAsPaid(billId);
    document.getElementById("confirmationModal").classList.add("hidden");
});

// Close Confirmation Modal
document.getElementById("closeConfirmationBtn").addEventListener("click", () => {
    document.getElementById("confirmationModal").classList.add("hidden");
});

// Mark a Bill as Paid
async function markAsPaid(id) {
    const { error } = await supabase.from("bills").update({ status: "paid" }).eq("id", id);
    if (error) {
        alert("Failed to update bill: " + error.message);
    } else {
        fetchAllBills();
    }
}

// Delete a Bill
async function deleteBill(id) {
    if (!confirm("Are you sure you want to delete this bill?")) return;

    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) {
        alert("Failed to delete bill: " + error.message);
    } else {
        fetchAllBills();
    }
}

// Open Modal to Add New Bill
document.getElementById("createBillBtn")?.addEventListener("click", () => {
    document.getElementById("billModal").classList.remove("hidden");
});

// Close Modal
document.getElementById("cancelModalBtn")?.addEventListener("click", () => {
    document.getElementById("billModal").classList.add("hidden");
});

// Save Bill from Modal
document.getElementById("saveBillBtn")?.addEventListener("click", async () => {
    const tenantEmail = document.getElementById("billTenantEmail").value.trim();
    const amount = document.getElementById("billAmount").value.trim();
    const dueDate = document.getElementById("billDueDate").value;

    if (!tenantEmail || !amount || !dueDate) {
        alert("All fields are required!");
        return;
    }

    // Fetch Tenant ID
    const { data: tenant, error: tenantError } = await supabase
        .from("users")
        .select("id")
        .eq("email", tenantEmail)
        .maybeSingle();

    if (tenantError || !tenant) {
        alert("Tenant not found. Make sure the email is correct.");
        return;
    }

    // Insert Bill
    const { error } = await supabase.from("bills").insert([
        { tenant_id: tenant.id, amount, due_date: dueDate, status: "pending" }
    ]);

    if (error) {
        alert("Failed to create bill: " + error.message);
    } else {
        alert("Bill added successfully!");
        document.getElementById("billModal").classList.add("hidden");
        fetchAllBills();
    }
});

// Initialize
document.addEventListener("DOMContentLoaded", fetchAllBills);
