// js/billingManagement.js
import { supabase } from "../db/supabase.js";
import { getUserDetails } from "./auth.js";

// Store all bills globally
let allBills = [];
let filteredBills = [];
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// Default placeholder avatar (a simple gray circle with user icon)
const DEFAULT_AVATAR = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" fill="#e5e7eb"/>
    <path d="M12 8v4M8 12h8" stroke="#6b7280"/>
    <circle cx="12" cy="12" r="3" fill="#6b7280"/>
</svg>
`)}`;

// Fetch All Bills
async function fetchAllBills() {
    const user = getUserDetails();
    if (!user || user.role !== "landlord") return;

    const { data, error } = await supabase
        .from("bills")
        .select("id, tenant_id, amount, due_date, status, users(first_name, last_name, email, profile_picture)")
        .order("due_date", { ascending: false });

    if (error) {
        console.error("Error fetching bills:", error);
        return;
    }

    // Store all bills globally
    allBills = data || [];
    filteredBills = [...allBills];
    
    // Reset to first page when fetching new data
    currentPage = 1;
    
    // Apply filters
    applyFilters();
}

// Get month name from date
function getMonthName(date) {
    return new Date(date).toLocaleString('default', { month: 'long' });
}

// Check if tenant has paid for a specific month
function hasPaidForMonth(bills, tenantId, month) {
    return bills.some(bill => 
        bill.tenant_id === tenantId && 
        new Date(bill.due_date).getMonth() + 1 === month && 
        bill.status === "paid"
    );
}

// Apply filters to bills
function applyFilters() {
    const monthFilter = document.getElementById("monthFilter").value;
    const statusFilter = document.getElementById("statusFilter").value;

    // Start with all bills
    filteredBills = [...allBills];

    // Apply month filter
    if (monthFilter) {
        filteredBills = filteredBills.filter(bill => {
            const billDate = new Date(bill.due_date);
            return billDate.getMonth() + 1 === parseInt(monthFilter);
        });
    }

    // Apply status filter
    if (statusFilter) {
        filteredBills = filteredBills.filter(bill => bill.status === statusFilter);
    }

    // Reset to first page when applying new filters
    currentPage = 1;
    
    displayBills();
}

// Function to show enlarged profile picture
function showEnlargedProfilePicture(imageUrl) {
    const modal = document.getElementById('profileModal');
    const img = document.getElementById('profileImage');
    img.src = imageUrl;
    modal.classList.remove('hidden');
}

// Display bills in the table
function displayBills() {
    const billListTable = document.getElementById("billListTable");
    billListTable.innerHTML = "";

    if (!filteredBills || filteredBills.length === 0) {
        billListTable.innerHTML = `
            <tr>
                <td class="p-3 text-gray-500 text-center" colspan="6">No bills available.</td>
            </tr>`;
        updatePaginationControls(0);
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredBills.length);
    const currentPageBills = filteredBills.slice(startIndex, endIndex);

    // Update pagination info
    document.getElementById("currentPageStart").textContent = filteredBills.length === 0 ? 0 : startIndex + 1;
    document.getElementById("currentPageEnd").textContent = endIndex;
    document.getElementById("totalBills").textContent = filteredBills.length;
    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;

    // Update pagination buttons
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;

    billListTable.innerHTML = currentPageBills.map(bill => {
        const billMonth = new Date(bill.due_date).getMonth() + 1;
        const monthName = getMonthName(bill.due_date);
        const isPaid = hasPaidForMonth(allBills, bill.tenant_id, billMonth);
        const profilePicture = bill.users.profile_picture || DEFAULT_AVATAR;
        
        return `
        <tr class="border-b">
            <td class="p-3">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <img src="${profilePicture}" 
                            alt="Profile" 
                            class="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onerror="this.src='${DEFAULT_AVATAR}'"
                            onclick="showEnlargedProfilePicture('${profilePicture}')">
                        <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${bill.status === 'paid' ? 'bg-green-500' : bill.status === 'verifying_payment' ? 'bg-blue-500' : 'bg-gray-400'}"></div>
                    </div>
                    <div>
                        ${bill.users.first_name} ${bill.users.last_name} (${bill.users.email})
                        ${isPaid ? `<span class="ml-2 text-sm text-green-500">(Paid for ${monthName})</span>` : ''}
                    </div>
                </div>
            </td>
            <td class="p-3">₱${Number(bill.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="p-3">${new Date(bill.due_date).toDateString()}</td>
            <td class="p-3 font-semibold ${bill.status === "pending" ? "text-red-500" : bill.status === "paid" ? "text-green-500" : bill.status === "verifying_payment" ? "text-blue-500" : "text-gray-500"}">
                ${bill.status === "pending" ? "pending" : bill.status === "paid" ? "paid" : bill.status === "verifying_payment" ? "verifying payment" : bill.status}
            </td>
            <td class="p-3 flex gap-2">
                ${bill.status === "pending" ? `
                    <button class="bg-green-500 text-white px-2 py-1 rounded mark-paid-btn" data-id="${bill.id}" data-amount="${bill.amount}">
                        Mark Paid
                    </button>
                ` : bill.status === "verifying_payment" ? `
                    <button class="bg-blue-500 text-white px-2 py-1 rounded view-proof-btn" data-id="${bill.id}">View Proof</button>
                    <button class="bg-green-500 text-white px-2 py-1 rounded accept-payment-btn" data-id="${bill.id}">Accept</button>
                    <button class="bg-red-500 text-white px-2 py-1 rounded reject-payment-btn" data-id="${bill.id}">Reject</button>
                ` : `
                    <button class="bg-green-500 text-white px-2 py-1 rounded opacity-50 cursor-not-allowed" disabled>
                        Mark Paid
                    </button>
                `}
                ${bill.status === "paid" ? `
                    <button class="bg-blue-500 text-white px-2 py-1 rounded print-receipt-btn" data-id="${bill.id}">
                        Print Receipt
                    </button>
                ` : ''}
                <button class="bg-red-500 text-white px-2 py-1 rounded delete-bill-btn" data-id="${bill.id}">
                    Delete
                </button>
            </td>
        </tr>
    `}).join("");

    attachEventListeners();
}

// Update pagination controls
function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages || totalPages === 0;
    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages || 1}`;
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

        // Fetch all existing bills for all tenants for the next bill period (by exact date)
        const nextBillDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), currentDate.getDate());
        const { data: existingBills, error: billsError } = await supabase
            .from("bills")
            .select("tenant_id, due_date")
            .eq("due_date", nextBillDate.toISOString().split('T')[0]);

        if (billsError) {
            console.error("Error checking existing bills:", billsError);
            alert("Failed to check existing bills. Please try again.");
            return;
        }

        // Create a set of tenant_id for which a bill already exists for the next bill date
        const tenantsWithBills = new Set(existingBills?.map(bill => bill.tenant_id) || []);

        // Prepare bills to insert (only for tenants who do not have a bill for the next bill date)
        const billsToInsert = tenancies
            .filter(tenancy => !tenantsWithBills.has(tenancy.tenant_id))
            .map(tenancy => ({
                tenant_id: tenancy.tenant_id,
                amount: tenancy.rooms.price, // Use the room price as the bill amount
                due_date: nextBillDate.toISOString().split('T')[0],
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

    document.querySelectorAll(".print-receipt-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const billId = button.getAttribute("data-id");
            await printReceiptForPaidBill(billId);
        });
    });

    document.querySelectorAll(".view-proof-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const billId = button.getAttribute("data-id");
            // Fetch payment proof and show in modal
            const { data, error } = await supabase.from("payment_proofs").select("image_url").eq("bill_id", billId).eq("status", "pending").single();
            if (data && data.image_url) {
                // Show modal with image (implement modal if not present)
                showProofModal(data.image_url);
            } else {
                alert("No payment proof found.");
            }
        });
    });

    document.querySelectorAll(".accept-payment-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const billId = button.getAttribute("data-id");
            // Update bill to paid, payment_proofs to approved
            await supabase.from("bills").update({ status: "paid" }).eq("id", billId);
            await supabase.from("payment_proofs").update({ status: "approved" }).eq("bill_id", billId).eq("status", "pending");
            fetchAllBills();
        });
    });

    document.querySelectorAll(".reject-payment-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const billId = button.getAttribute("data-id");
            // Update bill to pending, payment_proofs to rejected
            await supabase.from("bills").update({ status: "pending" }).eq("id", billId);
            await supabase.from("payment_proofs").update({ status: "rejected" }).eq("bill_id", billId).eq("status", "pending");
            fetchAllBills();
        });
    });
}

// Open Confirmation Modal for Mark as Paid
function openConfirmationModal(billId, amount) {
    // Convert amount to a number before using toLocaleString()
    const numericAmount = parseFloat(amount);
    document.getElementById("confirmationMessage").innerHTML = `Are you sure you want to mark this bill of <strong>₱${numericAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong> as paid?`;
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
                    }
                }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    padding: 20px;
                    color: #333;
                }
                .receipt {
                    border: 1px solid #000;
                    padding: 30px;
                    max-width: 600px;
                    margin: 0 auto;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 15px;
                }
                .header h1 {
                    font-size: 24px;
                    margin: 0 0 5px 0;
                    text-transform: uppercase;
                }
                .header h2 {
                    font-size: 18px;
                    margin: 0;
                    font-weight: normal;
                }
                .details {
                    margin-bottom: 30px;
                }
                .details p {
                    margin: 10px 0;
                    font-size: 14px;
                }
                .details strong {
                    display: inline-block;
                    width: 120px;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    font-size: 12px;
                    border-top: 1px solid #ccc;
                    padding-top: 15px;
                }
                .amount {
                    font-size: 18px;
                    font-weight: bold;
                    margin: 15px 0;
                }
                .status {
                    font-weight: bold;
                    color: #000;
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h1>BOARDING HOUSE MANAGEMENT</h1>
                    <h2>Payment Receipt</h2>
                </div>
                <div class="details">
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Tenant:</strong> ${bill.users.first_name} ${bill.users.last_name}</p>
                    <p class="amount"><strong>Amount:</strong> ₱${Number(bill.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p><strong>Due Date:</strong> ${new Date(bill.due_date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span class="status">PAID</span></p>
                </div>
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

async function printReceiptForPaidBill(id) {
    try {
        // Fetch bill details
        const { data: bill, error: fetchError } = await supabase
            .from("bills")
            .select("id, tenant_id, amount, due_date, status, users(first_name, last_name)")
            .eq("id", id)
            .single();

        if (fetchError || !bill) {
            throw new Error("Error fetching bill details");
        }

        // Check if bill is paid
        if (bill.status !== "paid") {
            alert("This bill is not marked as paid yet.");
            return;
        }

        // Print the receipt with tenant name
        printReceipt(bill);
    } catch (error) {
        console.error("Error printing receipt:", error);
        alert("Failed to print receipt: " + error.message);
    }
}

// Fetch and display payment proofs
async function fetchAllProofs() {
    const { data: proofs, error } = await supabase
        .from("payment_proofs")
        .select("id, bill_id, tenant_id, image_url, status, submitted_at, users:tenant_id(first_name, last_name, email)")
        .order("submitted_at", { ascending: false });

    const proofListTable = document.getElementById("proofListTable");
    proofListTable.innerHTML = "";

    if (error || !proofs || proofs.length === 0) {
        proofListTable.innerHTML = `<tr><td colspan='5' class='p-3 text-center text-gray-500'>No payment proofs found.</td></tr>`;
        return;
    }

    proofs.forEach(proof => {
        const tenant = proof.users ? `${proof.users.first_name} ${proof.users.last_name} (${proof.users.email})` : proof.tenant_id;
        const statusClass = proof.status === 'approved' ? 'text-green-500' : proof.status === 'rejected' ? 'text-red-500' : 'text-yellow-500';
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class='p-3'>${proof.bill_id}</td>
            <td class='p-3'>${tenant}</td>
            <td class='p-3'>${new Date(proof.submitted_at).toLocaleString()}</td>
            <td class='p-3 font-semibold ${statusClass}'>${proof.status}</td>
            <td class='p-3'>
                <button class='bg-blue-500 text-white px-2 py-1 rounded view-proof-btn' data-img='${proof.image_url}'>View Proof</button>
            </td>
        `;
        proofListTable.appendChild(row);
    });

    // Attach event listeners for view buttons
    document.querySelectorAll(".view-proof-btn").forEach(button => {
        button.addEventListener("click", () => {
            showProofModal(button.getAttribute("data-img"));
        });
    });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    fetchAllBills();
    fetchAllProofs();
    
    // Attach event listener to the existing generate bills button
    const generateBillsBtn = document.getElementById("generateBillsBtn");
    if (generateBillsBtn) {
        generateBillsBtn.addEventListener("click", generateBills);
    }

    // Add event listeners for filters
    document.getElementById("monthFilter").addEventListener("change", applyFilters);
    document.getElementById("statusFilter").addEventListener("change", applyFilters);
    document.getElementById("resetFilters").addEventListener("click", () => {
        document.getElementById("monthFilter").value = "";
        document.getElementById("statusFilter").value = "";
        currentPage = 1;
        applyFilters();
    });

    // Add event listeners for pagination
    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            displayBills();
        }
    });

    document.getElementById("nextPage").addEventListener("click", () => {
        const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            displayBills();
        }
    });
});

// Make showEnlargedProfilePicture available globally
window.showEnlargedProfilePicture = showEnlargedProfilePicture;