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
            <td class="p-3">${bill.amount}</td>
            <td class="p-3">${new Date(bill.due_date).toDateString()}</td>
            <td class="p-3 font-semibold ${bill.status === "pending" ? "text-red-500" : "text-green-500"}">
                ${bill.status}
            </td>
            <td class="p-3 flex gap-2">
                ${bill.status === "pending" ? `
                    <button class="bg-green-500 text-white px-2 py-1 rounded mark-paid-btn" data-id="${bill.id}" data-amount="${bill.amount}">
                        Mark Paid
                    </button>
                ` : `
                    <button class="bg-green-500 text-white px-2 py-1 rounded opacity-50 cursor-not-allowed" disabled>
                        Mark Paid
                    </button>
                `}
                <button class="bg-red-500 text-white px-2 py-1 rounded delete-bill-btn" data-id="${bill.id}">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");

    attachEventListeners();
}

// Generate Bills for Tenants with Approved Bookings
async function generateBills() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "landlord") return;

    // Fetch all tenants with approved bookings
    const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("tenant_id, rooms(price)")
        .eq("status", "approved");

    if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        return;
    }

    if (!bookings || bookings.length === 0) {
        alert("No tenants with approved bookings found.");
        return;
    }

    // Fetch existing bills to avoid duplicates
    const { data: existingBills, error: billsError } = await supabase
        .from("bills")
        .select("tenant_id");

    if (billsError) {
        console.error("Error fetching existing bills:", billsError);
        return;
    }

    const tenantsWithBills = new Set(existingBills.map(bill => bill.tenant_id));

    // Generate bills for tenants without existing bills
    const billsToInsert = bookings
        .filter(booking => !tenantsWithBills.has(booking.tenant_id))
        .map(booking => ({
            tenant_id: booking.tenant_id,
            amount: booking.rooms.price,
            due_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(), // Due next month
            status: "pending"
        }));

    if (billsToInsert.length === 0) {
        alert("No new bills to generate.");
        return;
    }

    const { error: insertError } = await supabase
        .from("bills")
        .insert(billsToInsert);

    if (insertError) {
        console.error("Error generating bills:", insertError);
        alert("Failed to generate bills.");
    } else {
        alert("Bills generated successfully!");
        fetchAllBills();
    }
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
    document.getElementById("confirmationMessage").innerHTML = `Are you sure you want to mark this bill of <strong>${amount}</strong> as paid?`;
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

async function markAsPaid(id) {
    const { data, error } = await supabase
        .from("bills")
        .update({ status: "paid" })
        .eq("id", id);
    
    if (error) {
        alert("Failed to update bill: " + error.message);
    } else {
        // Fetch bill details along with tenant info
        const { data: bill, error: fetchError } = await supabase
            .from("bills")
            .select("id, tenant_id, amount, due_date, status, users(first_name, last_name)")
            .eq("id", id)
            .single();

        if (fetchError || !bill) {
            alert("Error fetching bill details.");
            return;
        }

        // Print the receipt with tenant name
        printReceipt(bill);
        fetchAllBills();  // Refresh the list
    }
}

function printReceipt(bill) {
    const receiptContent = `
        <html>
        <head>
            <title>Payment Receipt</title>
            <style>
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    .receipt-container {
                        box-shadow: none;
                        border: none;
                    }
                }

                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    font-family: 'Courier New', monospace;
                    background-color: #f8f8f8;
                }

                .receipt-container {
                    width: 320px;
                    padding: 20px;
                    background: white;
                    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    border-radius: 5px;
                    border: 1px solid #ccc;
                }

                .receipt-header {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }

                .receipt-details {
                    text-align: left;
                    font-size: 14px;
                }

                .separator {
                    border-top: 1px dashed #000;
                    margin: 10px 0;
                }

                .footer {
                    margin-top: 10px;
                    font-size: 12px;
                    font-weight: bold;
                    text-align: center;
                }

                .company-logo {
                    max-width: 80px;
                    display: block;
                    margin: 0 auto 10px;
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <img src="https://via.placeholder.com/80" alt="Company Logo" class="company-logo"> 
                <div class="receipt-header">BOARDING HOUSE RECEIPT</div>
                <p>Date: ${new Date().toLocaleDateString()}</p>

                <div class="separator"></div>

                <div class="receipt-details">
                    <p><strong>Receipt No:</strong> ${bill.id}</p>
                    <p><strong>Tenant Name:</strong> ${bill.users.first_name} ${bill.users.last_name}</p>
                    <p><strong>Amount Paid:</strong> ₱${bill.amount.toFixed(2)}</p>
                    <p><strong>Due Date:</strong> ${new Date(bill.due_date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> ${bill.status.toUpperCase()}</p>
                </div>

                <div class="separator"></div>

                <p class="footer">Thank you for your payment!</p>
                <p class="footer">Need help? Call: (123) 456-7890</p>
            </div>
        </body>
        </html>
    `;

    const newWindow = window.open("", "_blank");
    newWindow.document.write(receiptContent);
    newWindow.document.close();
    newWindow.print();
}


async function deleteBill(id) {
    if (!confirm("Are you sure you want to delete this bill?")) return;

    // Fetch the bill before deletion
    const { data: bill, error: fetchError } = await supabase
        .from("bills")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !bill) {
        alert("Error fetching bill details.");
        return;
    }

    // Insert the bill into `billing_record` before deleting
    const { error: insertError } = await supabase
        .from("billing_record")
        .insert([{ 
            tenant_id: bill.tenant_id,
            amount: bill.amount,
            due_date: bill.due_date,
            status: bill.status,
            payment_date: bill.payment_date
        }]);

    if (insertError) {
        alert("Failed to archive bill: " + insertError.message);
        return;
    }

    // Delete the bill from `bills`
    const { error: deleteError } = await supabase.from("bills").delete().eq("id", id);

    if (deleteError) {
        alert("Failed to delete bill: " + deleteError.message);
    } else {
        fetchAllBills();
    }
}


// Initialize
document.addEventListener("DOMContentLoaded", fetchAllBills);

// Add Generate Bills Button
document.addEventListener("DOMContentLoaded", () => {
    const generateBillsBtn = document.createElement("button");
    generateBillsBtn.textContent = "Generate Bills";
    generateBillsBtn.className = "bg-blue-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600 transition";
    generateBillsBtn.addEventListener("click", generateBills);

    const header = document.querySelector("main .flex.justify-between.items-center.mb-6");
    if (header) {
        header.appendChild(generateBillsBtn);
    }
});