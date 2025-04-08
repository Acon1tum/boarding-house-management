// js/billingManagement.js
import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

// Fetch All Bills
async function fetchAllBills() {
    const user = getUserDetails();
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
            <td class="p-3">₱${bill.amount}</td>
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
    try {
        const user = getUserDetails();
        if (!user || user.role !== "landlord") {
            alert("Only landlords can generate bills.");
            return;
        }

        // Since there's no direct link between rooms and landlords,
        // we'll fetch all active tenancies and filter them later
        const { data: tenancies, error: tenancyError } = await supabase
            .from("room_tenants")
            .select(`
                *,
                rooms (
                    id,
                    price
                )
            `)
            .is("end_date", null); // Active tenancies have no end date

        if (tenancyError) {
            console.error("Error fetching tenancies:", tenancyError);
            alert("Failed to fetch tenant information. Please try again.");
            return;
        }

        if (!tenancies || tenancies.length === 0) {
            alert("No active tenancies found.");
            return;
        }

        // Get current date and next month's date
        const currentDate = new Date();
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(currentDate.getMonth() + 1);

        // Fetch existing bills for this month
        const { data: existingBills, error: billsError } = await supabase
            .from("bills")
            .select("tenant_id")
            .gte("due_date", currentDate.toISOString())
            .lte("due_date", nextMonth.toISOString());

        if (billsError) {
            console.error("Error checking existing bills:", billsError);
            alert("Failed to check existing bills. Please try again.");
            return;
        }

        // Create a set of tenant IDs that already have bills
        const tenantsWithBills = new Set(existingBills?.map(bill => bill.tenant_id) || []);

        // Prepare bills to insert
        const billsToInsert = tenancies
            .filter(tenancy => !tenantsWithBills.has(tenancy.tenant_id))
            .map(tenancy => ({
                tenant_id: tenancy.tenant_id,
                amount: tenancy.rooms.price, // Use the room price as the bill amount
                due_date: nextMonth.toISOString(),
                status: "pending"
            }));

        if (billsToInsert.length === 0) {
            alert("No new bills to generate. All tenants already have bills for this month.");
            return;
        }

        // Insert new bills
        const { error: insertError } = await supabase
            .from("bills")
            .insert(billsToInsert);

        if (insertError) {
            console.error("Error generating bills:", insertError);
            alert("Failed to generate bills. Please try again.");
            return;
        }

        alert(`Successfully generated ${billsToInsert.length} new bills!`);
        fetchAllBills(); // Refresh the bills list
    } catch (error) {
        console.error("Unexpected error in generateBills:", error);
        alert("An unexpected error occurred. Please try again.");
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
    document.getElementById("confirmationMessage").innerHTML = `Are you sure you want to mark this bill of <strong>₱${amount}</strong> as paid?`;
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
    try {
        // Fetch bill details before updating
        const { data: bill, error: fetchError } = await supabase
            .from("bills")
            .select("id, tenant_id, amount, due_date, status, users(first_name, last_name)")
            .eq("id", id)
            .single();

        if (fetchError || !bill) {
            throw new Error("Error fetching bill details");
        }

        // Check if bill is already paid
        if (bill.status === "paid") {
            alert("This bill is already marked as paid.");
            return;
        }

        // Start a transaction by using a single update operation
        const { error: updateError } = await supabase
            .from("bills")
            .update({ status: "paid" })
            .eq("id", id);
        
        if (updateError) {
            throw new Error("Error updating bill status");
        }

        // Add to billing_record with better error handling
        const { data: recordData, error: recordError } = await supabase
            .from("billing_record")
            .insert([{
                tenant_id: bill.tenant_id,
                amount: bill.amount,
                due_date: bill.due_date,
                status: "paid",
                payment_date: new Date().toISOString()
            }])
            .select();

        if (recordError) {
            console.error("Error adding to billing record:", recordError);
            // Try to rollback the bill status update
            await supabase
                .from("bills")
                .update({ status: "pending" })
                .eq("id", id);
            
            throw new Error("Failed to record payment in billing history. Bill status has been reverted.");
        } else {
            console.log("Successfully added to billing record:", recordData);
        }

        // Print the receipt with tenant name
        printReceipt(bill);
        
        // Refresh the list
        fetchAllBills();
        
        // Show success message
        alert("Bill marked as paid successfully!");
    } catch (error) {
        console.error("Error marking bill as paid:", error);
        alert("Failed to update bill: " + error.message);
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
                <div class="receipt-header">BOARDING HOUSE MANAGEMENT</div>
                <div class="separator"></div>
                <div class="receipt-details">
                    <p><strong>Receipt No:</strong> ${bill.id}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Tenant:</strong> ${bill.users.first_name} ${bill.users.last_name}</p>
                    <p><strong>Amount:</strong> ₱${bill.amount}</p>
                    <p><strong>Due Date:</strong> ${new Date(bill.due_date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> PAID</p>
                </div>
                <div class="separator"></div>
                <div class="footer">
                    <p>Thank you for your payment!</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

async function deleteBill(id) {
    if (!confirm("Are you sure you want to delete this bill?")) {
        return;
    }

    try {
        const { error } = await supabase
            .from("bills")
            .delete()
            .eq("id", id);

        if (error) {
            throw new Error("Error deleting bill");
        }

        alert("Bill deleted successfully!");
        fetchAllBills();
    } catch (error) {
        console.error("Error deleting bill:", error);
        alert("Failed to delete bill: " + error.message);
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    fetchAllBills();
    
    // Attach event listener to the existing generate bills button
    const generateBillsBtn = document.getElementById("generateBillsBtn");
    if (generateBillsBtn) {
        generateBillsBtn.addEventListener("click", generateBills);
    }
});